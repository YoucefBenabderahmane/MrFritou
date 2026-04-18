"use client";

import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { useOrderStore } from "@/lib/store";
import { isRTL, type Language } from "@/lib/i18n";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { language, setLanguage, setCurrency, setCurrentUser, setRestaurantName, setRestaurantLogo, setTheme } = useOrderStore();

  useEffect(() => {
    // 1. Load restaurant settings
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.language) setLanguage(data.language as Language);
          if (data.currency) setCurrency(data.currency);
          if (data.name) setRestaurantName(data.name);
          if (data.logo !== undefined) setRestaurantLogo(data.logo);
          if (data.theme) setTheme(data.theme);
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    };

    // 2. Verify session via server (JWT cookie) — source of truth for role
    const verifySession = async () => {
      try {
        const res = await fetch("/api/users/me");
        if (res.status === 401) {
          // Cookie invalid / expired — kick to login
          localStorage.removeItem("userSession");
          router.push("/admin/login");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          // Set user with trusted server-validated data
          setCurrentUser({
            id: data.id,
            username: data.username,
            email: data.email,
            role: data.role,
            avatar: data.avatar ?? null,
          });
          // Keep localStorage in sync
          localStorage.setItem(
            "userSession",
            JSON.stringify({ id: data.id, username: data.username, email: data.email, role: data.role })
          );
        }
      } catch {
        // Network error — fall back to localStorage so page doesn't break offline
        const stored = localStorage.getItem("userSession");
        if (stored) {
          try { setCurrentUser(JSON.parse(stored)); } catch {}
        } else {
          router.push("/admin/login");
        }
      }
    };

    loadSettings();
    verifySession();
  }, [setLanguage, setCurrency, setCurrentUser, setRestaurantName, setRestaurantLogo, setTheme, router]);

  return (
    <div
      className="flex h-screen bg-background overflow-hidden relative print:h-auto print:overflow-visible print:block"
      dir={isRTL(language) ? "rtl" : "ltr"}
    >
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className={`flex-1 flex flex-col transition-all duration-300 print:m-0 print:p-0 print:block ${
        isRTL(language) ? "md:mr-[260px]" : "md:ml-[260px]"
      }`}>
        <div className="print:hidden">
          <Topbar />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 print:overflow-visible print:p-0 print:block">
          {children}
        </main>
      </div>
    </div>
  );
}
