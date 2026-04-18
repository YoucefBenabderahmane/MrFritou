"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { isRTL } from "@/lib/i18n";
import { ShoppingCart, ArrowLeft, Image as ImageIcon, Minus, Plus, MessageSquare, X, RefreshCcw, Star, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrderStore } from "@/lib/store";
import { t } from "@/lib/i18n";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  image: string | null;
  status: string;
  description?: string;
  rating?: number;
};

type CartItem = {
  cartItemId: string;
  id: string;
  name: string;
  price: number;
  quantity: number;
  note: string;
  image: string | null;
};

type SettingsData = {
  name: string;
  currency: string;
  logo: string | null;
};

function MenuContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { language, setLanguage, setCurrency } = useOrderStore();
  
  const table = params.get("table") || "Takeaway";
  const type = table === "Takeaway" || params.get("type") === "takeaway" ? "takeaway" : "dine-in";
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [settings, setSettings] = useState<SettingsData>({ name: "Restaurant", currency: "$", logo: null });
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [reviewingProduct, setReviewingProduct] = useState<MenuItem | null>(null);
  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "", authorName: "" });

  const openReviews = async (product: MenuItem) => {
    setReviewingProduct(product);
    setProductReviews([]);
    setIsReviewOpen(true);
    setNewReview({ rating: 5, comment: "", authorName: customerName || "" });
    try {
      const res = await fetch(`/api/menu/${product.id}/reviews`);
      if (res.ok) setProductReviews(await res.json());
    } catch (e) {}
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingProduct) return;
    try {
      const res = await fetch(`/api/menu/${reviewingProduct.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReview)
      });
      if (res.ok) {
        const addedReview = await res.json();
        setProductReviews([addedReview, ...productReviews]);
        setNewReview({ rating: 5, comment: "", authorName: customerName || "" });
        setMenuItems(menuItems.map(m => {
          if (m.id === reviewingProduct.id) {
            const newCount = productReviews.length + 1;
            // approximate previous total rating using old count
            const currentTotal = (m.rating || 0) * productReviews.length;
            return { ...m, rating: (currentTotal + addedReview.rating) / newCount };
          }
          return m;
        }));
      }
    } catch (e) {}
  };

  // Reviews Modal extracted

  // Fetch menu items from DB
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuRes, settingsRes] = await Promise.all([
          fetch("/api/menu"),
          fetch("/api/settings")
        ]);
        
        if (menuRes.ok) {
          const items: MenuItem[] = await menuRes.json();
          // Only show items that are active or have stock > 0
          const activeItems = items.filter(item => item.stock > 0);
          setMenuItems(activeItems);
          
          // Extract unique categories from the items
          const cats = ["All", ...Array.from(new Set(activeItems.map(item => item.category)))];
          setCategories(cats);
        }
        
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings({
            name: settingsData.name || "Restaurant",
            currency: settingsData.currency || "$",
            logo: settingsData.logo || null,
          });
          if (settingsData.language) setLanguage(settingsData.language);
          if (settingsData.currency) setCurrency(settingsData.currency);
        }
      } catch (error) {
        console.error("Failed to fetch menu:", error);
      } finally {
        setIsLoadingMenu(false);
      }
    };
    fetchData();
  }, []);

  const filteredProducts = menuItems.filter(item => 
    activeCategory === "All" || item.category === activeCategory
  );

  const formatPrice = (val: number) => {
    const c = settings.currency;
    return c === "DZD " || c === "AED " || c === "SAR " || c === "MAD " || c === "TND "
      ? `${val.toFixed(2)} ${c}`
      : `${c}${val.toFixed(2)}`;
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id && i.note === "");
      if (idx >= 0) {
        const newCart = [...prev];
        newCart[idx].quantity += 1;
        return newCart;
      }
      return [...prev, { 
        cartItemId: Math.random().toString(36).substr(2, 9),
        id: item.id, 
        name: item.name, 
        price: item.price, 
        quantity: 1, 
        note: "",
        image: item.image
      }];
    });
  };

  const updateQuantity = (cartItemId: string, change: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        return { ...item, quantity: Math.max(0, item.quantity + change) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const updateNote = (cartItemId: string, note: string) => {
    setCart(prev => prev.map(item => 
      item.cartItemId === cartItemId ? { ...item, note } : item
    ));
  };

  const [orderSuccess, setOrderSuccess] = useState<{ id: string; num: string } | null>(null);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    if (type === "takeaway" && (!customerName.trim() || !customerPhone.trim())) {
      window.alert(t("customer.provideDetails", language));
      return;
    }
    
    setIsSubmitting(true);
    const orderNum = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNum,
          table: type === "takeaway" ? "Takeaway" : table,
          type,
          status: "pending",
          customerName: type === "takeaway" ? customerName : null,
          customerPhone: type === "takeaway" ? customerPhone : null,
          items: cart.map(c => ({
            name: c.name,
            quantity: c.quantity,
            price: c.price,
            note: c.note
          }))
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setIsCartOpen(false);
        setOrderSuccess({ id: data.id, num: data.orderNum });
      } else {
        const errData = await res.json();
        window.alert(`${t("customer.failedToPlace", language)} ${errData.error || res.statusText}`);
      }
    } catch (e) {
      console.error(e);
      window.alert(t("customer.connectionError", language));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Modal extracted


  const totalCartQuantity = cart.reduce((a, b) => a + b.quantity, 0);
  const totalCartPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  if (isLoadingMenu) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">{t("customer.loadingMenu", language)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden" dir={isRTL(language) ? "rtl" : "ltr"}>
      <AnimatePresence>
        {isReviewOpen && reviewingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsReviewOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-card border border-border w-full max-w-lg flex flex-col rounded-3xl shadow-2xl overflow-hidden max-h-[85vh]"
            >
              <div className="p-5 border-b border-border flex justify-between items-center bg-secondary/10 shrink-0">
                <h2 className="text-xl font-bold text-foreground truncate pl-2">{reviewingProduct.name} - {t("customer.recentReviews", language)}</h2>
                <button type="button" onClick={() => setIsReviewOpen(false)} className="p-2 glass rounded-full hover:bg-secondary">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                <form onSubmit={submitReview} className="space-y-4 bg-secondary/30 p-5 rounded-2xl border border-border">
                  <h3 className="font-bold text-foreground">{t("customer.writeReview", language)}</h3>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} type="button" onClick={() => setNewReview({...newReview, rating: star})} className="p-1 transition-transform hover:scale-110">
                        <Star className={`w-8 h-8 ${star <= newReview.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`} />
                      </button>
                    ))}
                  </div>
                  <input 
                    type="text" placeholder={t("customer.yourName", language)}
                    value={newReview.authorName} onChange={(e) => setNewReview({...newReview, authorName: e.target.value})}
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
                  />
                  <textarea 
                    placeholder={t("customer.shareThoughts", language)}
                    value={newReview.comment} onChange={(e) => setNewReview({...newReview, comment: e.target.value})} rows={3}
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none text-foreground"
                  />
                  <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                    {t("customer.submitReview", language)}
                  </button>
                </form>

                <div className="space-y-4">
                  <h3 className="font-bold text-foreground">{t("customer.recentReviews", language)} ({productReviews.length})</h3>
                  {productReviews.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">{t("customer.noReviewsYet", language)}</p>
                  ) : (
                    productReviews.map((r, i) => (
                      <div key={i} className="bg-card border border-border p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-foreground">{r.authorName || t("customer.anonymousUser", language)}</span>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(star => (
                              <Star key={star} className={`w-3 h-3 ${star <= r.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`} />
                            ))}
                          </div>
                        </div>
                        {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                        
                        {r.adminReply && (
                          <div className="mt-3 bg-secondary/30 border border-primary/20 p-3 rounded-xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                            <div className="flex items-center gap-1.5 mb-1 text-[10px] uppercase font-bold text-primary tracking-wider">
                              <CheckCircle className="w-3 h-3" />
                              {t("customer.restaurantResponse", language)}
                            </div>
                            <p className="text-sm text-foreground/90 leading-relaxed pl-1">{r.adminReply}</p>
                          </div>
                        )}
                        
                        <p className="text-[10px] text-muted-foreground mt-3 opacity-50">{new Date(r.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {orderSuccess && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-[101] p-6"
            >
              <div className="bg-card border border-border w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <motion.div
                    initial={{ rotate: -10, scale: 0.5 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: "spring", damping: 12 }}
                  >
                    <ShoppingCart className="w-10 h-10 text-primary" />
                  </motion.div>
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-2">{t("customer.orderReceived", language)}</h2>
                <p className="text-muted-foreground mb-6">
                  {t("customer.yourOrder", language)} <span className="text-primary font-bold">#{orderSuccess.num}</span> {t("customer.orderPlaced", language)}
                </p>
                
                <div className="bg-secondary/50 rounded-2xl p-4 mb-8 text-sm">
                  <p className="font-medium text-foreground">
                    {type === "takeaway" 
                      ? t("customer.weWillCall", language)
                      : `${t("customer.staffWillBring", language)} ${table} ${t("customer.shortly", language)}`}
                  </p>
                </div>

                <button 
                  onClick={() => setOrderSuccess(null)}
                  className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {t("customer.done", language)}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <div className="max-w-3xl mx-auto pb-32">

        {/* Header */}
        <div className="sticky top-0 bg-background/90 backdrop-blur-xl z-30 pt-4 pb-2 px-6 border-b border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => router.push("/")} className="p-2 glass rounded-full hover:bg-secondary transition-all shrink-0">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="text-center flex flex-col items-center flex-1 px-2 min-w-0">
              {settings.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logo} alt={settings.name} className="w-10 h-10 rounded-xl object-cover mb-1 border border-border/50" />
              )}
              <h1 className="text-xl font-bold text-foreground truncate w-full">{settings.name}</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mt-1">
                {type === "takeaway" ? `🛍️ ${t("customer.takeaway", language)}` : `🍽️ ${table}`}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative z-50">
                <button 
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="h-9 px-3 rounded-full bg-secondary/80 flex items-center justify-center font-bold text-sm hover:bg-secondary transition-colors border border-border/50 shadow-sm whitespace-nowrap gap-1.5"
                >
                  {language === "en" ? "English" : language === "fr" ? "Français" : "العربية"}
                  <div className={`text-[9px] transition-transform ${isLangOpen ? "rotate-180" : ""}`}>▼</div>
                </button>
                <AnimatePresence>
                  {isLangOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                        className={`absolute top-11 ${isRTL(language) ? "left-0" : "right-0"} w-32 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 flex flex-col`}
                      >
                        <button onClick={() => { setLanguage("en"); setIsLangOpen(false); }} className={`px-4 py-2 text-sm font-medium ${isRTL(language) ? "text-right" : "text-left"} transition-colors hover:bg-secondary/50 ${language === "en" ? "text-primary bg-primary/5" : "text-foreground"}`}>English</button>
                        <button onClick={() => { setLanguage("fr"); setIsLangOpen(false); }} className={`px-4 py-2 text-sm font-medium ${isRTL(language) ? "text-right" : "text-left"} transition-colors hover:bg-secondary/50 ${language === "fr" ? "text-primary bg-primary/5" : "text-foreground"}`}>Français</button>
                        <button onClick={() => { setLanguage("ar"); setIsLangOpen(false); }} className={`px-4 py-2 text-sm font-medium ${isRTL(language) ? "text-right" : "text-left"} transition-colors hover:bg-secondary/50 ${language === "ar" ? "text-primary bg-primary/5" : "text-foreground"}`}>العربية</button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 glass rounded-full hover:bg-secondary transition-all shadow-sm"
              >
                <ShoppingCart className="w-5 h-5 text-foreground" />
                {totalCartQuantity > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-primary text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-sm"
                  >
                    {totalCartQuantity}
                  </motion.span>
                )}
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === category 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">{t("customer.noItems", language)}</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((item, i) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  key={item.id} 
                  className="bg-card border border-border overflow-hidden rounded-3xl shadow-sm hover:shadow-lg hover:border-primary/50 transition-all flex flex-col group"
                >
                  <div className="h-48 relative overflow-hidden bg-secondary">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-10 h-10 opacity-20" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-full font-bold text-sm shadow-sm">
                      {formatPrice(item.price)}
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="truncate pr-2">
                        <h3 className="font-bold text-lg text-foreground truncate" title={item.name}>{item.name}</h3>
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider mt-0.5">{item.category}</p>
                      </div>
                      <button 
                        onClick={() => openReviews(item)}
                        className="flex flex-col items-center gap-0.5 bg-amber-500/10 text-amber-500 px-2 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors shrink-0"
                      >
                        <span className="text-[9px] font-bold uppercase tracking-wide leading-none">{t("customer.addReview", language)}</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-amber-500" />
                          <span className="text-xs font-bold">{item.rating && item.rating > 0 ? item.rating.toFixed(1) : "New"}</span>
                        </div>
                      </button>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1 mb-3">
                        {item.description}
                      </p>
                    )}
                    
                    <button
                      onClick={() => addToCart(item)}
                      className="mt-auto w-full py-3 bg-secondary text-foreground font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-primary hover:text-primary-foreground transition-all group/btn"
                    >
                      <Plus className="w-4 h-4 transition-transform group-hover/btn:scale-150" /> {t("customer.addToOrder", language)}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Cart Bottom Bar (When collapsed) */}
      <AnimatePresence>
        {totalCartQuantity > 0 && !isCartOpen && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 z-20 pointer-events-none"
          >
            <div className="max-w-3xl mx-auto flex items-center justify-between glass border border-border shadow-2xl rounded-2xl p-2 pl-6 pointer-events-auto cursor-pointer" onClick={() => setIsCartOpen(true)}>
              <div>
                 <p className="text-sm font-medium text-foreground">{totalCartQuantity} {t("customer.items", language)}</p>
                 <p className="text-lg font-bold text-primary">{formatPrice(totalCartPrice)}</p>
              </div>
              <button className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:scale-105 transition-transform">
                {t("customer.viewCart", language)}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Cart Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-background z-50 rounded-t-3xl max-h-[85vh] flex flex-col max-w-3xl mx-auto shadow-2xl border-t border-border"
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h2 className="text-2xl font-bold">{t("customer.yourOrder", language)}</h2>
                  <p className="text-muted-foreground text-sm">{table === "Takeaway" ? t("customer.takeaway", language) : table}</p>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-2 glass rounded-full hover:bg-secondary">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
                    <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
                    <p>{t("customer.cartEmpty", language)}</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <motion.div layout key={item.cartItemId} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-xl bg-secondary overflow-hidden shrink-0 border border-border/50">
                           {item.image ? (
                             // eslint-disable-next-line @next/next/no-img-element
                             <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center">
                               <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                             </div>
                           )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-foreground">{item.name}</h4>
                            <p className="font-bold text-primary">{formatPrice(item.price * item.quantity)}</p>
                          </div>
                          
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-3 bg-secondary rounded-lg p-1">
                              <button onClick={() => updateQuantity(item.cartItemId, -1)} className="p-1 hover:bg-background rounded-md transition-colors">
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-4 text-center font-semibold text-sm">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.cartItemId, 1)} className="p-1 hover:bg-background rounded-md transition-colors">
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notes Section */}
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="relative">
                          <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                          <input 
                            type="text"
                            placeholder={t("customer.addNote", language)}
                            value={item.note}
                            onChange={(e) => updateNote(item.cartItemId, e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground text-foreground"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
              
              {type === "takeaway" && cart.length > 0 && (
                <div className="p-6 bg-secondary/30 border-t border-border flex flex-col gap-4">
                  <h3 className="font-bold text-foreground">{t("customer.takeawayDetails", language)}</h3>
                  <input
                    type="text"
                    required
                    placeholder={t("customer.fullNameRequired", language)}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground text-foreground"
                  />
                  <input
                    type="tel"
                    required
                    placeholder={t("customer.phoneRequired", language)}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground text-foreground"
                  />
                </div>
              )}

              <div className="p-6 border-t border-border bg-card">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-muted-foreground font-medium">{t("customer.totalAmount", language)}</span>
                  <span className="text-3xl font-bold text-foreground">{formatPrice(totalCartPrice)}</span>
                </div>
                <button 
                  onClick={placeOrder}
                  disabled={isSubmitting || cart.length === 0}
                  className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 text-lg"
                >
                  {isSubmitting ? t("customer.processing", language) : t("customer.confirmOrder", language)}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-primary font-bold flex items-center justify-center min-h-screen">Loading menu...</div>}>
      <MenuContent />
    </Suspense>
  )
}
