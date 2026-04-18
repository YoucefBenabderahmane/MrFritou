"use client";

import { useEffect, useState } from "react";
import { useOrderStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";

export function ClientNotificationToaster() {
  const { clientNotifications, clearNotifications, setDarkMode } = useOrderStore();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('darkMode') === 'true') {
      setDarkMode(true);
    }
  }, [setDarkMode]);

  useEffect(() => {
    // Auto clear after 6 seconds
    if (clientNotifications.length > 0) {
      const timer = setTimeout(() => {
        clearNotifications();
        setHiddenIds(new Set());
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [clientNotifications, clearNotifications]);

  const removeNotification = (id: string) => {
    setHiddenIds(prev => new Set([...prev, id]));
  };

  const visibleNotifications = clientNotifications.filter(n => !hiddenIds.has(n.id));

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4">
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-card w-full p-4 rounded-xl shadow-2xl border border-primary/20 pointer-events-auto flex gap-3 relative overflow-hidden"
          >
            {/* Status gradient bg map */}
            <div className={`absolute inset-0 opacity-10 ${
                notification.type === 'status_update' ? 'bg-emerald-500' : 'bg-primary'
            }`} />

            <div className="mt-0.5 shrink-0">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bell className="w-4 h-4 text-primary" />
              </div>
            </div>
            
            <div className="flex-1 pr-6 z-10">
              <h4 className="font-bold text-sm text-foreground mb-0.5">
                {notification.type === 'status_update' ? 'Order Status Updated' : 'Order Updated'}
              </h4>
              <p className="text-sm text-muted-foreground font-medium">
                {notification.message}
              </p>
            </div>

            <button
               onClick={() => removeNotification(notification.id)}
               className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:bg-secondary rounded-full transition-colors z-10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
