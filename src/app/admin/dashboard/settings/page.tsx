"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2, Save, Usb, Camera, RefreshCcw, CheckCircle2, Globe, Plus, Trash2, Star, Wifi } from "lucide-react";
import { useOrderStore } from "@/lib/store";
import { t, type Language } from "@/lib/i18n";

type PrinterEntry = {
  id: string;
  name: string;
  type: "kitchen" | "payment";
  ip: string | null;
  usbLabel: string | null;
  isDefault: boolean;
};

type SettingsData = {
  id: string;
  name: string;
  currency: string;
  address: string;
  logo: string | null;
  tablesCount: number;
  language: string;
  theme: string;
};

export default function SettingsPage() {
  const { currency, setCurrency, language, setLanguage, theme, setTheme, setRestaurantName, setRestaurantLogo } = useOrderStore();

  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("$");
  const [address, setAddress] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [tablesCount, setTablesCount] = useState(15);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("en");
  const [selectedTheme, setSelectedTheme] = useState("orange");
  // Printers state
  const [printers, setPrinters] = useState<PrinterEntry[]>([]);
  const [addingPrinter, setAddingPrinter] = useState<{ type: "kitchen" | "payment" } | null>(null);
  const [newPrinterName, setNewPrinterName] = useState("");
  const [newPrinterIp, setNewPrinterIp] = useState("");

  const logoInputRef = useRef<HTMLInputElement>(null);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data: SettingsData = await res.json();
          setSettings(data);
          setName(data.name);
          setSelectedCurrency(data.currency);
          setAddress(data.address);
          setLogo(data.logo);
          setTablesCount(data.tablesCount);
          setSelectedLanguage((data.language || "en") as Language);
          setSelectedTheme(data.theme || "orange");
          // Sync the global stores
          setCurrency(data.currency);
          setLanguage((data.language || "en") as Language);
          setTheme(data.theme || "orange");
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [setCurrency, setLanguage, setTheme]);

  const fetchPrinters = useCallback(async () => {
    try {
      const res = await fetch("/api/printers");
      if (res.ok) setPrinters(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchPrinters(); }, [fetchPrinters]);

  const handleAddPrinter = async () => {
    if (!addingPrinter || !newPrinterName.trim()) return;
    try {
      const res = await fetch("/api/printers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPrinterName.trim(), type: addingPrinter.type, ip: newPrinterIp.trim() || null }),
      });
      if (res.ok) {
        setAddingPrinter(null);
        setNewPrinterName("");
        setNewPrinterIp("");
        fetchPrinters();
      }
    } catch (e) { console.error(e); }
  };

  const handleDeletePrinter = async (id: string) => {
    try {
      await fetch(`/api/printers/${id}`, { method: "DELETE" });
      fetchPrinters();
    } catch (e) { console.error(e); }
  };

  const handleToggleDefault = async (printer: PrinterEntry) => {
    try {
      await fetch(`/api/printers/${printer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: !printer.isDefault }),
      });
      fetchPrinters();
    } catch (e) { console.error(e); }
  };

  const handleConnectUsb = async (printer: PrinterEntry) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      const label = device.productName || "USB Printer";
      await fetch(`/api/printers/${printer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usbLabel: label }),
      });
      fetchPrinters();
      alert(`Connected: ${label}`);
    } catch (e) { console.error("USB failed:", e); }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 500KB for base64 storage)
    if (file.size > 512000) {
      window.alert("Please choose an image under 500KB for optimal performance.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          currency: selectedCurrency,
          address,
          logo,
          tablesCount,
          language: selectedLanguage,
          theme: selectedTheme,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setCurrency(selectedCurrency);
        setLanguage(selectedLanguage);
        setTheme(selectedTheme);
        setRestaurantName(name);
        if (logo !== undefined) setRestaurantLogo(logo);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        window.alert("Failed to save settings. Please try again.");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      window.alert("Failed to save settings. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RefreshCcw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("settings.title", language)}</h1>
          <p className="text-muted-foreground mt-1">{t("settings.subtitle", language)}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {isSaving ? (
            <RefreshCcw className="w-5 h-5 animate-spin" />
          ) : saveSuccess ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isSaving ? t("common.saving", language) : saveSuccess ? t("common.saved", language) : t("common.save", language)}
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {/* Basic Information Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="md:col-span-2 rounded-2xl bg-card border border-border shadow-sm p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
               <Settings2 className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{t("settings.restaurantProfile", language)}</h2>
          </div>

          <div className="space-y-6">
            {/* Logo Upload Section */}
            <div className="flex items-center gap-6 pb-2 border-b border-border">
               <div
                 onClick={() => logoInputRef.current?.click()}
                 className="relative w-24 h-24 rounded-2xl bg-secondary border-2 border-dashed border-border flex items-center justify-center overflow-hidden group hover:border-primary/50 transition-colors cursor-pointer"
               >
                 {logo ? (
                   // eslint-disable-next-line @next/next/no-img-element
                   <img src={logo} alt="Restaurant Logo" className="w-full h-full object-cover" />
                 ) : (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground group-hover:bg-black/40 group-hover:text-white transition-all">
                      <Camera className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Logo</span>
                   </div>
                 )}
                 {logo && (
                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                     <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                   </div>
                 )}
                 <input
                   ref={logoInputRef}
                   type="file"
                   className="hidden"
                   accept="image/*"
                   onChange={handleLogoUpload}
                 />
               </div>
               <div>
                 <h3 className="font-bold text-foreground">{t("settings.restaurantLogo", language)}</h3>
                 <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                   {t("settings.logoDesc", language)}
                 </p>
                 {logo && (
                   <button
                     onClick={() => setLogo(null)}
                     className="text-xs text-destructive font-medium mt-2 hover:underline"
                   >
                     {t("settings.removeLogo", language)}
                   </button>
                 )}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">{t("settings.restaurantName", language)}</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("settings.enterRestaurantName", language)}
                />
              </div>
              <div className="space-y-2">
                 <label className="text-sm font-medium text-foreground ml-1">{t("settings.currency", language)}</label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground appearance-none"
                >
                  <option value="$">USD - US Dollar ($)</option>
                  <option value="€">EUR - Euro (€)</option>
                  <option value="£">GBP - British Pound (£)</option>
                  <option value="DZD ">DZD - Algerian Dinar</option>
                  <option value="CA$">CAD - Canadian Dollar (CA$)</option>
                  <option value="A$">AUD - Australian Dollar (A$)</option>
                  <option value="¥">JPY - Japanese Yen (¥)</option>
                  <option value="CN¥">CNY - Chinese Yuan (CN¥)</option>
                  <option value="₹">INR - Indian Rupee (₹)</option>
                  <option value="R$">BRL - Brazilian Real (R$)</option>
                  <option value="MAD ">MAD - Moroccan Dirham</option>
                  <option value="TND ">TND - Tunisian Dinar</option>
                  <option value="E£">EGP - Egyptian Pound (E£)</option>
                  <option value="AED ">AED - UAE Dirham</option>
                  <option value="SAR ">SAR - Saudi Riyal</option>
                  <option value="KWD ">KWD - Kuwaiti Dinar</option>
                  <option value="QAR ">QAR - Qatari Riyal</option>
                  <option value="BHD ">BHD - Bahraini Dinar</option>
                  <option value="OMR ">OMR - Omani Rial</option>
                  <option value="JOD ">JOD - Jordanian Dinar</option>
                  <option value="LBP ">LBP - Lebanese Pound</option>
                  <option value="₺">TRY - Turkish Lira (₺)</option>
                  <option value="₽">RUB - Russian Ruble (₽)</option>
                  <option value="R ">ZAR - South African Rand (R)</option>
                  <option value="₦">NGN - Nigerian Naira (₦)</option>
                  <option value="KES ">KES - Kenyan Shilling</option>
                  <option value="GHS ">GHS - Ghanaian Cedi</option>
                  <option value="FRw ">RWF - Rwandan Franc</option>
                  <option value="UGX ">UGX - Ugandan Shilling</option>
                  <option value="₱">PHP - Philippine Peso (₱)</option>
                  <option value="Rp ">IDR - Indonesian Rupiah</option>
                  <option value="RM ">MYR - Malaysian Ringgit</option>
                  <option value="฿">THB - Thai Baht (฿)</option>
                  <option value="₫">VND - Vietnamese Dong (₫)</option>
                  <option value="₩">KRW - South Korean Won (₩)</option>
                  <option value="CHF ">CHF - Swiss Franc</option>
                  <option value="kr ">SEK - Swedish Krona</option>
                  <option value="NZ$">NZD - New Zealand Dollar (NZ$)</option>
                  <option value="Mex$">MXN - Mexican Peso (Mex$)</option>
                  <option value="ARS ">ARS - Argentine Peso</option>
                  <option value="CLP ">CLP - Chilean Peso</option>
                  <option value="COP ">COP - Colombian Peso</option>
                  <option value="PEN ">PEN - Peruvian Sol</option>
                  <option value="UYU ">UYU - Uruguayan Peso</option>
                  <option value="VES ">VES - Venezuelan Bolívar</option>
                  <option value="BOB ">BOB - Bolivivian Boliviano</option>
                  <option value="PYG ">PYG - Paraguayan Guarani</option>
                  <option value="HK$">HKD - Hong Kong Dollar (HK$)</option>
                  <option value="NT$">TWD - New Taiwan Dollar (NT$)</option>
                  <option value="S$">SGD - Singapore Dollar (S$)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground ml-1">{t("settings.address", language)}</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("settings.enterAddress", language)}
              />
            </div>

            {/* Language Preference Section */}
            <div className="pt-4 border-t border-border mt-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-violet-500/10 rounded-lg">
                  <Globe className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{t("settings.language", language)}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("settings.languageDesc", language)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: "en" as Language, label: "settings.english", flag: "🇬🇧" },
                  { value: "fr" as Language, label: "settings.french", flag: "🇫🇷" },
                  { value: "ar" as Language, label: "settings.arabic", flag: "🇸🇦" },
                ] as const).map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => setSelectedLanguage(lang.value)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      selectedLanguage === lang.value
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/30 hover:bg-secondary/30"
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className={`text-sm font-semibold ${
                      selectedLanguage === lang.value ? "text-primary" : "text-foreground"
                    }`}>
                      {t(lang.label, language)}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3 italic">
                {language === "ar" ? "سيتم تطبيق اللغة المختارة على جميع صفحات لوحة الإدارة بعد الحفظ." :
                 language === "fr" ? "La langue sélectionnée sera appliquée à tout le panneau d'administration après la sauvegarde." :
                 "The selected language will be applied to the entire admin panel after saving."}
              </p>
            </div>

            {/* Theme Preference Section */}
            <div className="pt-4 border-t border-border mt-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <div className="w-5 h-5 rounded-full bg-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {language === "ar" ? "لون السمة" : language === "fr" ? "Couleur du Thème" : "Theme Color"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === "ar" ? "اختر اللون الأساسي لمطعمك" : language === "fr" ? "Choisissez une couleur principale pour votre restaurant" : "Select a primary color for your restaurant"}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {[
                  {
                    value: "orange",
                    label: "Ember",
                    gradient: "linear-gradient(135deg, #ffedd5 0%, #fed7aa 40%, #fdba74 100%)",
                    accent: "#f97316",
                    dark: "linear-gradient(135deg, #431407 0%, #1c0a03 100%)",
                  },
                  {
                    value: "cream",
                    label: "Parchment",
                    gradient: "linear-gradient(135deg, #fff8f0 0%, #f2ebe0 40%, #e8d5bd 100%)",
                    accent: "#9c6d40",
                    dark: "linear-gradient(135deg, #3d2b1a 0%, #15100b 100%)",
                  },
                  {
                    value: "blue",
                    label: "Sapphire",
                    gradient: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 40%, #93c5fd 100%)",
                    accent: "#3b5bdb",
                    dark: "linear-gradient(135deg, #1a2a6e 0%, #060c1f 100%)",
                  },
                  {
                    value: "green",
                    label: "Forest",
                    gradient: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 40%, #86efac 100%)",
                    accent: "#16a34a",
                    dark: "linear-gradient(135deg, #064e1e 0%, #030f07 100%)",
                  },
                  {
                    value: "red",
                    label: "Ruby",
                    gradient: "linear-gradient(135deg, #ffe4e6 0%, #fecdd3 40%, #fda4af 100%)",
                    accent: "#e11d48",
                    dark: "linear-gradient(135deg, #4c0e1b 0%, #0e0205 100%)",
                  },
                  {
                    value: "purple",
                    label: "Cosmic",
                    gradient: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 40%, #c4b5fd 100%)",
                    accent: "#7c3aed",
                    dark: "linear-gradient(135deg, #2e1065 0%, #08031a 100%)",
                  },
                  {
                    value: "rose",
                    label: "Rose Gold",
                    gradient: "linear-gradient(135deg, #fce7f3 0%, #fbcfe8 40%, #f9a8d4 100%)",
                    accent: "#db2777",
                    dark: "linear-gradient(135deg, #500926 0%, #0f0208 100%)",
                  },
                  {
                    value: "slate",
                    label: "Midnight",
                    gradient: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 40%, #cbd5e1 100%)",
                    accent: "#475569",
                    dark: "linear-gradient(135deg, #1e293b 0%, #030712 100%)",
                  },
                ].map((th) => {
                  const isSelected = selectedTheme === th.value;
                  return (
                    <button
                      key={th.value}
                      onClick={() => { setSelectedTheme(th.value); setTheme(th.value); }}
                      className={`relative flex flex-col overflow-hidden rounded-2xl border-2 transition-all duration-200 ${
                        isSelected
                          ? "border-primary shadow-lg shadow-primary/25 scale-[1.03]"
                          : "border-border hover:border-primary/40 hover:scale-[1.01]"
                      }`}
                    >
                      {/* Gradient preview */}
                      <div
                        className="h-14 w-full"
                        style={{ background: th.gradient }}
                      >
                        <div className="w-full h-full flex items-center justify-center gap-1.5 opacity-80">
                          <div className="w-3 h-3 rounded-full" style={{ background: th.accent }} />
                          <div className="w-5 h-2 rounded-full opacity-50" style={{ background: th.accent }} />
                        </div>
                      </div>
                      {/* Dark strip preview */}
                      <div
                        className="h-5 w-full"
                        style={{ background: th.dark }}
                      />
                      {/* Label */}
                      <div className={`px-2 py-2 text-center ${isSelected ? "bg-primary/10" : "bg-card"}`}>
                        <span className={`text-xs font-bold ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                          {th.label}
                        </span>
                        {isSelected && (
                          <span className="ml-1.5 text-[10px] font-bold text-primary">✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="pt-4 border-t border-border mt-4">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{t("settings.printerIntegration", language)}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === "ar" ? "أضف طابعات غير محدودة لكل محطة دفع أو مطبخ" : language === "fr" ? "Ajoutez autant d'imprimantes que nécessaire par station" : "Add unlimited printers per payment station or kitchen"}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">WebUSB</span>
              </div>

              {(["payment", "kitchen"] as const).map((printerType) => {
                const isPayment = printerType === "payment";
                const accent = isPayment ? "blue" : "orange";
                const typeLabel = language === "ar"
                  ? (isPayment ? "محطات الدفع" : "مطابخ")
                  : language === "fr"
                  ? (isPayment ? "Stations Paiement" : "Cuisines")
                  : (isPayment ? "Payment Stations" : "Kitchens");
                const filtered = printers.filter((p) => p.type === printerType);

                return (
                  <div key={printerType} className="mb-5">
                    <div className={`flex items-center justify-between mb-3`}>
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 bg-${accent}-500/10 rounded-lg`}>
                          <Usb className={`w-4 h-4 text-${accent}-500`} />
                        </div>
                        <span className="text-sm font-bold text-foreground">{typeLabel}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-${accent}-500/10 text-${accent}-500 font-medium`}>
                          {filtered.length} {language === "ar" ? "طابعة" : language === "fr" ? "imprimante(s)" : "printer(s)"}
                        </span>
                      </div>
                      <button
                        onClick={() => { setAddingPrinter({ type: printerType }); setNewPrinterName(""); setNewPrinterIp(""); }}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-${accent}-500/10 hover:bg-${accent}-500/20 text-${accent}-500 transition-colors border border-${accent}-500/20`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {language === "ar" ? "إضافة طابعة" : language === "fr" ? "Ajouter" : "Add Printer"}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <AnimatePresence>
                        {filtered.map((printer) => (
                          <motion.div
                            key={printer.id}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-border bg-secondary/20"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-foreground truncate">{printer.name}</p>
                                {printer.isDefault && (
                                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Default</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {printer.usbLabel ? (
                                  <span className="flex items-center gap-1"><Usb className="w-3 h-3" />{printer.usbLabel}</span>
                                ) : printer.ip ? (
                                  <span className="flex items-center gap-1"><Wifi className="w-3 h-3" />{printer.ip}</span>
                                ) : (
                                  <span className="italic opacity-60">{language === "ar" ? "لم يُضف عنوان بعد" : language === "fr" ? "Aucun IP/USB configuré" : "No IP/USB configured yet"}</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                              <button
                                onClick={() => handleConnectUsb(printer)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors border border-border"
                              >
                                <Usb className="w-3.5 h-3.5" />
                                {language === "ar" ? "اكتشاف USB" : language === "fr" ? "Détecter USB" : "Detect USB"}
                              </button>
                              <button
                                onClick={() => handleToggleDefault(printer)}
                                title="Set as default"
                                className={`p-1.5 rounded-lg border transition-colors ${printer.isDefault ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary hover:bg-secondary/70 text-muted-foreground border-border"}`}
                              >
                                <Star className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePrinter(printer.id)}
                                title="Remove"
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </motion.div>
                        ))}

                        {addingPrinter?.type === printerType && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className={`p-3 rounded-xl border-2 border-dashed border-${accent}-500/40 bg-${accent}-500/5 space-y-2`}
                          >
                            <input
                              autoFocus
                              type="text"
                              className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground"
                              placeholder={language === "ar" ? "اسم الطابعة (مثل: مطبخ رئيسي)" : language === "fr" ? "Nom (ex: Cuisine principale)" : "Printer name (e.g. Main Kitchen)"}
                              value={newPrinterName}
                              onChange={(e) => setNewPrinterName(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleAddPrinter()}
                            />
                            <input
                              type="text"
                              className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground"
                              placeholder="IP address (optional, e.g. 192.168.1.101)"
                              value={newPrinterIp}
                              onChange={(e) => setNewPrinterIp(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleAddPrinter()}
                            />
                            <div className="flex flex-col sm:flex-row gap-2 pt-1">
                              <button onClick={handleAddPrinter} className="flex-1 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                                {language === "ar" ? "إضافة (يدوي/شبكة)" : language === "fr" ? "Ajouter (Manuel/IP)" : "Add (Manual / IP)"}
                              </button>
                              
                              <button 
                                onClick={async () => {
                                  try {
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const device = await (navigator as any).usb.requestDevice({ filters: [] });
                                    const label = device.productName || "USB Printer";
                                    
                                    const res = await fetch("/api/printers", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ name: newPrinterName.trim() || label, type: printerType, usbLabel: label }),
                                    });
                                    if (res.ok) {
                                      setAddingPrinter(null); setNewPrinterName(""); setNewPrinterIp("");
                                      fetchPrinters(); alert(`Successfully added USB Printer: ${label}`);
                                    }
                                  } catch (err) { console.error("USB failed:", err); }
                                }}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg bg-${accent}-500 text-white hover:opacity-90 shadow-lg shadow-${accent}-500/20 transition-all`}
                              >
                                <Usb className="w-4 h-4" />
                                {language === "ar" ? "اكتشاف USB ذكي وإضافة" : language === "fr" ? "Détection USB et Ajout" : "Smart Detect USB & Add"}
                              </button>

                              <button onClick={() => setAddingPrinter(null)} className="px-4 py-2 text-xs font-bold rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/70 transition-colors">
                                {language === "ar" ? "إلغاء" : language === "fr" ? "Annuler" : "Cancel"}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {filtered.length === 0 && !addingPrinter && (
                        <p className="text-xs text-muted-foreground italic text-center py-3">
                          {language === "ar" ? "لا توجد طابعات — اضغط إضافة طابعة" : language === "fr" ? "Aucune imprimante — cliquez Ajouter" : "No printers yet — click Add Printer above"}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </motion.div>
        
        {/* Table/QR Management */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2, duration: 0.5 }}
           className="flex flex-col gap-6"
        >
          <div className="rounded-2xl bg-card border border-border shadow-sm p-6 relative overflow-hidden">
            <h2 className="text-xl font-bold text-foreground mb-4">{t("settings.tableManagement", language)}</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground ml-1">{t("settings.numberOfTables", language)}</label>
               <input
                  type="number"
                  min="1"
                  max="100"
                  className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground"
                  value={tablesCount}
                  onChange={(e) => setTablesCount(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <p className="text-xs text-muted-foreground pt-2">{t("settings.tablesDesc", language)}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
