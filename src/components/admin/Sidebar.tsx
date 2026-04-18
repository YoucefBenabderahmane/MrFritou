"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  UtensilsCrossed,
  PackageSearch,
  Users,
  PieChart,
  ChevronLeft,
  Menu,
  QrCode,
  ClipboardList
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrderStore } from "@/lib/store";
import { t, isRTL } from "@/lib/i18n";

export function Sidebar() {
  const pathname = usePathname();
  const { language, restaurantName, restaurantLogo, currentUser } = useOrderStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  let NAV_ITEMS = [
    { href: "/admin/dashboard", icon: LayoutDashboard, labelKey: "nav.liveDashboard" },
    { href: "/admin/dashboard/orders", icon: ClipboardList, labelKey: "nav.orderManagement" },
    { href: "/admin/dashboard/qr", icon: QrCode, labelKey: "nav.tablesQr" },
    { href: "/admin/dashboard/menu", icon: UtensilsCrossed, labelKey: "nav.menuManagement" },
    { href: "/admin/dashboard/stock", icon: PackageSearch, labelKey: "nav.stockGoods" },
    { href: "/admin/dashboard/employees", icon: Users, labelKey: "nav.workersPayroll" },
    { href: "/admin/dashboard/financials", icon: PieChart, labelKey: "nav.financialReports" },
    { href: "/admin/dashboard/users", icon: Users, labelKey: "nav.users" }
  ];

  if (currentUser?.role === "waiter") {
    NAV_ITEMS = NAV_ITEMS.filter(i =>
      ["/admin/dashboard", "/admin/dashboard/orders"].includes(i.href)
    );
  } else if (currentUser?.role !== "admin") {
    // manager and any other non-admin role
    NAV_ITEMS = NAV_ITEMS.filter(i =>
      ["/admin/dashboard", "/admin/dashboard/orders", "/admin/dashboard/menu", "/admin/dashboard/stock"].includes(i.href)
    );
  }

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

  const renderNavContent = () => (
    <>
      <div className={cn("flex items-center justify-between mb-8", isCollapsed ? "justify-center" : "px-4")}>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 max-w-[180px] overflow-hidden"
          >
            {restaurantLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurantLogo} alt="Logo" className="w-8 h-8 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-5 h-5 text-primary" />
              </div>
            )}
            <span className="font-bold text-lg text-foreground tracking-tight truncate" title={restaurantName}>
              {restaurantName}
            </span>
          </motion.div>
        )}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
        >
          <ChevronLeft className={cn(
            "w-5 h-5 transition-transform duration-300", 
            isRTL(language) 
              ? (isCollapsed ? "rotate-0" : "rotate-180")
              : (isCollapsed ? "rotate-180" : "rotate-0")
          )} />
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-2 relative">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-3 w-full">
                <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "group-hover:text-foreground")} />
                {!isCollapsed && (
                  <span className={cn("font-medium text-sm transition-colors", isActive ? "text-primary font-bold" : "group-hover:text-foreground")}>
                    {t(item.labelKey, language)}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile top bar trigger */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-lg border-b border-border z-40 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          {restaurantLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
             <img src={restaurantLogo} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
          ) : (
             <UtensilsCrossed className="w-6 h-6 text-primary" />
          )}
          <span className="font-bold text-lg truncate max-w-[150px]">{restaurantName || "DAILY DOSE"}</span>
        </div>
        <button onClick={toggleMobile} className="p-2 bg-secondary rounded-lg">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? "80px" : "260px" }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className={cn(
          "hidden md:flex flex-col fixed inset-y-0 z-50 bg-card p-4 shadow-xl shadow-black/5",
          isRTL(language) ? "right-0 border-l border-border" : "left-0 border-r border-border"
        )}
      >
        {renderNavContent()}
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleMobile}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: isRTL(language) ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: isRTL(language) ? "100%" : "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className={cn(
                "fixed inset-y-0 w-[260px] z-50 bg-card p-4 shadow-2xl flex flex-col md:hidden",
                isRTL(language) ? "right-0 border-l border-border" : "left-0 border-r border-border"
              )}
            >
              {renderNavContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
