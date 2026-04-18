"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  TrendingUp,
  Clock,
  RefreshCcw,
  Receipt
} from "lucide-react";
import Link from "next/link";
import { useOrderStore } from "@/lib/store";
import { t } from "@/lib/i18n";

export default function DashboardOverview() {
  const { currency, language, currentUser } = useOrderStore();
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats for the current month
      const statsRes = await fetch("/api/reports/stats?range=month");
      const ordersRes = await fetch("/api/orders");
      
      if (statsRes.ok && ordersRes.ok) {
        const statsData = await statsRes.json();
        const ordersData = await ordersRes.json();
        
        setStats(statsData.summary);
        
        // Count pending orders
        const pending = ordersData.filter((o: any) => o.status === 'pending' || o.status === 'preparing');
        setPendingCount(pending.length);

        // Map recent orders and take last 5
        setRecentOrders(ordersData.slice(0, 5).map((o: any) => ({
          id: `#${o.orderNum}`,
          table: o.table,
          items: o.items.reduce((acc: number, item: any) => acc + item.quantity, 0),
          total: o.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0),
          status: o.status,
          time: new Date(o.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statCards = [
    { 
      label: t("dashboard.monthlyRevenue", language), 
      value: stats?.totalRevenue || 0, 
      change: "+12.5%", // Simulated for now, could be calcualted vs last month
      positive: true, 
      icon: DollarSign,
      isCurrency: true
    },
    { 
      label: t("dashboard.monthlyOrders", language), 
      value: stats?.orderCount || 0, 
      change: "+5.2%", 
      positive: true, 
      icon: ShoppingBag,
      isCurrency: false
    },
    { 
      label: t("dashboard.monthlyExpenses", language), 
      value: stats?.totalExpenses || 0, 
      change: "-1", 
      positive: false, 
      icon: Receipt,
      isCurrency: true
    },
    { 
      label: t("dashboard.pureProfit", language), 
      value: stats?.pureProfit || 0, 
      change: "+4.1%", 
      positive: true, 
      icon: TrendingUp,
      isCurrency: true
    },
  ];

  const formatValue = (val: number, isCurrency = true) => {
    if (!isCurrency) return val.toLocaleString();
    return currency === "DZD " || currency === "AED " || currency === "SAR " 
      ? `${val.toLocaleString()} ${currency}` 
      : `${currency}${val.toLocaleString()}`;
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("dashboard.title", language)}</h1>
          <p className="text-muted-foreground mt-1">{t("dashboard.subtitle", language)}</p>
        </div>
      </div>

      {/* Stats Grid - Admin Only */}
      {currentUser?.role === "admin" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col hover:border-primary/50 transition-colors cursor-default"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${stat.positive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                  {stat.positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {stat.change}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-1">
                {formatValue(stat.value, stat.isCurrency)}
              </h3>
              <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div className="p-6 rounded-2xl bg-card border border-border flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">{t("nav.orderManagement", language)}</p>
              <h3 className="text-3xl font-bold">{recentOrders.length + pendingCount}</h3>
            </div>
            <div className="p-4 bg-primary/10 rounded-xl"><ShoppingBag className="w-6 h-6 text-primary" /></div>
          </motion.div>
          
          <motion.div className="p-6 rounded-2xl bg-card border border-border flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Pending Processing</p>
              <h3 className="text-3xl font-bold text-amber-500">{pendingCount}</h3>
            </div>
            <div className="p-4 bg-amber-500/10 rounded-xl"><Clock className="w-6 h-6 text-amber-500" /></div>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        {/* Recent Orders Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="lg:col-span-2 rounded-2xl bg-card border border-border shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">{t("dashboard.recentOrders", language)}</h2>
            <Link href="/admin/dashboard/orders" className="text-sm text-primary font-medium hover:underline">{t("dashboard.viewAll", language)}</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground text-sm font-medium">
                  <th className="pb-3 px-4 ps-0">{t("orders.orderId", language)}</th>
                  <th className="pb-3 px-4">{t("orders.destination", language)}</th>
                  <th className="pb-3 px-4 text-center">{t("orders.items", language)}</th>
                  <th className="pb-3 px-4">{t("orders.amount", language)}</th>
                  <th className="pb-3 px-4">{t("common.status", language)}</th>
                  <th className="pb-3 px-4 text-right pe-0">{t("orders.time", language)}</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, i) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="border-b border-border/20 last:border-0 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="py-4 font-medium text-foreground">{order.id}</td>
                    <td className="py-4 px-4 text-muted-foreground font-medium">{order.table}</td>
                    <td className="py-4 px-4 text-center text-muted-foreground">{order.items}</td>
                    <td className="py-4 px-4 font-semibold text-foreground">
                      {formatValue(order.total)}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize
                        ${order.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                          order.status === 'preparing' ? 'bg-primary/10 text-primary border border-primary/20' : 
                          order.status === 'ready' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                          'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}
                      >
                        {t(`orders.${order.status}`, language)}
                      </span>
                    </td>
                    <td className="py-4 text-right text-muted-foreground text-sm flex items-center justify-end gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {order.time}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Quick Actions / Alerts */}
        {currentUser?.role === "admin" && (
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.6, duration: 0.5 }}
             className="flex flex-col gap-6"
          >
            <div className="rounded-2xl bg-card border border-border shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] rounded-full" />
              <h2 className="text-xl font-bold text-foreground mb-4">{t("dashboard.financialHealth", language)}</h2>
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col gap-1">
                  <span className="text-xs font-bold text-emerald-600 uppercase">{t("dashboard.monthlyProfitLabel", language)}</span>
                  <span className="text-2xl font-black text-emerald-700">{formatValue(stats?.pureProfit || 0)}</span>
                </div>
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col gap-1">
                  <span className="text-xs font-bold text-amber-600 uppercase">{t("dashboard.monthlyExpensesLabel", language)}</span>
                  <span className="text-2xl font-black text-amber-700">{formatValue(stats?.totalExpenses || 0)}</span>
                </div>
                <Link 
                  href="/admin/dashboard/financials"
                  className="w-full py-3 bg-secondary text-foreground text-sm font-bold rounded-xl border border-border hover:bg-secondary/80 transition-all text-center block"
                >
                  {t("dashboard.viewDetailedReports", language)}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
