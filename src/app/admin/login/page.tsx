"use client";

import { motion } from "framer-motion";
import { ChefHat, Lock, User, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useOrderStore } from "@/lib/store";
import { t, isRTL, type Language } from "@/lib/i18n";

export default function AdminLogin() {
  const router = useRouter();
  const { language, setLanguage, setCurrency, setCurrentUser, restaurantName, setRestaurantName, restaurantLogo, setRestaurantLogo } = useOrderStore();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [canRegister, setCanRegister] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.language) setLanguage(data.language as Language);
          if (data.currency) setCurrency(data.currency);
          if (data.name) setRestaurantName(data.name);
          if (data.logo !== undefined) setRestaurantLogo(data.logo);
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    };
    loadSettings();

    // Check if first-run setup is available
    fetch("/api/register")
      .then(r => r.json())
      .then(data => setCanRegister(data.canRegister === true))
      .catch(() => {});

    // Show errors from Google OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    const errorDesc = params.get("error_desc");
    if (oauthError === "not_authorized") setError("Your Google account is not authorized. Contact your administrator.");
    else if (oauthError === "google_failed") setError(`Google sign-in failed. Error: ${errorDesc || 'Unknown'}`);
    else if (oauthError === "google_cancelled") setError("Google sign-in was cancelled.");
  }, [setLanguage, setCurrency, setRestaurantName, setRestaurantLogo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser({ id: data.id, username: data.username, role: data.role });
        localStorage.setItem("userSession", JSON.stringify({ id: data.id, username: data.username, role: data.role }));
        router.push("/admin/dashboard");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (e) {
      setError("Network error. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/google/callback`;
    const scope = "openid email profile";
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=select_account`;
    window.location.href = url;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden" dir={isRTL(language) ? "rtl" : "ltr"}>
      <div className="absolute top-1/2 left-1/4 w-[30vw] h-[30vw] bg-primary/10 blur-[100px] rounded-full -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[25vw] h-[25vw] bg-accent/20 blur-[100px] rounded-full pointer-events-none" />


      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md p-8 glass rounded-3xl shadow-2xl z-10 mx-4"
      >
        <div className="flex flex-col items-center mb-10">
          {restaurantLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={restaurantLogo} alt="Logo" className="w-20 h-20 rounded-2xl object-cover mb-4 shadow-xl border border-white/10" />
          ) : (
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
              <ChefHat className="w-8 h-8 text-primary" />
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-foreground text-center">{restaurantName || t("login.title", language)}</h1>
          <p className="text-muted-foreground mt-2 text-center">{t("login.subtitle", language)}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-semibold text-center">
            {error}
          </div>
        )}

        {/* Google Sign-In */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleGoogleLogin}
          className="w-full mb-6 py-3.5 bg-card text-foreground font-semibold rounded-xl border border-border shadow-sm flex items-center justify-center gap-3 hover:bg-secondary hover:border-primary/30 transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </motion.button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">or use credentials</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground ml-1">{t("login.username", language)}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
                placeholder="admin"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground ml-1">{t("login.password", language)}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            className="w-full py-4 mt-4 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              t("login.signIn", language)
            )}
          </motion.button>
        </form>

        {/* Smart setup / register link — only shown when DB is empty */}
        {canRegister && (
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">First time here?</p>
            <Link href="/admin/register" className="text-primary font-semibold hover:underline mt-1 inline-block">
              Set up your platform →
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
