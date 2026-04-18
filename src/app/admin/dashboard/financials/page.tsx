"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  TrendingUp, 
  DollarSign, 
  Download, 
  FileText, 
  RefreshCcw,
  Wallet,
  Receipt,
  Users,
  ChevronDown,
  ChevronUp,
  Banknote,
  Clock,
  User,
  CalendarDays,
  BadgeDollarSign,
  Search,
  ArrowUpDown
} from "lucide-react";
import { useOrderStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

type StatsSummary = {
  totalRevenue: number;
  totalExpenses: number;
  pureProfit: number;
  orderCount: number;
  revenueFromOrders: number;
  otherIncome: number;
};

type ChartPoint = {
  label: string;
  revenue: number;
  expense: number;
};

type WorkerPaymentRecord = {
  id: string;
  amount: number;
  paymentType: string;
  note: string | null;
  date: string;
  workerName: string;
  workerRole: string;
  workerId: string;
};

type WorkerPaymentSummary = {
  workerId: string;
  workerName: string;
  workerRole: string;
  paymentType: string;
  totalPaid: number;
  paymentCount: number;
};

type WorkerPaymentsData = {
  payments: WorkerPaymentRecord[];
  workerSummaries: WorkerPaymentSummary[];
  grandTotal: number;
  totalPayments: number;
};

export default function FinancialsPage() {
  const { currency, language } = useOrderStore();
  const [range, setRange] = useState<"day" | "week" | "month" | "year">("month");
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Worker Payments State
  const [workerPayments, setWorkerPayments] = useState<WorkerPaymentsData | null>(null);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [paymentSearchQuery, setPaymentSearchQuery] = useState("");
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
  const [paymentSortBy, setPaymentSortBy] = useState<"date" | "amount">("date");
  const [paymentSortDir, setPaymentSortDir] = useState<"asc" | "desc">("desc");
  const [activePaymentTab, setActivePaymentTab] = useState<"history" | "summary">("history");

  const fetchStats = async (currentRange: string) => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/reports/stats?range=${currentRange}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setChartData(data.chartData);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchWorkerPayments = async (currentRange: string) => {
    setIsLoadingPayments(true);
    try {
      const res = await fetch(`/api/reports/worker-payments?range=${currentRange}`);
      if (res.ok) {
        const data = await res.json();
        setWorkerPayments(data);
      }
    } catch (error) {
      console.error("Failed to fetch worker payments:", error);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  useEffect(() => {
    fetchStats(range);
    fetchWorkerPayments(range);
  }, [range]);

  const stats = useMemo(() => [
    { 
      label: t("financials.chiffreAffaire", language), 
      value: summary?.totalRevenue || 0, 
      icon: DollarSign, 
      color: "text-blue-500", 
      bg: "bg-blue-500/10",
      desc: t("financials.totalSalesIncome", language)
    },
    { 
      label: t("financials.totalExpenses", language), 
      value: summary?.totalExpenses || 0, 
      icon: Receipt, 
      color: "text-amber-500", 
      bg: "bg-amber-500/10",
      desc: t("financials.goodsSalariesTools", language)
    },
    { 
      label: t("financials.pureProfit", language), 
      value: summary?.pureProfit || 0, 
      icon: Wallet, 
      color: "text-emerald-500", 
      bg: "bg-emerald-500/10",
      desc: t("financials.revenueMinusExpenses", language)
    },
    { 
      label: t("financials.orderCount", language), 
      value: summary?.orderCount || 0, 
      icon: TrendingUp, 
      color: "text-primary", 
      bg: "bg-primary/10",
      desc: t("financials.completedOrders", language),
      isCurrency: false
    },
  ], [summary, language]);

  const formatValue = (val: number, isCurrency = true) => {
    if (!isCurrency) return val.toLocaleString();
    return currency === "DZD " || currency === "AED " || currency === "SAR " 
      ? `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}` 
      : `${currency}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { 
      year: "numeric", 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // Filter and sort payments
  const filteredPayments = useMemo(() => {
    if (!workerPayments) return [];
    let payments = workerPayments.payments.filter(p =>
      p.workerName.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
      p.workerRole.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
      (p.note && p.note.toLowerCase().includes(paymentSearchQuery.toLowerCase()))
    );

    payments.sort((a, b) => {
      if (paymentSortBy === "date") {
        return paymentSortDir === "desc" 
          ? new Date(b.date).getTime() - new Date(a.date).getTime()
          : new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        return paymentSortDir === "desc" ? b.amount - a.amount : a.amount - b.amount;
      }
    });

    return payments;
  }, [workerPayments, paymentSearchQuery, paymentSortBy, paymentSortDir]);

  // Group payments by worker for the expanded view
  const paymentsByWorker = useMemo(() => {
    const map: Record<string, WorkerPaymentRecord[]> = {};
    filteredPayments.forEach(p => {
      if (!map[p.workerId]) map[p.workerId] = [];
      map[p.workerId].push(p);
    });
    return map;
  }, [filteredPayments]);

  const handleExportPDF = () => {
    if (!summary || chartData.length === 0) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();

    // Create a new jsPDF document
    const doc = new jsPDF();
    
    // Setup document styling
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(249, 115, 22); // primary color (orange)
    doc.text("FINANCIAL REPORT", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Report Period: ${range.charAt(0).toUpperCase() + range.slice(1)}`, 14, 28);
    doc.text(`Generated On: ${dateStr} ${timeStr}`, 14, 33);
    
    let yPos = 45;

    // SECTION 1: Summary Table
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Financial Summary", 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [["Metric", "Amount"]],
      body: [
         ["Chiffre d'Affaire (Total Revenue)", summary.totalRevenue.toFixed(2)],
         ["Revenue from Orders", summary.revenueFromOrders.toFixed(2)],
         ["Other Income", summary.otherIncome.toFixed(2)],
         ["Total Expenses", summary.totalExpenses.toFixed(2)],
         ["Pure Profit", summary.pureProfit.toFixed(2)],
         ["Total Orders", String(summary.orderCount)]
      ],
      headStyles: { fillColor: [249, 115, 22] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // SECTION 2: Detailed Breakdown Table
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.text("Detailed Breakdown", 14, yPos);
    yPos += 5;

    const breakdownBody = chartData.map(point => {
      const profit = point.revenue - point.expense;
      const margin = point.revenue > 0 ? ((profit / point.revenue) * 100).toFixed(1) + "%" : "0.0%";
      return [point.label, formatValue(point.revenue), formatValue(point.expense), formatValue(profit), margin];
    });

    const totalRev = chartData.reduce((s, p) => s + p.revenue, 0);
    const totalExp = chartData.reduce((s, p) => s + p.expense, 0);
    const totalProfit = totalRev - totalExp;
    const totalMargin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) + "%" : "0.0%";
    
    // Add total row at the end
    breakdownBody.push(["TOTAL", formatValue(totalRev), formatValue(totalExp), formatValue(totalProfit), totalMargin]);

    autoTable(doc, {
      startY: yPos,
      head: [["Period", "Revenue", "Expenses", "Profit", "Margin"]],
      body: breakdownBody,
      headStyles: { fillColor: [60, 60, 60] },
      styles: { fontSize: 9 },
      didParseCell(data) {
        // Highlight the "TOTAL" row
        if (data.row.index === breakdownBody.length - 1) {
           data.cell.styles.fontStyle = 'bold';
           data.cell.styles.textColor = [0, 0, 0];
        }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // SECTION 3: Worker Payments Detail
    if (workerPayments && workerPayments.payments.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.text("Worker Payments History", 14, yPos);
      yPos += 5;

      const paymentsBody = workerPayments.payments.map(p => [
         p.workerName, 
         p.workerRole, 
         p.paymentType, 
         formatValue(p.amount), 
         p.note || "-", 
         formatShortDate(p.date)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Name", "Role", "Type", "Amount", "Note", "Date"]],
        body: paymentsBody,
        headStyles: { fillColor: [56, 189, 248] }, // sky-400
        styles: { fontSize: 8 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // SECTION 4: Worker Payments Summary
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.text("Worker Payments Summary", 14, yPos);
      yPos += 5;

      const summaryBody = workerPayments.workerSummaries.map(ws => [
        ws.workerName,
        ws.workerRole,
        ws.paymentType,
        String(ws.paymentCount),
        formatValue(ws.totalPaid)
      ]);
      
      summaryBody.push(["GRAND TOTAL", "", "", String(workerPayments.totalPayments), formatValue(workerPayments.grandTotal)]);

      autoTable(doc, {
        startY: yPos,
        head: [["Name", "Role", "Freq", "Count", "Total Paid"]],
        body: summaryBody,
        headStyles: { fillColor: [60, 60, 60] },
        styles: { fontSize: 9 },
        didParseCell(data) {
           if (data.row.index === summaryBody.length - 1) {
              data.cell.styles.fontStyle = 'bold';
           }
        }
      });
    }

    doc.save(`Financial_Report_${range}_${dateStr.replace(/\//g, "-")}.pdf`);
  };

  const paymentTypeColor = (type: string) => {
    switch (type) {
      case "Daily": return "bg-sky-500/10 text-sky-500 border-sky-500/20";
      case "Weekly": return "bg-violet-500/10 text-violet-500 border-violet-500/20";
      case "Monthly": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default: return "bg-primary/10 text-primary border-primary/20";
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
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">{t("financials.title", language)}</h1>
          <p className="text-muted-foreground mt-2 text-lg">{t("financials.subtitle", language)}</p>
        </div>
        
        <div className="flex items-center gap-3 bg-card border border-border p-1.5 rounded-2xl shadow-sm">
          {(["day", "week", "month", "year"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-bold capitalize transition-all",
                range === r 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {t(`financials.${r}`, language)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-3xl bg-card border border-border shadow-sm group hover:border-primary/50 transition-all"
          >
            <div className="flex justify-between items-start mb-6">
              <div className={cn("p-4 rounded-2xl", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full",
                stat.label === "Pure Profit" && (summary?.pureProfit || 0) > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
              )}>
                {t("common.liveData", language)}
              </div>
            </div>
            <h3 className="text-3xl font-black text-foreground mb-1">
              {formatValue(stat.value, stat.isCurrency !== false)}
            </h3>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground/80 uppercase tracking-wider">{stat.label}</span>
              <span className="text-xs text-muted-foreground mt-1">{stat.desc}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 bg-card border border-border rounded-[2.5rem] p-8 shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{t("financials.performanceTrend", language)}</h2>
              <p className="text-sm text-muted-foreground font-medium">{t("financials.revenueVsExpenses", language)} {t(`financials.${range}`, language)}</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs font-bold text-muted-foreground uppercase">{t("financials.revenue", language)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-muted-foreground uppercase">{t("financials.expenses", language)}</span>
              </div>
            </div>
          </div>
          
          <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }}
                  dy={10}
                  className="text-muted-foreground"
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }}
                  dx={-10}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-card border border-border p-4 rounded-2xl shadow-xl backdrop-blur-md bg-card/90">
                          <p className="text-sm font-bold text-foreground mb-2">{label}</p>
                          {payload.map((entry: any) => (
                            <div key={entry.dataKey} className="flex items-center justify-between gap-6 py-1">
                              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{entry.name}:</span>
                              <span className={cn(
                                "text-sm font-black",
                                entry.name === "revenue" ? "text-primary" : "text-amber-500"
                              )}>
                                {formatValue(entry.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  stroke="#f59e0b" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorExpense)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm"
        >
          <h2 className="text-2xl font-bold text-foreground mb-1">{t("financials.revenueSources", language)}</h2>
          <p className="text-sm text-muted-foreground font-medium mb-8">{t("financials.whereMoneyComesFrom", language)}</p>
          
          <div className="space-y-6">
             <div className="bg-secondary/30 rounded-3xl p-6 border border-border/50">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                       <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground uppercase tracking-tight">{t("financials.ordersRevenue", language)}</p>
                      <p className="text-xs text-muted-foreground">{t("financials.digitalCashierSales", language)}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-black text-foreground">{formatValue(summary?.revenueFromOrders || 0)}</span>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {summary?.totalRevenue 
                        ? `${((summary.revenueFromOrders / summary.totalRevenue) * 100).toFixed(0)}%`
                        : "0%"}
                    </span>
                  </div>
                  <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: summary?.totalRevenue ? `${(summary.revenueFromOrders / summary.totalRevenue) * 100}%` : "0%" }}
                      className="bg-primary h-full"
                    />
                  </div>
                </div>
             </div>

             <div className="bg-secondary/30 rounded-3xl p-6 border border-border/50">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                       <RefreshCcw className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground uppercase tracking-tight">{t("financials.otherIncome", language)}</p>
                      <p className="text-xs text-muted-foreground">{t("financials.manualDeposits", language)}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-black text-foreground">{formatValue(summary?.otherIncome || 0)}</span>
                    <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">
                      {summary?.totalRevenue 
                        ? `${((summary.otherIncome / summary.totalRevenue) * 100).toFixed(0)}%`
                        : "0%"}
                    </span>
                  </div>
                  <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: summary?.totalRevenue ? `${(summary.otherIncome / summary.totalRevenue) * 100}%` : "0%" }}
                      className="bg-blue-500 h-full"
                    />
                  </div>
                </div>
             </div>
          </div>

          <div className="mt-12 p-6 border border-dashed border-border rounded-3xl text-center">
             <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
             <p className="text-sm font-bold text-foreground">{t("financials.exportReport", language)}</p>
             <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{t("financials.exportDesc", language)}</p>
             <button 
               onClick={handleExportPDF}
               disabled={!summary || chartData.length === 0}
               className="w-full py-3 bg-foreground text-background font-bold rounded-2xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
             >
               <Download className="w-4 h-4" /> {t("common.export", language)} (PDF)
             </button>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* WORKER PAYMENTS HISTORY SECTION */}
      {/* ═══════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-[2.5rem] shadow-sm overflow-hidden"
      >
        {/* Section Header */}
        <div className="p-8 pb-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/20 flex items-center justify-center">
                <Users className="w-7 h-7 text-violet-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground tracking-tight">{t("financials.workerPaymentsHistory", language)}</h2>
                <p className="text-sm text-muted-foreground font-medium mt-0.5">
                  {t("financials.detailedPayrollRecords", language)} <span className="text-foreground font-bold">{t(`financials.${range}`, language)}</span>
                </p>
              </div>
            </div>

            {/* Quick stats badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
                <BadgeDollarSign className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-black text-violet-500">
                  {formatValue(workerPayments?.grandTotal || 0)}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-xl border border-border">
                <Banknote className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-bold text-foreground">
                  {workerPayments?.totalPayments || 0} {t("financials.payments", language)}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs + Search Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-6">
            <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-xl border border-border/50">
              <button
                onClick={() => setActivePaymentTab("history")}
                className={cn(
                  "px-5 py-2 rounded-lg text-sm font-bold transition-all",
                  activePaymentTab === "history"
                    ? "bg-card shadow-sm text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Clock className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                {t("financials.paymentLog", language)}
              </button>
              <button
                onClick={() => setActivePaymentTab("summary")}
                className={cn(
                  "px-5 py-2 rounded-lg text-sm font-bold transition-all",
                  activePaymentTab === "summary"
                    ? "bg-card shadow-sm text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                {t("financials.perWorkerSummary", language)}
              </button>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={paymentSearchQuery}
                  onChange={(e) => setPaymentSearchQuery(e.target.value)}
                  placeholder={t("financials.searchPayments", language)}
                  className="w-full ps-9 pe-4 py-2.5 text-sm bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground text-foreground"
                />
              </div>
              <button
                onClick={() => {
                  if (paymentSortBy === "date") {
                    setPaymentSortDir(d => d === "desc" ? "asc" : "desc");
                  } else {
                    setPaymentSortBy("date");
                    setPaymentSortDir("desc");
                  }
                }}
                className={cn(
                  "p-2.5 rounded-xl border transition-colors",
                  paymentSortBy === "date" ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                )}
                title="Sort by date"
              >
                <CalendarDays className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (paymentSortBy === "amount") {
                    setPaymentSortDir(d => d === "desc" ? "asc" : "desc");
                  } else {
                    setPaymentSortBy("amount");
                    setPaymentSortDir("desc");
                  }
                }}
                className={cn(
                  "p-2.5 rounded-xl border transition-colors",
                  paymentSortBy === "amount" ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                )}
                title="Sort by amount"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 pt-6">
          {isLoadingPayments ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCcw className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : activePaymentTab === "history" ? (
            /* ─────── PAYMENT HISTORY LOG ─────── */
            filteredPayments.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Banknote className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                <p className="text-lg font-bold text-foreground">{t("financials.noPayments", language)}</p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {t("financials.noPaymentsDesc", language)}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPayments.map((payment, i) => (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group flex items-center gap-4 p-4 rounded-2xl bg-secondary/20 border border-border/50 hover:border-primary/30 hover:bg-secondary/40 transition-all"
                  >
                    {/* Worker Avatar */}
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/10 flex items-center justify-center shrink-0 border border-violet-500/10">
                      <span className="text-sm font-black text-violet-500">
                        {payment.workerName.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm">{payment.workerName}</span>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                          paymentTypeColor(payment.paymentType)
                        )}>
                          {payment.paymentType}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{payment.workerRole}</span>
                        {payment.note && (
                          <>
                            <span className="text-xs text-border">•</span>
                            <span className="text-xs text-muted-foreground truncate">{payment.note}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Amount + Date */}
                    <div className="text-right shrink-0">
                      <span className="text-lg font-black text-foreground block">
                        {formatValue(payment.amount)}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {formatDate(payment.date)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            /* ─────── PER-WORKER SUMMARY ─────── */
            !workerPayments || workerPayments.workerSummaries.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Users className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                <p className="text-lg font-bold text-foreground">{t("financials.noWorkerSummaries", language)}</p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {t("financials.noWorkerSummariesDesc", language)}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {workerPayments.workerSummaries
                  .filter(ws =>
                    ws.workerName.toLowerCase().includes(paymentSearchQuery.toLowerCase()) ||
                    ws.workerRole.toLowerCase().includes(paymentSearchQuery.toLowerCase())
                  )
                  .map((ws, i) => {
                    const isExpanded = expandedWorker === ws.workerId;
                    const workerPaymentList = paymentsByWorker[ws.workerId] || [];
                    const percentage = workerPayments.grandTotal > 0 
                      ? (ws.totalPaid / workerPayments.grandTotal) * 100 
                      : 0;

                    return (
                      <motion.div
                        key={ws.workerId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-2xl border border-border overflow-hidden bg-secondary/10 hover:border-primary/20 transition-all"
                      >
                        {/* Summary Header */}
                        <button
                          onClick={() => setExpandedWorker(isExpanded ? null : ws.workerId)}
                          className="w-full flex items-center gap-4 p-5 hover:bg-secondary/30 transition-colors text-left"
                        >
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/10 flex items-center justify-center shrink-0 border border-violet-500/10">
                            <span className="text-lg font-black text-violet-500">
                              {ws.workerName.charAt(0).toUpperCase()}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-foreground">{ws.workerName}</span>
                              <span className="text-xs text-muted-foreground">• {ws.workerRole}</span>
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                paymentTypeColor(ws.paymentType)
                              )}>
                                {ws.paymentType}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex-1 max-w-[200px]">
                                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-gradient-to-r from-violet-500 to-pink-500 h-full rounded-full"
                                  />
                                </div>
                              </div>
                              <span className="text-xs font-bold text-muted-foreground">
                                {percentage.toFixed(1)}% {t("financials.ofTotalPayroll", language)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0 pr-2">
                            <span className="text-xl font-black text-foreground block">
                              {formatValue(ws.totalPaid)}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                              {ws.paymentCount} {t("financials.payments", language)}
                            </span>
                          </div>

                          <div className="shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </button>

                        {/* Expanded Details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-border bg-card/50 p-4 space-y-2">
                                {/* Table header */}
                                <div className="grid grid-cols-4 gap-4 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                  <span>{t("common.date", language)}</span>
                                  <span>{t("common.type", language)}</span>
                                  <span>{t("common.note", language)}</span>
                                  <span className="text-right">{t("common.amount", language)}</span>
                                </div>
                                {workerPaymentList.map((p) => (
                                  <div
                                    key={p.id}
                                    className="grid grid-cols-4 gap-4 px-3 py-3 rounded-xl bg-secondary/20 border border-border/30 text-sm items-center"
                                  >
                                    <span className="text-foreground font-medium text-xs flex items-center gap-1.5">
                                      <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                                      {formatShortDate(p.date)}
                                    </span>
                                    <span>
                                      <span className={cn(
                                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                        paymentTypeColor(p.paymentType)
                                      )}>
                                        {p.paymentType}
                                      </span>
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">
                                      {p.note || "—"}
                                    </span>
                                    <span className="text-right font-bold text-foreground">
                                      {formatValue(p.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}

                {/* Grand Total Row */}
                <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-violet-500/5 to-pink-500/5 border border-violet-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                      <BadgeDollarSign className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                      <span className="font-black text-foreground uppercase text-sm tracking-wider">{t("financials.grandTotalPayroll", language)}</span>
                      <span className="text-xs text-muted-foreground block mt-0.5">
                        {workerPayments.workerSummaries.length} {t("financials.workers", language)} • {workerPayments.totalPayments} {t("financials.totalPayments", language)}
                      </span>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-violet-500">
                    {formatValue(workerPayments.grandTotal)}
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
}
