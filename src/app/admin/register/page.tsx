"use client";

import { motion } from "framer-motion";
import { ChefHat, Lock, User, Mail, ArrowLeft, Shield, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useOrderStore } from "@/lib/store";

export default function RegisterPage() {
  const router = useRouter();
  const { setCurrentUser, restaurantName, restaurantLogo } = useOrderStore();

  const [canRegister, setCanRegister] = useState<boolean | null>(null); // null = loading
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if first-run setup is allowed
    fetch("/api/register")
      .then(r => r.json())
      .then(data => setCanRegister(data.canRegister === true))
      .catch(() => setCanRegister(false));
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email: email || undefined, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser({ id: data.id, username: data.username, email: data.email, role: data.role });
        localStorage.setItem("userSession", JSON.stringify({ id: data.id, username: data.username, email: data.email, role: data.role }));
        router.push("/admin/dashboard");
      } else {
        setError(data.error || "Registration failed.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (canRegister === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Already set up — block access
  if (!canRegister) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-8 glass rounded-3xl shadow-2xl text-center"
        >
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Setup Already Complete</h1>
          <p className="text-muted-foreground mb-6">
            This platform is already configured. If you need an account, ask your administrator to add you from the Users page.
          </p>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Login
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-1/2 left-1/4 w-[30vw] h-[30vw] bg-primary/10 blur-[100px] rounded-full -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[25vw] h-[25vw] bg-accent/20 blur-[100px] rounded-full pointer-events-none" />

      <Link
        href="/admin/login"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2.5 bg-card/80 backdrop-blur-md border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-secondary hover:border-primary/30 transition-all group shadow-sm"
      >
        <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        <span>Back to Login</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md p-8 glass rounded-3xl shadow-2xl z-10 mx-4"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          {restaurantLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={restaurantLogo} alt="Logo" className="w-20 h-20 rounded-2xl object-cover mb-4 shadow-xl border border-white/10" />
          ) : (
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
              <ChefHat className="w-8 h-8 text-primary" />
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-foreground text-center">
            {restaurantName || "Platform Setup"}
          </h1>
          <p className="text-muted-foreground mt-2 text-center text-sm">Create your administrator account</p>
        </div>

        {/* First-time badge */}
        <div className="mb-6 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">First-Time Setup</p>
            <p className="text-xs text-muted-foreground">This account will have full admin access to all features.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground ml-1">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
                placeholder="e.g. admin"
              />
            </div>
          </div>

          {/* Email (optional) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground ml-1">
              Email <span className="text-muted-foreground font-normal">(recommended — enables Google Sign-In)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
                placeholder="your@email.com"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground ml-1">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
                placeholder="••••••••"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full py-4 mt-2 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Create Admin Account
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-6 pt-5 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/admin/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
