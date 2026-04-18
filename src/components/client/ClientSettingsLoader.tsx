"use client";

import { useEffect } from "react";
import { useOrderStore } from "@/lib/store";
import { type Language } from "@/lib/i18n";

export function ClientSettingsLoader() {
  const { setLanguage, setCurrency, setRestaurantName, setRestaurantLogo, setRestaurantAddress, setTheme } = useOrderStore();

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
          if (data.address) setRestaurantAddress(data.address);
          if (data.theme) setTheme(data.theme);
        }
      } catch (e) {
        console.error("Failed to load global settings:", e);
      }
    };
    loadSettings();
  }, [setLanguage, setCurrency, setRestaurantName, setRestaurantLogo, setRestaurantAddress, setTheme]);

  return null;
}
