"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Clock, Printer, Receipt, Eye, X, Plus, Minus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { useOrderStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { useEffect } from "react";

type SettingsInfo = {
  name: string;
  logo: string | null;
  tablesCount: number;
};

export default function OrderManagementPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  
  // Real DB state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orders, setOrders] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [settings, setSettings] = useState<SettingsInfo>({ name: "Restaurant", logo: null, tablesCount: 15 });
  const { currency, language } = useOrderStore();

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map((d: any) => ({
          ...d,
          time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dateStr: new Date(d.time).toLocaleDateString([], { month: 'short', day: 'numeric' })
        }));
        setOrders(formatted);
      }
    } catch(err) { console.error(err) }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000); // Live poll every 3 seconds!

    // Fetch menu items for the "add item" dropdown
    const fetchMenu = async () => {
      try {
        const res = await fetch("/api/menu");
        if (res.ok) {
          const data = await res.json();
          setMenuItems(data.filter((d: any) => d.status === "active" || d.stock > 0));
        }
      } catch (e) { console.error(e); }
    };
    fetchMenu();

    // Fetch settings for logo/name on receipts
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings({ name: data.name || "Restaurant", logo: data.logo || null, tablesCount: data.tablesCount || 15 });
        }
      } catch (e) { console.error(e); }
    };
    fetchSettings();

    return () => clearInterval(interval);
  }, []);
  
  // Modal State
  const [viewedOrderId, setViewedOrderId] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  
  // New Order State
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [newOrderType, setNewOrderType] = useState<"takeaway" | "dine-in">("takeaway");
  const [newOrderTable, setNewOrderTable] = useState("1");
  const [newOrderItems, setNewOrderItems] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [newOrderNote, setNewOrderNote] = useState("");
  
  // Print control
  const [printMode, setPrintMode] = useState<"none" | "kitchen" | "payment">("none");

  const viewedOrder = orders.find(o => o.id === viewedOrderId) || null;

  const filteredOrders = orders.filter(order => {
    if (activeFilter === "all") return true;
    return order.status === activeFilter;
  });

  const getOrderTotal = (items: any[]) => {
    return items.reduce((acc: number, current: any) => acc + (current.price * current.quantity), 0);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!viewedOrderId) return;
    try {
      await fetch(`/api/orders/${viewedOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", status: newStatus })
      });
      fetchOrders();
    } catch(e) {}
  };

  const handleUpdateItemQuantity = async (itemId: string, delta: number) => {
    if (!viewedOrderId) return;
    const item = viewedOrder?.items.find((i:any) => i.id === itemId);
    if (!item) return;
    const newQuantity = Math.max(0, item.quantity + delta);
    if (newQuantity === 0) {
       handleRemoveItem(itemId);
       return;
    }
    try {
      await fetch(`/api/orders/${viewedOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateQuantity", itemId, quantity: newQuantity })
      });
      fetchOrders();
    } catch(e) {}
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!viewedOrderId) return;
    try {
      await fetch(`/api/orders/${viewedOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "removeItem", itemId })
      });
      fetchOrders();
    } catch(e) {}
  };

  const handleAddNewItem = async (product: { name: string; price: number }) => {
    if (!viewedOrderId) return;
    try {
      await fetch(`/api/orders/${viewedOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addItem", item: { name: product.name, price: product.price, quantity: 1, note: "" } })
      });
      fetchOrders();
      setIsAddingItem(false);
    } catch(e) {}
  };

  const handlePrint = async (mode: "kitchen" | "payment") => {
    // Acknowledge the order automatically so the topbar alarm stops ringing
    if (viewedOrder && viewedOrder.status === "pending") {
       try {
         await fetch(`/api/orders/${viewedOrderId}`, {
           method: "PATCH",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ action: "status", status: "preparing" })
         });
         fetchOrders(); // update local state
       } catch (e) {}
    }

    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      // Reset after print dialog triggers
      setTimeout(() => setPrintMode("none"), 1000);
    }, 100);
  };

  const handleSubmitNewOrder = async () => {
    if (newOrderItems.length === 0) return;
    setIsSubmittingOrder(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newOrderType,
          table: newOrderType === "dine-in" ? `Table ${newOrderTable}` : "Takeaway",
          customerName: "Admin/Manual",
          customerPhone: "",
          items: newOrderItems.map((item, index) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            note: index === 0 ? newOrderNote.trim() : ""
          }))
        })
      });
      if (res.ok) {
        setIsNewOrderModalOpen(false);
        setNewOrderItems([]);
        setNewOrderType("takeaway");
        setNewOrderTable("1");
        setNewOrderNote("");
        fetchOrders();
      } else {
        alert("Failed to create order");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Status mapping
  const statuses = ["pending", "preparing", "ready", "completed", "cancelled"];

  return (
    <>
      <div className="space-y-6 print:hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("orders.title", language)}</h1>
            <p className="text-muted-foreground mt-1">{t("orders.subtitle", language)}</p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:opacity-90 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" />
              {language === "ar" ? "إضافة طلب جديد" : language === "fr" ? "Nouvelle Commande" : "New Order"}
            </button>
          </motion.div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-sm w-full">
          <div className="flex overflow-x-auto w-full md:w-auto gap-2 pb-2 md:pb-0 no-scrollbar">
            {["all", ...statuses.filter(s => s !== "cancelled")].map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap capitalize transition-colors ${
                  activeFilter === filter 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {t(`orders.${filter}`, language)}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground text-sm font-semibold rounded-xl hover:bg-secondary/70 transition-colors">
              <Filter className="w-4 h-4" />
              {t("orders.moreFilters", language)}
            </button>
            <div className="relative flex-1 md:w-64 group">
              <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-muted-foreground">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                className="w-full ps-9 pe-4 py-2 text-sm bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground text-foreground"
                placeholder={t("orders.searchPlaceholder", language)}
              />
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-card border border-border shadow-sm p-6 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground text-sm font-medium">
                  <th className="pb-3 px-4 ps-0">{language === "ar" ? "رقم الطلب" : language === "fr" ? "N° Commande" : "Order Number"}</th>
                  <th className="pb-3 px-4">{t("orders.destination", language)}</th>
                  <th className="pb-3 px-4 text-center">{t("orders.items", language)}</th>
                  <th className="pb-3 px-4">{t("orders.amount", language)}</th>
                  <th className="pb-3 px-4">{t("common.status", language)}</th>
                  <th className="pb-3 px-4">{t("orders.time", language)}</th>
                  <th className="pb-3 px-4 text-right pe-0">{t("common.actions", language)}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      {t("orders.noOrdersFound", language)}
                    </td>
                  </tr>
                ) : null}
                {filteredOrders.map((order, i) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/20 last:border-0 hover:bg-secondary/30 transition-colors group cursor-pointer"
                    onClick={() => setViewedOrderId(order.id)}
                  >
                    <td className="py-4 font-bold text-foreground">{order.orderNum}</td>
                    <td className="py-4 px-4 text-muted-foreground font-medium">
                      <span className="flex flex-col">
                        <span className="text-foreground">{order.table}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                          {order.type}
                        </span>
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center text-muted-foreground font-medium">
                      {order.items.reduce((acc: number, curr: any) => acc + curr.quantity, 0)}
                    </td>
                    <td className="py-4 px-4 font-semibold text-foreground">
                      {currency === "DZD " || currency === "AED " || currency === "SAR " ? `${getOrderTotal(order.items).toFixed(2)} ${currency}` : `${currency}${getOrderTotal(order.items).toFixed(2)}`}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize
                        ${order.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                          order.status === 'preparing' ? 'bg-primary/10 text-primary border border-primary/20' : 
                          order.status === 'ready' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                          order.status === 'cancelled' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                          'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}
                      >
                        {t(`orders.${order.status}`, language)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground text-sm">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {order.time}
                        </div>
                        <span className="text-xs text-muted-foreground/70 pl-5">{order.dateStr}</span>
                      </div>
                    </td>
                    <td className="py-4 text-right pr-0">
                     <button 
                         onClick={(e) => { e.stopPropagation(); setViewedOrderId(order.id); }}
                         className="px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center gap-2 ml-auto"
                       >
                          <Eye className="w-4 h-4" /> {t("orders.manage", language)}
                       </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Modal Quick View */}
      <AnimatePresence>
        {viewedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end print:hidden"
            onClick={() => { setViewedOrderId(null); setIsAddingItem(false); }}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full max-w-lg h-full border-l border-border flex flex-col shadow-2xl overflow-y-auto"
            >
              {/* Header */}
              <div className="p-6 border-b border-border flex justify-between items-start bg-secondary/10 sticky top-0 z-10">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-foreground">{t("orders.order", language)} {viewedOrder.orderNum}</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider
                        ${viewedOrder.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 
                          viewedOrder.status === 'preparing' ? 'bg-primary/10 text-primary' : 
                          viewedOrder.status === 'ready' ? 'bg-blue-500/10 text-blue-500' :
                          viewedOrder.status === 'cancelled' ? 'bg-destructive/10 text-destructive' :
                          'bg-emerald-500/10 text-emerald-500'}`}
                    >
                      {t(`orders.${viewedOrder.status}`, language)}
                    </span>
                  </div>
                  <p className="text-muted-foreground flex items-center gap-1 text-sm font-medium pr-12">
                    {t("orders.destination", language)}: <span className="text-foreground font-bold">{viewedOrder.table} ({viewedOrder.type})</span>
                  </p>
                  {viewedOrder.customerName && (
                    <div className="mt-2 p-3 bg-secondary/50 rounded-xl border border-border/50 text-sm">
                      <p><span className="font-semibold text-muted-foreground">{t("orders.customer", language)}:</span> <span className="font-bold text-foreground">{viewedOrder.customerName}</span></p>
                      <p><span className="font-semibold text-muted-foreground">{t("orders.phone", language)}:</span> <span className="font-bold text-foreground">{viewedOrder.customerPhone}</span></p>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => { setViewedOrderId(null); setIsAddingItem(false); }}
                  className="p-2 hover:bg-secondary rounded-full transition-colors absolute top-4 right-4"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Status Update Block */}
              <div className="p-6 border-b border-border bg-card">
                <label className="text-sm font-semibold text-foreground mb-3 block">{t("orders.updateStatus", language)}</label>
                <div className="grid grid-cols-2 gap-2">
                  {statuses.map(s => (
                    <button
                      key={s}
                      onClick={() => handleUpdateStatus(s)}
                      className={cn(
                        "px-3 py-2 text-sm font-medium rounded-lg capitalize border transition-all text-center",
                        viewedOrder.status === s 
                          ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                          : "border-border bg-secondary hover:bg-secondary/70 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t(`orders.${s}`, language)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Items edit */}
              <div className="flex-1 p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                   <h3 className="font-bold text-foreground">{t("orders.orderItems", language)}</h3>
                   <span className="text-sm font-medium text-muted-foreground">{viewedOrder.items.reduce((a: number, c: any) => a + c.quantity, 0)} {t("orders.itemsTotal", language)}</span>
                </div>
                
                {viewedOrder.items.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 bg-secondary/30 rounded-xl">{t("orders.orderEmpty", language)}</p>
                ) : (
                  <div className="space-y-3">
                    {viewedOrder.items.map((item: any) => (
                      <div key={item.id} className="p-4 bg-secondary/30 border border-border rounded-xl flex flex-col gap-3 group relative">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-foreground text-base max-w-[200px] leading-tight">{item.name}</h4>
                            <div className="text-sm font-bold text-primary mt-1">
                              {currency === "DZD " || currency === "AED " || currency === "SAR " ? `${(item.price * item.quantity).toFixed(2)} ${currency}` : `${currency}${(item.price * item.quantity).toFixed(2)}`}
                            </div>
                          </div>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-1.5 shadow-sm">
                            <button 
                              onClick={() => handleUpdateItemQuantity(item.id, -1)}
                              className="p-1 hover:bg-secondary rounded-md text-foreground transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-4 text-center font-semibold text-sm">{item.quantity}</span>
                            <button 
                              onClick={() => handleUpdateItemQuantity(item.id, 1)}
                              className="p-1 hover:bg-secondary rounded-md text-foreground transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {item.note && (
                          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-700 dark:text-amber-500 flex items-start gap-2">
                             <span className="font-bold shrink-0">{t("orders.note", language)}:</span>
                             <span className="italic">{item.note}</span>
                          </div>
                        )}

                        <button 
                          onClick={() => handleRemoveItem(item.id)}
                          className="absolute -top-2 -right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full shadow-md opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all hover:bg-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Item section */}
                <div className="pt-2">
                  {!isAddingItem ? (
                    <button 
                      onClick={() => setIsAddingItem(true)}
                      className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground font-semibold hover:bg-secondary/50 hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> {t("orders.addItem", language)}
                    </button>
                  ) : (
                    <div className="p-4 bg-secondary/20 border border-border rounded-xl space-y-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-sm text-foreground">{t("orders.selectItem", language)}</span>
                        <button onClick={() => setIsAddingItem(false)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {menuItems.map(product => (
                           <button
                             key={product.name}
                             onClick={() => handleAddNewItem(product)}
                             className="flex justify-between items-center p-3 bg-card hover:border-primary border border-border rounded-lg text-left transition-colors group shadow-sm"
                           >
                              <span className="font-semibold text-sm group-hover:text-primary transition-colors">{product.name}</span>
                              <span className="font-bold text-muted-foreground group-hover:text-primary transition-colors">
                                {currency === "DZD " || currency === "AED " || currency === "SAR " ? `${product.price.toFixed(2)} ${currency}` : `${currency}${product.price.toFixed(2)}`}
                              </span>
                           </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-between items-center px-2">
                   <span className="text-muted-foreground font-medium">{t("orders.subtotal", language)}</span>
                   <span className="text-2xl font-black text-foreground">
                     {currency === "DZD " || currency === "AED " || currency === "SAR " ? `${getOrderTotal(viewedOrder.items).toFixed(2)} ${currency}` : `${currency}${getOrderTotal(viewedOrder.items).toFixed(2)}`}
                   </span>
                </div>
              </div>

              {/* Print Action Buttons */}
              <div className="p-6 border-t border-border bg-card grid grid-cols-2 gap-3 sticky bottom-0 z-10 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
                 <button
                   onClick={() => handlePrint('kitchen')}
                   className="flex items-center justify-center gap-2 py-3 bg-secondary text-foreground hover:bg-border font-semibold rounded-xl border border-border transition-colors"
                 >
                   <Printer className="w-5 h-5" />
                   {t("orders.kitchenSplit", language)}
                 </button>
                 <button
                   onClick={() => handlePrint('payment')}
                   className="flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground hover:opacity-90 font-semibold rounded-xl shadow-lg shadow-primary/25 transition-all"
                 >
                   <Receipt className="w-5 h-5" />
                   {t("orders.paymentSplit", language)}
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Order Modal */}
      <AnimatePresence>
        {isNewOrderModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsNewOrderModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-border overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-border shrink-0 bg-secondary/10">
                <h2 className="text-xl font-bold text-foreground">
                  {language === "ar" ? "طلب جديد" : language === "fr" ? "Nouvelle Commande" : "New Order"}
                </h2>
                <button onClick={() => setIsNewOrderModalOpen(false)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 {/* Order Type & Table & Notes */}
                 <div className="flex flex-col gap-4">
                   <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 space-y-2">
                         <label className="text-sm font-semibold">{language === "ar" ? "نوع الطلب" : language === "fr" ? "Type" : "Order Type"}</label>
                         <div className="flex gap-2 p-1 bg-secondary rounded-xl">
                            <button 
                              onClick={() => setNewOrderType("takeaway")}
                              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${newOrderType === "takeaway" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                              Takeaway
                            </button>
                            <button 
                              onClick={() => setNewOrderType("dine-in")}
                              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${newOrderType === "dine-in" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                              Dine-In
                            </button>
                         </div>
                      </div>
                      {newOrderType === "dine-in" && (
                         <div className="flex-1 space-y-2">
                           <label className="text-sm font-semibold">{language === "ar" ? "الطاولة" : language === "fr" ? "Table" : "Table Number"}</label>
                           <select 
                             value={newOrderTable} 
                             onChange={e => setNewOrderTable(e.target.value)}
                             className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                           >
                              {Array.from({length: settings.tablesCount}).map((_, i) => (
                                <option key={i+1} value={String(i+1)}>Table {i+1}</option>
                              ))}
                           </select>
                         </div>
                      )}
                   </div>
                   <div className="flex flex-col space-y-2">
                     <label className="text-sm font-semibold">{language === "ar" ? "ملاحظات الطلب" : language === "fr" ? "Notes" : "Order Notes"}</label>
                     <textarea
                       value={newOrderNote}
                       onChange={e => setNewOrderNote(e.target.value)}
                       placeholder={language === "ar" ? "بدون بصل، حار إكسترا..." : language === "fr" ? "Sans oignons, extra piquant..." : "No onions, extra spicy..."}
                       className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px] resize-none text-sm text-foreground placeholder:text-muted-foreground"
                     />
                   </div>
                 </div>

                 {/* Products Grid */}
                 <div className="space-y-3">
                   <h3 className="text-sm font-bold text-muted-foreground">RESTAURANT MENU</h3>
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                     {menuItems.map((item) => {
                        const count = newOrderItems.find(i => i.id === item.id)?.quantity || 0;
                        return (
                          <div key={item.id} className="p-3 border border-border rounded-xl bg-secondary/10 hover:bg-secondary/30 transition-colors flex flex-col justify-between gap-3">
                            <div>
                               <p className="font-semibold text-sm line-clamp-2">{item.name}</p>
                               <p className="text-primary font-bold text-xs mt-1">
                                 {currency === "DZD " || currency === "AED " || currency === "SAR " ? `${item.price} ${currency}` : `${currency}${item.price}`}
                               </p>
                            </div>
                            {count === 0 ? (
                              <button 
                                onClick={() => setNewOrderItems([...newOrderItems, { id: item.id, name: item.name, price: item.price, quantity: 1 }])}
                                className="w-full py-2 bg-secondary text-foreground text-xs font-bold rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
                              >
                                {language === "ar" ? "إضافة" : language === "fr" ? "Ajouter" : "Add to Order"}
                              </button>
                            ) : (
                               <div className="flex items-center justify-between border border-border rounded-lg overflow-hidden bg-card">
                                 <button onClick={() => {
                                    if(count === 1) {
                                      setNewOrderItems(newOrderItems.filter(i => i.id !== item.id));
                                    } else {
                                      setNewOrderItems(newOrderItems.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i));
                                    }
                                 }} className="px-3 py-2 hover:bg-secondary text-muted-foreground hover:text-foreground"><Minus className="w-3 h-3"/></button>
                                 <span className="font-bold text-sm">{count}</span>
                                 <button onClick={() => {
                                    setNewOrderItems(newOrderItems.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
                                 }} className="px-3 py-2 hover:bg-secondary text-muted-foreground hover:text-foreground"><Plus className="w-3 h-3"/></button>
                               </div>
                            )}
                          </div>
                        );
                     })}
                   </div>
                 </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border bg-secondary/10 shrink-0 flex items-center justify-between">
                 <div className="flex flex-col">
                   <span className="text-sm font-medium text-muted-foreground">{t("orders.subtotal", language) || "Total"}</span>
                   <span className="text-2xl font-black text-foreground">
                     {currency === "DZD " || currency === "AED " || currency === "SAR " ? `${getOrderTotal(newOrderItems).toFixed(2)} ${currency}` : `${currency}${getOrderTotal(newOrderItems).toFixed(2)}`}
                   </span>
                 </div>
                 <button
                   onClick={handleSubmitNewOrder}
                   disabled={newOrderItems.length === 0 || isSubmittingOrder}
                   className="px-8 py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg shadow-primary/25"
                 >
                   {isSubmittingOrder ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Plus className="w-5 h-5" />}
                   {language === "ar" ? "تأكيد الطلب" : language === "fr" ? "Confirmer Commande" : "Confirm Order"}
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- PRINTABLE SECTIONS --- */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            background: white !important;
            color: black !important;
            margin: 0;
            padding: 4mm;
            font-family: monospace;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>

      {viewedOrder && printMode !== "none" && (
        <div id="print-area" dir="ltr">
          {printMode === "kitchen" ? (
            <>
              <div className="text-center mb-4 border-b-2 border-dashed border-black pb-2">
                 <h1 className="text-xl font-bold uppercase mb-1 leading-none tracking-tight">KITCHEN</h1>
                 <p className="font-bold text-lg mb-1">{viewedOrder.orderNum}</p>
                 <div className="bg-black text-white py-1 my-2">
                   <p className="font-bold text-xl uppercase tracking-widest leading-none px-1">
                     {viewedOrder.type === 'takeaway' ? 'TAKEAWAY ORDER' : viewedOrder.table}
                   </p>
                 </div>
                 <p className="uppercase text-sm font-bold tracking-widest">{viewedOrder.type}</p>
                 <p className="text-xs mt-1">{new Date().toLocaleTimeString()}</p>
              </div>
              
              <div className="space-y-3 border-b-2 border-dashed border-black pb-4 mb-4">
                 {viewedOrder.items.map((item: any) => (
                   <div key={item.id} className="flex flex-col gap-0.5">
                     <div className="flex font-bold text-base leading-tight">
                       <span className="mr-2 text-lg">{item.quantity}x</span>
                       <span className="uppercase">{item.name}</span>
                     </div>
                     {item.note && (
                       <div className="pl-6 font-bold uppercase text-sm italic">
                         *** {item.note} ***
                       </div>
                     )}
                   </div>
                 ))}
              </div>
              
              <div className="text-center uppercase text-xs font-bold tracking-widest leading-none mt-8">
                 --- END OF TICKET ---
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-4 border-b-2 border-dashed border-black pb-2 flex flex-col items-center">
                 {settings.logo && (
                    <img src={settings.logo} alt={settings.name} className="w-16 h-16 object-contain mb-2" />
                  )}
                  <h1 className="text-xl font-bold uppercase mb-1 leading-none tracking-tight">{settings.name}</h1>
                 
                 <div className="w-full text-left mt-4 border-t-2 border-black pt-2 flex justify-between text-sm font-bold uppercase">
                   <span>{viewedOrder.orderNum}</span>
                   <span>{viewedOrder.type === 'takeaway' ? 'TAKEAWAY ORDER' : viewedOrder.table}</span>
                 </div>
                 <div className="w-full text-left text-xs uppercase mt-1 border-b-2 border-black pb-2">
                   {new Date().toLocaleString()}
                 </div>
              </div>
              
              <div className="space-y-2 pb-4 mb-2">
                 <div className="flex justify-between font-bold text-xs uppercase border-b-2 border-dashed border-black pb-1 mb-2">
                   <span className="flex-1">ITEM</span>
                   <span className="w-6 text-center">QTY</span>
                   <span className="w-16 text-right">TOTAL</span>
                 </div>
                 {viewedOrder.items.map((item: any) => (
                   <div key={item.id} className="flex justify-between items-start gap-1 text-sm font-semibold uppercase relative leading-tight mb-2">
                     <span className="flex-[2] pr-2 break-words text-left">{item.name}</span>
                     <span className="w-6 text-center absolute right-[4rem] top-0">{item.quantity}</span>
                     <span className="w-16 text-right absolute right-0 top-0">
                       {currency === "DZD " || currency === "AED " || currency === "SAR " ? `${(item.price * item.quantity).toFixed(2)} ${currency}` : `${currency}${(item.price * item.quantity).toFixed(2)}`}
                     </span>
                   </div>
                 ))}
              </div>
              
              <div className="flex flex-col pt-2 border-t-2 border-solid border-black mb-6">
                 <div className="flex justify-between w-full font-bold text-sm uppercase">
                   <span>TTL ITEMS:</span>
                   <span>{viewedOrder.items.reduce((a: number, c: any) => a + c.quantity, 0)}</span>
                 </div>
                 <div className="flex justify-between w-full text-xl font-black mt-2 tracking-tighter">
                   <span>TOTAL DUE</span>
                   <span>
                     {currency === "DZD " || currency === "AED " || currency === "SAR " ? `${getOrderTotal(viewedOrder.items).toFixed(2)} ${currency}` : `${currency}${getOrderTotal(viewedOrder.items).toFixed(2)}`}
                   </span>
                 </div>
              </div>
              
              <div className="text-center text-xs font-bold uppercase leading-tight mt-8">
                 <p className="mb-1">*** THANK YOU ***</p>
                 <p>PLEASE COME AGAIN</p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
