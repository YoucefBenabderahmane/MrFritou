"use client";

import { useState, useEffect } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { PackageSearch, ArrowDownRight, ArrowUpRight, Plus, Search, Trash2, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrderStore } from "@/lib/store";
import { t } from "@/lib/i18n";

type StockItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  lastUpdated: string;
};


type Transaction = {
  id: number;
  type: "income" | "purchase";
  amount: number;
  description: string;
  date: string;
};

const INITIAL_CATEGORIES = ["All", "Produce", "Meat", "Dairy", "Dry Goods", "Beverages", "Packaging"];

export default function StockPage() {
  const { currency, language } = useOrderStore();
  
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchStock = async () => {
    try {
      const res = await fetch("/api/stock");
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch stock:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [modalType, setModalType] = useState<"purchase" | "income" | null>(null);

  const filteredItems = items.filter(item => {

    const matchesTab = activeTab === "All" || item.category === activeTab;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });


  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      setCategories([...categories, newCategoryName.trim()]);
    }
    setNewCategoryName("");
    setIsCategoryModalOpen(false);
  };

  const handleRemoveCategory = (categoryToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to remove the "${categoryToRemove}" category?`)) {
      setCategories(categories.filter(c => c !== categoryToRemove));
      if (activeTab === categoryToRemove) setActiveTab("All");
    }
  };

  const handleLogTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    const description = formData.get("description") as string;
    
    try {
      if (modalType === "purchase") {
        const itemName = formData.get("itemName") as string;
        const category = formData.get("category") as string;
        const quantity = Number(formData.get("quantity"));
        const unit = formData.get("unit") as string;

        // Log the stock update
        await fetch("/api/stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: itemName,
            category,
            quantity,
            unit,
            unitCost: amount / quantity
          })
        });

        // Log the expense transaction
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "expense",
            amount,
            description: `Purchase: ${itemName} (${quantity} ${unit})`,
            category
          })
        });
      } else if (modalType === "income") {
        // Log the income transaction
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "income",
            amount,
            description,
            category: "General Income"
          })
        });
      }
      
      fetchStock();
    } catch (error) {
      console.error("Failed to log transaction:", error);
    }

    setModalType(null);
  };


  const handleDeleteItem = async (id: string) => {
    if (confirm("Are you sure you want to remove this item from stock?")) {
      try {
        const res = await fetch(`/api/stock/${id}`, {
          method: "DELETE"
        });
        if (res.ok) {
          fetchStock();
        }
      } catch (error) {
        console.error("Failed to delete stock item:", error);
      }
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("stock.title", language)}</h1>
          <p className="text-muted-foreground mt-1">{t("stock.subtitle", language)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <motion.button
            onClick={() => setIsCategoryModalOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground font-semibold rounded-xl shadow-sm border border-border"
          >
            <Plus className="w-5 h-5" />
            {t("menu.addCategory", language)}
          </motion.button>
          <motion.button
            onClick={() => setModalType("income")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 glass border border-border text-foreground font-semibold rounded-xl shadow-sm hover:border-emerald-500/50 transition-colors"
          >
            <ArrowUpRight className="w-5 h-5 text-emerald-500" />
            {t("stock.logIncome", language)}
          </motion.button>
          <motion.button
            onClick={() => setModalType("purchase")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25"
          >
            <ArrowDownRight className="w-5 h-5 text-primary-foreground" />
            {t("stock.logPurchase", language)}
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-sm w-full">
        <div className="flex overflow-x-auto w-full md:w-auto gap-2 pb-2 md:pb-0 no-scrollbar">
          {categories.map(category => (
            <div key={category} className="relative group/cat shrink-0 mt-1.5 mr-1.5">
              <button
                onClick={() => setActiveTab(category)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                  activeTab === category 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {category}
              </button>
              {category !== "All" && (
                <button
                  onClick={(e) => handleRemoveCategory(category, e)}
                  className="absolute -top-1.5 -right-1.5 p-0.5 bg-destructive text-destructive-foreground rounded-full opacity-0 scale-50 group-hover/cat:opacity-100 group-hover/cat:scale-100 transition-all hover:bg-red-600 shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        
        <div className="relative w-full md:w-64 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground text-foreground"
            placeholder={t("stock.searchGoods", language)}
          />
        </div>
      </div>

      {/* Grid view of stock items */}
      {filteredItems.length === 0 ? (
         <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground flex flex-col items-center justify-center h-64 shadow-sm">
           <PackageSearch className="w-12 h-12 mb-4 text-primary/40" />
           <h3 className="text-lg font-semibold text-foreground">{t("stock.noItemsFound", language)}</h3>
           <p className="text-sm mt-1">{t("stock.noItemsDesc", language)}</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, i) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                key={item.id}
                className="group bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:border-primary/50 transition-colors flex flex-col p-5"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-foreground truncate">{item.name}</h3>
                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground mt-1">
                      <Tag className="w-3 h-3" />
                      {item.category}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="mt-auto grid grid-cols-2 gap-4 border-t border-border/50 pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">{t("stock.inStock", language)}</p>
                    <p className="text-xl font-bold text-foreground">
                      {item.quantity} <span className="text-sm font-medium tracking-normal text-muted-foreground">{item.unit}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">{t("stock.unitCost", language)}</p>
                    <p className="text-xl font-bold text-foreground">
                      {currency === "DZD " || currency === "AED " || currency === "SAR " ? `${item.unitCost.toFixed(2)} ${currency}` : `${currency}${item.unitCost.toFixed(2)}`}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Category Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCategoryModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/10">
                <h2 className="text-xl font-bold text-foreground">{t("menu.addCategory", language)}</h2>
                <button 
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="p-2 hover:bg-secondary rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <form onSubmit={handleAddCategory} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">{t("menu.categoryName", language)}</label>
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    placeholder="e.g. Spices & Herbs"
                  />
                </div>
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-foreground font-semibold hover:bg-secondary transition-colors"
                  >
                    {t("common.cancel", language)}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {t("menu.addCategory", language)}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction Modal */}
      <AnimatePresence>
        {modalType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalType(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/10">
                <h2 className="text-xl font-bold text-foreground">
                  {modalType === "purchase" ? t("stock.logPurchaseExpense", language) : t("stock.logIncome", language)}
                </h2>
                <button 
                  onClick={() => setModalType(null)}
                  className="p-2 hover:bg-secondary rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <form onSubmit={handleLogTransaction} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">{t("stock.totalAmount", language)} ({currency})</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">{t("stock.description", language)}</label>
                  <input
                    name="description"
                    required
                    className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    placeholder={modalType === "purchase" ? t("stock.descPurchase", language) : t("stock.descIncome", language)}
                  />
                </div>

                {modalType === "purchase" && (
                  <div className="border border-border rounded-xl p-4 bg-secondary/20 space-y-4">
                    <h4 className="font-semibold text-sm text-foreground">{t("stock.stockItemDetails", language)}</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <label className="text-xs font-semibold text-muted-foreground">{t("stock.itemName", language)}</label>
                        <input
                          name="itemName"
                          required
                          className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                          placeholder="e.g. Fresh Tomatoes"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">{t("menu.category", language)}</label>
                        <select
                          name="category"
                          required
                          className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                        >
                          {categories.filter(c => c !== "All").map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">{t("stock.quantity", language)}</label>
                        <div className="flex gap-2">
                          <input
                            name="quantity"
                            type="number"
                            step="0.01"
                            required
                            className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                            placeholder={t("stock.amountPlaceholder", language)}
                          />
                          <input
                            name="unit"
                            required
                            className="w-20 shrink-0 px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                            placeholder={t("stock.unitPlaceholder", language)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-5 py-2.5 rounded-xl text-foreground font-semibold hover:bg-secondary transition-colors"
                  >
                    {t("common.cancel", language)}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {modalType === "purchase" ? t("stock.confirmPurchase", language) : t("stock.confirmIncome", language)}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
