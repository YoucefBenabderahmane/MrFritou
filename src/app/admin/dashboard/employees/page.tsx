"use client";

import { useState, useEffect } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Users, Search, Trash2, Edit2, Shield, Phone, Mail, X, Banknote, CheckCircle2, RefreshCcw } from "lucide-react";
import { useOrderStore } from "@/lib/store";
import { t } from "@/lib/i18n";

type Worker = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  salary: number;
  paymentType: "Daily" | "Weekly" | "Monthly";
  status: "Active" | "Inactive";
};


export default function EmployeesPage() {
  const { currency, language } = useOrderStore();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchWorkers = async () => {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setWorkers(data);
      }
    } catch (error) {
      console.error("Failed to fetch workers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [payingWorker, setPayingWorker] = useState<Worker | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const filteredWorkers = workers.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    w.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.phone && w.phone.includes(searchQuery))
  );


  const handleAddNew = () => {
    setEditingWorker(null);
    setIsModalOpen(true);
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this worker?")) {
      try {
        const res = await fetch(`/api/employees/${id}`, {
          method: "DELETE"
        });
        if (res.ok) {
          fetchWorkers();
        }
      } catch (error) {
        console.error("Failed to delete worker:", error);
      }
    }
  };


  const handleSaveWorker = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const workerData = {
      name: formData.get("name") as string,
      role: formData.get("role") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      salary: Number(formData.get("salary")),
      paymentType: formData.get("paymentType") as "Daily" | "Weekly" | "Monthly",
      status: formData.get("status") as "Active" | "Inactive",
    };

    try {
      const url = editingWorker ? `/api/employees/${editingWorker.id}` : "/api/employees";
      const method = editingWorker ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workerData)
      });
      
      if (res.ok) {
        fetchWorkers();
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error("Failed to save worker:", error);
    }
  };

  const handlePayWorker = async () => {
    if (!payingWorker) return;
    setIsPaying(true);
    try {
      // Create both: a general FinTransaction AND a detailed WorkerPayment record
      const [txRes, wpRes] = await Promise.all([
        fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "expense",
            amount: payingWorker.salary,
            description: `Salary Payment: ${payingWorker.name} (${payingWorker.paymentType})`,
            category: "Payroll"
          })
        }),
        fetch("/api/employees/" + payingWorker.id + "/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: payingWorker.salary,
            paymentType: payingWorker.paymentType,
            note: `${payingWorker.paymentType} salary payment`
          })
        })
      ]);
      
      if (txRes.ok) {
        setPayingWorker(null);
        alert(`Successfully logged payment for ${payingWorker.name}`);
      }
    } catch (error) {
      console.error("Failed to log payment:", error);
    } finally {
      setIsPaying(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("employees.title", language)}</h1>
          <p className="text-muted-foreground mt-1">{t("employees.subtitle", language)}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-full md:w-64 group">
            <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-muted-foreground">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-9 pe-4 py-3 text-sm bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground text-foreground"
              placeholder={t("employees.searchPlaceholder", language)}
            />
          </div>
          <motion.button
            onClick={handleAddNew}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 shrink-0 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25"
          >
            <UserPlus className="w-5 h-5" />
            {t("employees.addWorker", language)}
          </motion.button>
        </div>
      </div>
      
      {filteredWorkers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground flex flex-col items-center justify-center h-64 shadow-sm">
          <Users className="w-12 h-12 mb-4 text-primary/40" />
          <h3 className="text-lg font-semibold text-foreground">{t("employees.noWorkers", language)}</h3>
          <p className="text-sm mt-1">{t("employees.noWorkersDesc", language)}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredWorkers.map((worker, i) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                key={worker.id}
                className="group bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:border-primary/50 transition-colors flex flex-col p-6 relative"
              >
                <div className="absolute top-4 right-4 flex gap-2">
                  <button 
                    onClick={() => handleEdit(worker)}
                    className="p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(worker.id)}
                    className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xl font-bold text-primary">{worker.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground leading-tight">{worker.name}</h3>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mt-1">
                      <Shield className="w-3.5 h-3.5" />
                      {worker.role}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-center gap-2 text-sm text-foreground bg-secondary/30 p-3 rounded-xl border border-border/50">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{worker.phone || "No phone number"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground bg-secondary/30 p-3 rounded-xl border border-border/50">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{worker.email || "No email"}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xl font-bold text-foreground block">
                        {currency === "DZD " || currency === "AED " || currency === "SAR " ? `${worker.salary.toFixed(2)} ${currency}` : `${currency}${worker.salary.toFixed(2)}`}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("employees.per", language)} {worker.paymentType.toLowerCase()}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${worker.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                      {worker.status === 'Active' ? t("common.active", language) : t("common.inactive", language)}
                    </span>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPayingWorker(worker)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-secondary text-foreground font-bold rounded-xl border border-border hover:bg-primary hover:text-primary-foreground hover:border-transparent transition-all"
                  >
                    <Banknote className="w-4 h-4" />
                    {t("employees.logPayment", language)}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      <AnimatePresence>
        {payingWorker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPayingWorker(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/10">
                <h2 className="text-xl font-bold text-foreground">{t("employees.confirmPayment", language)}</h2>
                <button onClick={() => setPayingWorker(null)} className="p-2 hover:bg-secondary rounded-full">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Banknote className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{t("employees.payingTo", language)}</p>
                    <p className="text-xl font-bold text-foreground">{payingWorker.name}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center px-4 py-2">
                  <span className="text-muted-foreground font-medium">{t("employees.paymentAmount", language)}</span>
                  <span className="text-2xl font-black text-foreground">
                     {currency === "DZD " || currency === "AED " || currency === "SAR " ? `${payingWorker.salary.toFixed(2)} ${currency}` : `${currency}${payingWorker.salary.toFixed(2)}`}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handlePayWorker}
                    disabled={isPaying}
                    className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isPaying ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    {t("employees.confirmLog", language)}
                  </button>
                  <button
                    onClick={() => setPayingWorker(null)}
                    className="w-full py-3 bg-secondary text-foreground font-bold rounded-xl border border-border hover:bg-secondary/80 transition-colors"
                  >
                    {t("common.cancel", language)}
                  </button>
                </div>
                <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
                  {t("employees.payrollNote", language)}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
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
              className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-secondary/10">
                <h2 className="text-xl font-bold text-foreground">
                  {editingWorker ? t("employees.editWorker", language) : t("employees.addNewWorker", language)}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-secondary rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              
              <form onSubmit={handleSaveWorker} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-semibold text-foreground">{t("employees.fullName", language)}</label>
                    <input
                      name="name"
                      required
                      defaultValue={editingWorker?.name || ""}
                      className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("employees.role", language)}</label>
                    <input
                      name="role"
                      required
                      defaultValue={editingWorker?.role || ""}
                      className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      placeholder="e.g. Head Chef"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("common.status", language)}</label>
                    <select
                      name="status"
                      required
                      defaultValue={editingWorker?.status || "Active"}
                      className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground appearance-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("employees.phoneNumber", language)}</label>
                    <input
                      name="phone"
                      defaultValue={editingWorker?.phone || ""}
                      className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      placeholder="e.g. +1 234 567 890"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("employees.email", language)}</label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={editingWorker?.email || ""}
                      className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      placeholder="e.g. john@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("employees.salary", language)}</label>
                    <input
                      name="salary"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={editingWorker?.salary || ""}
                      className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      placeholder="e.g. 2000"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">{t("employees.paymentType", language)}</label>
                    <select
                      name="paymentType"
                      required
                      defaultValue={editingWorker?.paymentType || "Monthly"}
                      className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground appearance-none"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-foreground font-semibold hover:bg-secondary transition-colors"
                  >
                    {t("common.cancel", language)}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {editingWorker ? t("employees.saveChanges", language) : t("employees.saveWorker", language)}
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
