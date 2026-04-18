"use client";

import { motion } from "framer-motion";
import { ArrowRight, LogIn } from "lucide-react";
import Link from "next/link";
import { useOrderStore } from "@/lib/store";
import { useEffect } from "react";
import { isRTL, type Language } from "@/lib/i18n";

export default function IndexPage() {
  const { language, setLanguage, restaurantName, setRestaurantName, restaurantLogo, setRestaurantLogo, setTheme } = useOrderStore();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.language) setLanguage(data.language as Language);
          if (data.name) setRestaurantName(data.name);
          if (data.logo !== undefined) setRestaurantLogo(data.logo);
          if (data.theme) setTheme(data.theme);
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    };
    loadSettings();
  }, [setLanguage, setRestaurantName, setRestaurantLogo, setTheme]);

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden"
      dir={isRTL(language) ? "rtl" : "ltr"}
    >
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 h-72 w-72 md:h-[28rem] md:w-[28rem] bg-primary/10 blur-[100px] rounded-full" />
        <div className="absolute -bottom-28 -right-24 h-80 w-80 md:h-[30rem] md:w-[30rem] bg-accent/20 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-lg p-8 sm:p-12 glass rounded-3xl shadow-2xl z-10 mx-4 border border-white/10 text-center flex flex-col items-center"
      >
        <div className="relative mb-8">
          <div className="absolute -inset-4 -z-10 rounded-full bg-primary/20 blur-2xl" />
          {restaurantLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={restaurantLogo} alt="Logo" className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-xl border border-white/10" />
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-primary/20 rounded-2xl flex items-center justify-center shadow-xl border border-primary/20">
              <span className="text-4xl font-bold text-primary">
                {restaurantName ? restaurantName.charAt(0).toUpperCase() : "Q"}
              </span>
            </div>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
          {restaurantName || "Daily Dose Portal"}
        </h1>
        <p className="text-muted-foreground mb-10 text-balance text-sm sm:text-base max-w-sm mx-auto">
          Welcome to the restaurant management portal. Access your dashboard or configure your platform.
        </p>

        <Link href="/admin/login" className="w-full group">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-3 w-full py-4 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 transition-all text-lg"
          >
            <LogIn className="w-5 h-5" />
            <span>Login / Register</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-1" />
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
}
