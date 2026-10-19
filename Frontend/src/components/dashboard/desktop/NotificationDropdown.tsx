"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCheck,
  QrCode,
  MessageCircle,
  Clock,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { WobblyCardFrame } from "@/components/ui/SketchBorders";
import { notificationsApi, getAuthToken, NotificationData } from "@/lib/api";
import { decodeHtmlEntities } from "@/lib/utils";
import { startVisiblePolling } from "@/lib/visiblePolling";

export const NotificationDropdown: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedInitialRef = useRef(false);

  const loadNotifications = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const data = await notificationsApi.list();
      if (!hasLoadedInitialRef.current) {
        data.forEach((n) => seenIdsRef.current.add(n.id));
        hasLoadedInitialRef.current = true;
      } else {
        data.forEach((n) => {
          if (!seenIdsRef.current.has(n.id)) {
            seenIdsRef.current.add(n.id);
            if (
              !n.is_read &&
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              try {
                new Notification(decodeHtmlEntities(n.title), {
                  body: decodeHtmlEntities(n.body),
                });
              } catch {
                // Ignore browser notification permission/context errors
              }
            }
          }
        });
      }
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    return startVisiblePolling(loadNotifications, 60000);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationClick = async (n: NotificationData) => {
    if (!n.is_read) {
      try {
        await notificationsApi.markAsRead(n.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
        );
      } catch (err) {
        console.error("Failed to mark notification read:", err);
      }
    }
    setIsOpen(false);
    if (n.link) {
      router.push(n.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Bell Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
          isOpen
            ? "bg-gold text-ink border-ink shadow-xs"
            : "bg-white text-ink-soft hover:text-ink hover:bg-paper-hover border-ink/20 shadow-xs"
        }`}
        title="Bildirimler"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </motion.button>

      {/* Notification Dropdown Panel with AnimatePresence */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 md:left-0 md:right-auto top-11 z-50 w-80 sm:w-96 bg-paper-card p-4 rounded-[20px] shadow-2xl text-ink"
          >
            <WobblyCardFrame stroke="#33302B" strokeWidth={1.6} />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-ink/10">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-gold-dark" />
                  <span className="font-bold text-xs text-ink">Bildirimler</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-gold/40 px-1.5 py-0.2 rounded text-ink">
                      {unreadCount} yeni
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-bold text-ink-soft hover:text-ink flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Tümünü Okundu Say</span>
                  </button>
                )}
              </div>

              {/* List */}
              <div className="space-y-2 max-h-[360px] overflow-y-auto no-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-7 text-center text-xs text-ink-soft">
                    Henüz yeni bir bildirim bulunmuyor.
                  </div>
                ) : (
                  notifications.map((n) => {
                    const cleanTitle = decodeHtmlEntities(n.title);
                    const cleanBody = decodeHtmlEntities(n.body);
                    const isScan = n.type === "qr_scan" || cleanTitle.includes("Okutuldu");
                    const isMessage = n.type === "new_message" || cleanTitle.includes("Mesaj");

                    return (
                      <motion.div
                        key={n.id}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                          !n.is_read
                            ? "bg-gold/15 border-gold/40 shadow-xs"
                            : "bg-white border-ink/10 opacity-75 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-7 h-7 shrink-0 rounded-lg bg-gold/25 flex items-center justify-center text-gold-dark">
                              {isScan ? (
                                <QrCode className="w-3.5 h-3.5" />
                              ) : isMessage ? (
                                <MessageCircle className="w-3.5 h-3.5" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div>
                              <h5 className="font-bold text-xs text-ink">
                                {cleanTitle}
                              </h5>
                              <p className="text-[11px] text-ink-soft leading-relaxed mt-1">
                                {cleanBody}
                              </p>
                              <div className="flex items-center gap-1 mt-1.5 text-[10px] text-ink-soft">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                            </div>
                          </div>

                          {n.link && (
                            <span className="shrink-0 mt-1 text-gold-dark">
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
