"use client";

import { useState, useEffect } from "react";
import { useOrderStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Trash2, UserPlus, Save, Mail, Briefcase, RefreshCcw } from "lucide-react";

export default function UsersManagementPage() {
  const { language, currentUser } = useOrderStore();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("manager");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, role }),
      });
      
      if (res.ok) {
        await fetchUsers();
        setUsername("");
        setEmail("");
        setPassword("");
        setRole("manager");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create user");
      }
    } catch (e) {
      setError("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (name === "admin") {
      alert("Cannot delete primary admin");
      return;
    }
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await fetch(`/api/users/${id}`, { method: "DELETE" });
        fetchUsers();
      } catch(e){}
    }
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
        <h2 className="text-xl font-bold text-destructive mb-2">Access Denied</h2>
        <p className="text-muted-foreground">Only administrators can access this area.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("nav.users", language) || "Users & Access"}</h1>
          <p className="text-muted-foreground mt-1">Manage system access roles for employees and managers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create User Form */}
        <div className="lg:col-span-1 border border-border bg-card p-6 rounded-2xl shadow-sm h-fit">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add New User
          </h2>
          
          <form onSubmit={handleCreateUser} className="space-y-4">
            {error && <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm font-semibold">{error}</div>}
            
            <div className="space-y-1.5">
               <label className="text-sm font-semibold ml-1">Username</label>
               <input
                 type="text"
                 required
                 value={username}
                 onChange={e => setUsername(e.target.value)}
                 className="w-full bg-secondary/50 border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground text-sm transition-all"
                 placeholder="e.g. jdoe"
               />
            </div>

            <div className="space-y-1.5">
               <label className="text-sm font-semibold ml-1">Google Email Address</label>
               <input
                 type="email"
                 required
                 value={email}
                 onChange={e => setEmail(e.target.value)}
                 className="w-full bg-secondary/50 border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground text-sm transition-all"
                 placeholder="Required for Google Login"
               />
            </div>

            <div className="space-y-1.5">
               <label className="text-sm font-semibold ml-1">Password</label>
               <input
                 type="password"
                 required
                 value={password}
                 onChange={e => setPassword(e.target.value)}
                 className="w-full bg-secondary/50 border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground text-sm transition-all"
                 placeholder="••••••••"
               />
            </div>

            <div className="space-y-1.5">
               <label className="text-sm font-semibold ml-1">Role</label>
               <select
                 value={role}
                 onChange={e => setRole(e.target.value)}
                 className="w-full bg-secondary/50 border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none text-sm transition-all appearance-none"
               >
                 <option value="waiter">Waiter (Orders only)</option>
                 <option value="manager">Manager (Orders, Menu, Stock)</option>
                 <option value="admin">Admin (Full Access)</option>
               </select>
            </div>

            <button
               type="submit"
               disabled={isSubmitting}
               className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl mt-2 flex justify-center items-center disabled:opacity-70"
            >
               {isSubmitting ? "Adding..." : "Create User"}
            </button>
          </form>
        </div>

        {/* User List */}
        <div className="lg:col-span-2 space-y-4">
           {isLoading ? (
             <div className="flex justify-center p-12"><RefreshCcw className="w-6 h-6 animate-spin text-primary" /></div>
           ) : (
             users.map(user => (
               <motion.div
                 key={user.id}
                 initial={{ opacity: 0, scale: 0.98 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm"
               >
                  <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        <Briefcase className="w-6 h-6" />
                     </div>
                     <div className="flex-1 min-w-0">
                       <h3 className="font-bold text-foreground text-lg">{user.username}</h3>
                       <div className="flex items-center gap-4 text-sm mt-1">
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold ${
                           user.role === "admin" ? "bg-primary/20 text-primary" : "bg-blue-500/20 text-blue-500"
                         }`}>
                           <Briefcase className="w-3 h-3 mr-1" />
                           {user.role}
                         </span>
                         {user.email && (
                           <span className="flex items-center text-muted-foreground">
                             <Mail className="w-3.5 h-3.5 mr-1" />
                             {user.email}
                           </span>
                         )}
                         <span className="text-muted-foreground flex items-center">
                           Joined {new Date(user.createdAt).toLocaleDateString()}
                         </span>
                       </div>
                     </div>
                  </div>
                  
                  {user.username !== "admin" && (
                     <button
                       onClick={() => handleDeleteUser(user.id, user.username)}
                       className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors border border-transparent hover:border-destructive/20"
                       title="Delete User"
                     >
                       <Trash2 className="w-5 h-5" />
                     </button>
                  )}
               </motion.div>
             ))
           )}
        </div>
      </div>
    </div>
  );
}
