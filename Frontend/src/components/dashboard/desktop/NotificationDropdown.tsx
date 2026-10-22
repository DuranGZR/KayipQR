"use client";

import { useNotifications } from "@/lib/useNotifications";
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
import { NotificationData } from "@/lib/api";
import { decodeHtmlEntities } from "@/lib/utils";

export const NotificationDropdown: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const feed = useNotifications();
  const { items: notifications, unreadCount } = feed;
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  const handleNotificationClick = async (n: NotificationData) => {
    if (!n.is_read && !await feed.mark(n.id)) return;
    setIsOpen(false);
    if (n.link?.startsWith("/") && !n.link.startsWith("//")) router.push(n.link);
  };
  const handleMarkAllRead = () => feed.mark();
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
        title="Bildirimler" aria-label={`Bildirimler${unreadCount === null ? "" : `, ${unreadCount} okunmamış`}`} aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {(unreadCount ?? 0) > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {(unreadCount ?? 0) > 9 ? "9+" : unreadCount}
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
                  {(unreadCount ?? 0) > 0 && (
                    <span className="text-[10px] font-bold bg-gold/40 px-1.5 py-0.2 rounded text-ink">
                      {unreadCount} yeni
                    </span>
                  )}
                </div>

                {(unreadCount ?? 0) > 0 && (
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
                {feed.error && <p role="alert" className="app-error">{feed.error}<button onClick={feed.reload}>Yeniden dene</button></p>}
                <button className="app-button mb-2" aria-pressed={feed.unreadOnly} onClick={() => feed.setUnreadOnly(!feed.unreadOnly)}>{feed.unreadOnly ? "Tümü" : "Okunmamışlar"}</button>
                {feed.hasMore && <button className="app-button" disabled={feed.loadingMore} onClick={feed.loadMore}>Daha fazla bildirim</button>}
                {feed.loading ? <p role="status">Yükleniyor…</p> : notifications.length === 0 && !feed.error ? (
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
                      <motion.button type="button" disabled={feed.busy}
                        key={n.id}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
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
                      </motion.button>
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
