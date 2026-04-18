"use client";

import { Bell, Search, User, X, Moon, Sun, Settings, LogOut, ChevronRight, UserCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { useOrderStore } from "@/lib/store";
import { t, type Language } from "@/lib/i18n";
import Link from "next/link";

type OrderNotification = {
  id: string;
  orderNum: string;
  table: string;
  type: string;
  time: string;
  itemCount: number;
  total: number;
};

// Global audio context so we can resume it on interaction
let globalAudioCtx: any = null;

function initAudio() {
  if (!globalAudioCtx && typeof window !== "undefined") {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      globalAudioCtx = new AudioCtx();
    }
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("click", () => {
    if (globalAudioCtx && globalAudioCtx.state === "suspended") {
      globalAudioCtx.resume();
    }
  }, { once: false, passive: true });
}

function playNotificationSound() {
  try {
    initAudio();
    if (!globalAudioCtx) return;
    if (globalAudioCtx.state === "suspended") globalAudioCtx.resume();
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = globalAudioCtx.createOscillator();
      const gain = globalAudioCtx.createGain();
      osc.connect(gain);
      gain.connect(globalAudioCtx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, globalAudioCtx.currentTime + startTime);
      gain.gain.setValueAtTime(0.5, globalAudioCtx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, globalAudioCtx.currentTime + startTime + duration);
      osc.start(globalAudioCtx.currentTime + startTime);
      osc.stop(globalAudioCtx.currentTime + startTime + duration);
    };
    playTone(987.77, 0, 0.15);
    playTone(1318.51, 0.15, 0.4);
    setTimeout(() => {
      playTone(987.77, 0, 0.15);
      playTone(1318.51, 0.15, 0.4);
    }, 800);
  } catch (e) {
    console.warn("Could not play notification sound:", e);
  }
}

export function Topbar() {
  const router = useRouter();
  const { language, currency, currentUser, setCurrentUser, isDarkMode, toggleDarkMode } = useOrderStore();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [hasNew, setHasNew] = useState(false);
  const lastOrderCountRef = useRef(0);
  const initialLoadRef = useRef(true);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const lastSoundTimeRef = useRef(0);

  const fetchRecentOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        const pending = data
          .filter((o: any) => (o.status?.toLowerCase() || "") === "pending")
          .slice(0, 10)
          .map((o: any) => ({
            id: o.id,
            orderNum: o.orderNum,
            table: o.table,
            type: o.type,
            time: new Date(o.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            itemCount: o.items.reduce((a: number, i: any) => a + i.quantity, 0),
            total: o.items.reduce((a: number, i: any) => a + i.price * i.quantity, 0),
          }));

        setNotifications(pending);
        const now = Date.now();
        if (!initialLoadRef.current && pending.length > lastOrderCountRef.current) {
          playNotificationSound();
          setHasNew(true);
          lastSoundTimeRef.current = now;
        } else if (!initialLoadRef.current && pending.length > 0 && now - lastSoundTimeRef.current >= 30000) {
          playNotificationSound();
          lastSoundTimeRef.current = now;
        }
        lastOrderCountRef.current = pending.length;
        initialLoadRef.current = false;
      }
    } catch (e) {
      console.error("Notification fetch error:", e);
    }
  }, []);

  useEffect(() => {
    fetchRecentOrders();
    const interval = setInterval(fetchRecentOrders, 3000);
    return () => clearInterval(interval);
  }, [fetchRecentOrders]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userSession");
    setCurrentUser(null);
    router.push("/admin/login");
  };

  const formatCurrency = (val: number) =>
    currency === "DZD " || currency === "AED " || currency === "SAR "
      ? `${val.toFixed(2)} ${currency}`
      : `${currency}${val.toFixed(2)}`;

  const initials = (currentUser?.username || "?").charAt(0).toUpperCase();

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-card border-b border-border shadow-sm sticky top-0 z-30">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            className="w-full ps-10 pe-4 py-2 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/50 text-foreground"
            placeholder={t("topbar.searchPlaceholder", language)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 ms-4">
        {/* Dark Mode Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleDarkMode}
          className="p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
          title="Toggle Dark Mode"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </motion.button>

        {/* Notification Bell */}
        <div ref={notifRef} className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setIsNotifOpen(!isNotifOpen); setHasNew(false); }}
            className="relative p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
          >
            <Bell className="w-5 h-5" />
            {(hasNew || notifications.length > 0) && (
              <span className={`absolute top-1 end-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full ${
                hasNew ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-primary text-primary-foreground"
              }`}>
                {notifications.length}
              </span>
            )}
          </motion.button>

          <AnimatePresence>
            {isNotifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full end-0 mt-2 w-96 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/20">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-foreground text-sm">{t("notifications.title", language)}</h3>
                  </div>
                  <button onClick={() => setIsNotifOpen(false)} className="p-1 hover:bg-secondary rounded-lg transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-12 px-4 text-center">
                      <Bell className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">{t("notifications.noNotifications", language)}</p>
                    </div>
                  ) : (
                    notifications.map((notif, i) => (
                      <motion.button
                        key={notif.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => { setIsNotifOpen(false); router.push("/admin/dashboard/orders"); }}
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/40 transition-colors text-left border-b border-border/30 last:border-0 group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <span className="text-sm font-black text-primary">#{notif.orderNum}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">{t("notifications.orderFrom", language)} {notif.table}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">{notif.type}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{notif.itemCount} {t("orders.items", language).toLowerCase()}</span>
                            <span className="text-xs text-border">•</span>
                            <span className="text-xs font-bold text-primary">{formatCurrency(notif.total)}</span>
                            <span className="text-xs text-border">•</span>
                            <span className="text-xs text-muted-foreground">{notif.time}</span>
                          </div>
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="px-5 py-3 border-t border-border bg-secondary/10">
                    <button onClick={() => { setIsNotifOpen(false); router.push("/admin/dashboard/orders"); }}
                      className="w-full py-2 text-sm font-bold text-primary hover:bg-primary/10 rounded-xl transition-colors">
                      {t("orders.title", language)} →
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-8 w-px bg-border mx-1" />

        {/* Profile Avatar + Dropdown */}
        <div ref={profileRef} className="relative">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsProfileOpen(!isProfileOpen)}>
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-foreground leading-none">{currentUser?.username || "Guest"}</span>
              <span className={`text-xs mt-1 font-bold capitalize px-1.5 py-px rounded-full ${
                currentUser?.role === "admin" ? "text-primary bg-primary/10" :
                currentUser?.role === "waiter" ? "text-emerald-500 bg-emerald-500/10" :
                "text-blue-500 bg-blue-500/10"
              }`}>
                {currentUser?.role || ""}
              </span>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden text-white font-bold text-sm select-none"
            >
              {currentUser?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{(currentUser?.username || "?").charAt(0).toUpperCase()}</span>
              )}
            </motion.div>
          </div>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="absolute top-full end-0 mt-2 w-72 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
              >
                {/* Profile Header */}
                <div className="px-4 py-4 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-white font-bold text-lg shadow-lg overflow-hidden">
                      {currentUser?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span>{(currentUser?.username || "?").charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{currentUser?.username}</p>
                      {currentUser?.email && (
                        <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                      )}
                      <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full inline-block mt-1 ${
                        currentUser?.role === "admin" ? "bg-primary/15 text-primary" :
                        currentUser?.role === "waiter" ? "bg-emerald-500/15 text-emerald-500" :
                        "bg-blue-500/15 text-blue-500"
                      }`}>
                        {currentUser?.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="p-2">
                  <button
                    onClick={() => { setIsProfileOpen(false); router.push("/admin/dashboard/profile"); }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-foreground transition-colors text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <UserCircle className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium">My Profile</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>

                  {currentUser?.role === "admin" && (
                    <Link
                      href="/admin/dashboard/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-foreground transition-colors text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          <Settings className="w-4 h-4 text-violet-500" />
                        </div>
                        <span className="font-medium">{t("nav.settings", language)}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  )}

                  <div className="my-1.5 h-px bg-border mx-2" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-destructive/10 text-destructive transition-colors text-sm"
                  >
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <LogOut className="w-4 h-4 text-destructive" />
                    </div>
                    <span className="font-medium">{t("nav.logout", language)}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
