"use client";

import { motion } from "framer-motion";
import { ArrowRight, Utensils, QrCode, ChefHat } from "lucide-react";
import Link from "next/link";
import { useOrderStore } from "@/lib/store";
import { t, isRTL, type Language } from "@/lib/i18n";
import { useEffect, type ReactNode } from "react";

export default function Home() {
  const { language, setLanguage, setCurrency, restaurantName, setRestaurantName, restaurantLogo, setRestaurantLogo, restaurantAddress, setRestaurantAddress, setTheme } = useOrderStore();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.language) setLanguage(data.language as Language);
          if (data.currency) setCurrency(data.currency);
          if (data.name) setRestaurantName(data.name);
          if (data.address) setRestaurantAddress(data.address);
          if (data.logo !== undefined) setRestaurantLogo(data.logo);
          if (data.theme) setTheme(data.theme);
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    };
    loadSettings();
  }, [setLanguage, setCurrency, setRestaurantAddress, setRestaurantLogo, setRestaurantName, setTheme]);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const cardsContainer = {
    hidden: {},
    show: {
      transition: prefersReducedMotion
        ? { duration: 0 }
        : { staggerChildren: 0.12, delayChildren: 0.08 },
    },
  };

  const cardVariant = {
    hidden: prefersReducedMotion
      ? { opacity: 1, y: 0, filter: "blur(0px)" }
      : { opacity: 0, y: 24, filter: "blur(6px)" },
    show: prefersReducedMotion
      ? { opacity: 1, y: 0, filter: "blur(0px)" }
      : {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
        },
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-background"
      dir={isRTL(language) ? "rtl" : "ltr"}
    >
      <div className={isRTL(language) ? "absolute top-4 left-4 sm:top-6 sm:left-6 z-50" : "absolute top-4 right-4 sm:top-6 sm:right-6 z-50"}>
        <button 
          onClick={() => setLanguage(language === "en" ? "fr" : language === "fr" ? "ar" : "en")}
          className="h-10 px-4 rounded-full glass flex items-center justify-center font-bold text-sm hover:bg-secondary/50 transition-colors shadow-lg border border-border/50 text-foreground bg-background/50 backdrop-blur-md whitespace-nowrap"
        >
          {language === "en" ? t("customer.langNameFr", language) : language === "fr" ? t("customer.langNameAr", language) : t("customer.langName", language)}
        </button>
      </div>
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 md:h-[28rem] md:w-[28rem] bg-primary/20 blur-[110px] rounded-full" />
        <div className="absolute -bottom-28 -right-24 h-80 w-80 md:h-[30rem] md:w-[30rem] bg-accent/25 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-40 w-[28rem] max-w-[90vw] bg-primary/10 blur-[120px] rounded-full" />
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6">
        {/* Hero */}
        <section className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center py-14 sm:py-16 md:py-20">
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.75, ease: "easeOut" }}
            className="w-full text-center"
          >
            <div className="mx-auto flex max-w-3xl flex-col items-center">
              <div className="relative mb-7">
                <div className="absolute -inset-3 -z-10 rounded-full bg-primary/10 blur-2xl" />
                {restaurantLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <motion.img
                    src={restaurantLogo}
                    alt={restaurantName}
                    className="h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36 rounded-full object-cover shadow-2xl border border-white/10 glass"
                    initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.45, ease: "easeOut" }}
                  />
                ) : (
                  <motion.div
                    initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.45, ease: "easeOut" }}
                    className="h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36 rounded-full shadow-2xl border border-white/10 glass bg-primary/10 flex items-center justify-center p-6"
                  >
                    <Utensils className="h-full w-full text-primary" />
                  </motion.div>
                )}
              </div>

              <motion.div
                initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.12, duration: 0.5 }}
                className="mb-5 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium text-primary"
              >
                <ChefHat className="h-4 w-4" />
                <span className="truncate max-w-[80vw]">{restaurantName || "Daily Dose"}</span>
              </motion.div>

              <h1 className="text-balance text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground">
                   {restaurantName || "Daily Dose"}
              </h1>

              <p className="mt-5 text-pretty text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl">
                {restaurantAddress?.trim()
                  ? restaurantAddress
                  : t("landing.description", language)}
              </p>

              <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
                <Link href="/menu?type=takeaway" className="group w-full sm:w-auto">
                  <div className="relative inline-flex w-full sm:w-auto items-center justify-center gap-2 px-7 sm:px-9 py-4 bg-primary text-primary-foreground rounded-full text-base sm:text-lg font-semibold overflow-hidden transition-transform transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-primary/30">
                    <Utensils className="w-5 h-5" />
                    {t("landing.orderTakeaway", language)}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-1" />
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Services / Feature cards */}
        <section className="pb-16 sm:pb-20 md:pb-24">
          <div className="mx-auto max-w-5xl">
            <motion.div
              variants={cardsContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-15% 0px -15% 0px" }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            >
              <FeatureCard
                variants={cardVariant}
                icon={<QrCode className="w-6 h-6 text-primary" />}
                title={t("landing.feature1Title", language)}
                description={t("landing.feature1Desc", language)}
              />
              <FeatureCard
                variants={cardVariant}
                icon={<Utensils className="w-6 h-6 text-primary" />}
                title={t("landing.feature2Title", language)}
                description={t("landing.feature2Desc", language)}
              />
              <FeatureCard
                variants={cardVariant}
                icon={<ArrowRight className="w-6 h-6 text-primary" />}
                title={t("landing.feature3Title", language)}
                description={t("landing.feature3Desc", language)}
              />
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  variants,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  variants: Parameters<typeof motion.div>[0]["variants"];
}) {
  return (
    <motion.div
      variants={variants}
      className="group glass p-5 sm:p-6 rounded-2xl flex flex-col items-start gap-4 border border-white/10 hover:bg-background/40 transition-colors"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        {icon}
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-foreground">{title}</h3>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}
