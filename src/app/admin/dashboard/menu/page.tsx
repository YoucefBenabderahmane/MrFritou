"use client";

import { useState, useEffect } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, MoreVertical, Edit2, Trash2, Tag, Image as ImageIcon, X, Star, MessageSquare, CheckCircle, Reply, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// Initial mock data removed from global scope to be initialized in state
type Product = {
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


const INITIAL_MENU: Product[] = [
  { id: "1", name: "Truffle Pasta", price: 24.00, category: "Mains", stock: 45, image: null, status: "active" },
  { id: "2", name: "Wagyu Burger", price: 32.00, category: "Mains", stock: 12, image: null, status: "active" },
  { id: "3", name: "Caesar Salad", price: 14.00, category: "Starters", stock: 30, image: null, status: "active" },
  { id: "4", name: "Tiramisu", price: 12.00, category: "Desserts", stock: 5, image: null, status: "low" },
  { id: "5", name: "Craft Cola", price: 5.00, category: "Beverages", stock: 120, image: null, status: "active" },
];


import { useOrderStore } from "@/lib/store";
import { t, isRTL, type Language } from "@/lib/i18n";

export default function MenuManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/menu");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Failed to fetch menu:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const { currency, language } = useOrderStore();
  
  // State for categories, search, etc.
  const [categories, setCategories] = useState(["All", "Starters", "Mains", "Desserts", "Beverages", "Specials"]);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const savedCategories = localStorage.getItem("menuCategories");
    if (savedCategories) setCategories(JSON.parse(savedCategories));
  }, []);

  const saveCategories = (newCats: string[]) => {
    setCategories(newCats);
    localStorage.setItem("menuCategories", JSON.stringify(newCats));
  };

  // Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);


  const filteredProducts = products.filter(item => {
    const matchesTab = activeTab === "All" || item.category === activeTab;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        const res = await fetch(`/api/menu/${id}`, {
          method: "DELETE"
        });
        if (res.ok) {
          fetchProducts();
        }
      } catch (error) {
        console.error("Failed to delete product:", error);
      }
    }
  };

  const handleDeleteCategory = (categoryToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete the category "${categoryToDelete}"?`)) {
      const newCats = categories.filter(c => c !== categoryToDelete);
      saveCategories(newCats);
      if (activeTab === categoryToDelete) setActiveTab("All");
    }
  };


  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleDuplicate = (product: Product) => {
    // Note: In a real app, this would be a POST request to the API
    const newProduct = { ...product, id: Math.random().toString(36).substr(2, 9), name: `${product.name} (Copy)` };
    setProducts([...products, newProduct]);
    setOpenDropdownId(null);
  };


  const handleToggleStock = (product: Product) => {
    const newStock = product.stock === 0 ? 10 : 0;
    const newStatus = newStock < 10 ? "low" : "active";
    setProducts(products.map(p => p.id === product.id ? { ...product, stock: newStock, status: newStatus } : p));
    setOpenDropdownId(null);
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    // Auto-calculate status based on stock
    const stockVal = Number(formData.get("stock"));
    const statusVal = stockVal < 10 ? "low" : "active";

    // Handle image file — convert to base64 data URL for storage
    let imageUrl = editingProduct?.image || null;
    const imageFile = formData.get("image") as File;
    
    if (imageFile && imageFile.size > 0) {
      // Check file size (max 500KB)
      if (imageFile.size > 512000) {
        window.alert("Please choose an image under 500KB for optimal performance.");
        setIsSaving(false);
        return;
      }
      
      // Convert to base64
      imageUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(imageFile);
      });
    }

    const productData = {
      name: formData.get("name") as string,
      price: Number(formData.get("price")),
      category: formData.get("category") as string,
      stock: stockVal,
      image: imageUrl,
      status: statusVal,
      description: formData.get("description") as string,
      rating: Number(formData.get("rating")) || 0,
    };

    try {
      const url = editingProduct ? `/api/menu/${editingProduct.id}` : "/api/menu";
      const method = editingProduct ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData)
      });
      
      if (res.ok) {
        await fetchProducts();
        setIsModalOpen(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg = errData?.error || `Server error (${res.status}). Please try again.`;
        setSaveError(msg);
        console.error("Failed to save product:", msg);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Network error. Check your connection.";
      setSaveError(msg);
      console.error("Failed to save product:", error);
    } finally {
      setIsSaving(false);
    }
  };


  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      saveCategories([...categories, newCategoryName.trim()]);
    }
    setNewCategoryName("");
    setIsCategoryModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("menu.title", language)}</h1>
          <p className="text-muted-foreground mt-1">{t("menu.subtitle", language)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <motion.button
            onClick={() => setIsCategoryModalOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground font-semibold rounded-xl shadow-sm border border-border"
          >
            <Plus className="w-5 h-5" />
            {t("menu.addCategory", language)}
          </motion.button>

          <motion.button
            onClick={() => setIsReviewsModalOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-sm border border-amber-500/50"
          >
            <MessageSquare className="w-5 h-5" />
            {t("menu.clientReviews", language)}
          </motion.button>

          <motion.button
            onClick={handleAddNew}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25"
          >
            <Plus className="w-5 h-5" />
            {t("menu.addNewItem", language)}
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-sm w-full">
        <div className="flex overflow-x-auto w-full md:w-auto gap-2 pb-2 md:pb-0 no-scrollbar">
          {categories.map(category => (
            <div key={category} className="relative group">
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
                  onClick={(e) => handleDeleteCategory(category, e)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm"
                  title="Delete category"
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
            placeholder={t("menu.searchPlaceholder", language)}
          />
        </div>
      </div>

      {/* Grid view of products */}
      {filteredProducts.length === 0 ? (
         <div className="text-center py-12 text-muted-foreground">
           <p>{t("menu.noProductsFound", language)}</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((item, i) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                key={item.id}
                className="group bg-card border border-border rounded-2xl shadow-sm hover:border-primary/50 transition-colors flex flex-col relative"
              >
                <div className="h-48 bg-secondary/30 relative flex items-center justify-center overflow-hidden rounded-t-2xl">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      item.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    )}>
                      {item.status === 'active' ? t("menu.available", language) : t("menu.lowStock", language)}
                    </span>
                  </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-lg text-foreground truncate" title={item.name}>{item.name}</h3>
                    <div className="relative">
                      <button 
                        onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
                        className="text-muted-foreground hover:text-primary transition-colors p-1 -mr-2"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      
                      <AnimatePresence>
                        {openDropdownId === item.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 top-10 mt-2 w-40 bg-card border border-border shadow-xl rounded-xl z-50 overflow-hidden"
                          >
                            <button 
                              onClick={() => handleDuplicate(item)}
                              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                            >
                              {t("menu.duplicateItem", language)}
                            </button>
                            <button 
                              onClick={() => handleToggleStock(item)}
                              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                            >
                              {item.stock === 0 ? t("menu.markInStock", language) : t("menu.markOutOfStock", language)}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2 min-h-[32px]">
                    {item.description || "No description provided."}
                  </p>
                  
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md">
                      <Tag className="w-3 h-3" />
                      {item.category}
                    </span>
                    {item.rating !== undefined && item.rating > 0 && (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                        <Star className="w-3 h-3 fill-amber-500" />
                        {item.rating.toFixed(1)}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground font-medium ml-auto">
                      {t("menu.stock", language)}: {item.stock}
                    </span>
                  </div>
                  
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/50">
                    <span className="text-xl font-bold text-foreground">
                      {currency === "DZD " || currency === "AED " || currency === "SAR " ? `${item.price.toFixed(2)} ${currency}` : `${currency}${item.price.toFixed(2)}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Product Edit/Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-border overflow-hidden"
              >
                <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/10 shrink-0">
                  <h2 className="text-xl font-bold text-foreground">
                    {editingProduct ? t("menu.editProduct", language) : t("menu.addNewItem", language)}
                  </h2>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-secondary rounded-full transition-colors shrink-0"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
                
                <form onSubmit={handleSaveProduct} className="p-6 space-y-5 overflow-y-auto min-h-0">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("menu.productName", language)}</label>
                    <input
                      name="name"
                      required
                      defaultValue={editingProduct?.name || ""}
                      className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      placeholder="e.g. Truffle Pasta"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Description</label>
                    <textarea
                      name="description"
                      rows={2}
                      defaultValue={editingProduct?.description || ""}
                      className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
                      placeholder="Product description... (optional)"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t("menu.price", language)}</label>
                      <input
                        name="price"
                        type="number"
                        step="0.01"
                        required
                        defaultValue={editingProduct?.price || 0}
                        className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">{t("menu.stockQuantity", language)}</label>
                      <input
                        name="stock"
                        type="number"
                        required
                        defaultValue={editingProduct?.stock || 0}
                        className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Rating (0-5)</label>
                      <input
                        name="rating"
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        defaultValue={editingProduct?.rating || 0}
                        className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("menu.category", language)}</label>
                    <select 
                      name="category"
                      required
                      defaultValue={editingProduct?.category || categories[1] || "Mains"}
                      className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground appearance-none"
                    >
                      {categories.filter(c => c !== "All").map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("menu.productImage", language)}</label>
                    <div className="flex items-center gap-4">
                      {editingProduct?.image && (
                        <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0 border border-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <input
                        name="image"
                        type="file"
                        accept="image/*"
                        className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all font-medium text-sm text-muted-foreground"
                      />
                    </div>
                  </div>

                  {saveError && (
                    <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-3">
                      ⚠️ {saveError}
                    </div>
                  )}
                  <div className="pt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      disabled={isSaving}
                      className="px-5 py-2.5 rounded-xl text-foreground font-semibold hover:bg-secondary transition-colors disabled:opacity-50"
                    >
                      {t("common.cancel", language)}
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSaving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />}
                      {isSaving ? "Saving..." : editingProduct ? t("menu.saveChanges", language) : t("menu.addProduct", language)}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
              className="bg-card w-full max-w-sm max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-border overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/10 shrink-0">
                <h2 className="text-xl font-bold text-foreground">{t("menu.addCategory", language)}</h2>
                <button 
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="p-2 hover:bg-secondary rounded-full transition-colors shrink-0"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <form onSubmit={handleAddCategory} className="p-6 space-y-5 overflow-y-auto min-h-0">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">{t("menu.categoryName", language)}</label>
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    placeholder="e.g. Vegan Options"
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
      <AdminReviewsModal 
        isOpen={isReviewsModalOpen} 
        onClose={() => setIsReviewsModalOpen(false)} 
        language={language}
      />
    </div>
  );
}

function AdminReviewsModal({ isOpen, onClose, language }: { isOpen: boolean, onClose: () => void, language: Language }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchReviews();
    }
  }, [isOpen]);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reviews");
      if (res.ok) setReviews(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
      if (res.ok) {
        setReviews(reviews.filter(r => r.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReplySubmit = async (id: string) => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminReply: replyText })
      });
      if (res.ok) {
        const updated = await res.json();
        setReviews(reviews.map(r => r.id === id ? { ...r, adminReply: updated.adminReply } : r));
        setReplyingTo(null);
        setReplyText("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredReviews = reviews.filter(r => 
    r.menuItem?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (r.authorName && r.authorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.comment && r.comment.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" dir={isRTL(language as Language) ? "rtl" : "ltr"}>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-background border border-border w-full max-w-4xl flex flex-col rounded-3xl shadow-2xl overflow-hidden max-h-[90vh]"
          >
            <div className="p-5 border-b border-border flex justify-between items-center bg-card shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-primary" />
                  {t("reviews.title", language)}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">{t("reviews.subtitle", language)}</p>
              </div>
              <button type="button" onClick={onClose} className="p-2 glass rounded-full hover:bg-secondary">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="p-5 border-b border-border bg-secondary/30 shrink-0">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder={t("reviews.searchPlaceholder", language)} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <RefreshCcw className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : filteredReviews.length === 0 ? (
                <div className="text-center py-12 bg-card border border-border rounded-3xl">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">{t("reviews.noReviews", language)}</p>
                </div>
              ) : (
                filteredReviews.map(review => (
                  <motion.div layout key={review.id} className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-16 h-16 bg-secondary rounded-xl shrink-0 overflow-hidden border border-border/50 flex items-center justify-center">
                        {review.menuItem?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={review.menuItem.image} alt={review.menuItem.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground uppercase font-bold p-1 truncate max-w-full">{review.menuItem?.name}</span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-foreground">{review.menuItem?.name || t("reviews.unknownProduct", language)}</h3>
                              {review.menuItem?.category && <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-md font-bold">{review.menuItem.category}</span>}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-bold text-foreground/80">{review.authorName || t("reviews.anonymous", language)}</span>
                              <span>•</span>
                              <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-1 bg-amber-500/10 px-2 py-1 rounded-lg">
                            {[1, 2, 3, 4, 5].map(star => (
                               <Star key={star} className={`w-3 h-3 ${star <= review.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`} />
                            ))}
                          </div>
                        </div>
                        
                        {review.comment ? (
                          <p className="text-foreground/90 mt-2 text-sm leading-relaxed bg-secondary/20 p-3 rounded-xl border border-white/5">{review.comment}</p>
                        ) : (
                          <p className="text-muted-foreground mt-2 text-xs italic">{t("reviews.ratedOnly", language)}</p>
                        )}

                        {review.adminReply && (
                          <div className="mt-3 bg-primary/5 border border-primary/20 p-3 rounded-xl relative">
                            <div className="absolute -top-2.5 left-3 bg-background px-1.5 text-[9px] font-bold text-primary uppercase flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> {t("reviews.restaurantResponse", language)}
                            </div>
                            <p className="text-sm text-foreground/90 mt-1">{review.adminReply}</p>
                          </div>
                        )}

                        <div className="mt-3 flex gap-2 justify-end">
                          {!review.adminReply && replyingTo !== review.id && (
                            <button 
                              onClick={() => { setReplyingTo(review.id); setReplyText(""); }}
                              className="px-3 py-1.5 bg-secondary text-foreground text-xs font-bold rounded-lg hover:bg-secondary/80 flex items-center gap-1.5"
                            >
                              <Reply className="w-3 h-3" /> {t("reviews.reply", language)}
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(review.id)}
                            className="p-1.5 bg-red-500/10 text-red-500 text-xs font-bold rounded-lg hover:bg-red-500/20 flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {replyingTo === review.id && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3">
                            <textarea 
                              placeholder={t("reviews.typeResponse", language)} 
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              rows={2}
                              autoFocus
                              className="w-full px-3 py-2 bg-card border border-primary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none text-foreground"
                            />
                            <div className="flex gap-2 justify-end mt-2">
                              <button onClick={() => setReplyingTo(null)} className="px-3 py-1.5 text-muted-foreground hover:bg-secondary text-xs font-bold rounded-lg">
                                {t("common.cancel", language)}
                              </button>
                              <button 
                                onClick={() => handleReplySubmit(review.id)}
                                disabled={!replyText.trim() || isSubmitting}
                                className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg shadow-md hover:scale-105 transition-transform disabled:opacity-50"
                              >
                                {isSubmitting ? t("reviews.posting", language) : t("reviews.postReply", language)}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
