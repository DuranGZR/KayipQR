"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, Check, X } from "lucide-react";
import { WobblyCardFrame, WobblyButtonFrame } from "@/components/ui/SketchBorders";

export const CookieConsent = () => {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("kayipqr_cookie_consent");
    if (!consent) {
      // Delay slightly for smooth appearance
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("kayipqr_cookie_consent", "accepted");
    setIsVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("kayipqr_cookie_consent", "dismissed");
    setIsVisible(false);
  };

  const accountPage = ["/dashboard", "/studio", "/messages", "/settings"].some(route => pathname.startsWith(route));
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={`${accountPage ? "hidden md:block" : ""} fixed bottom-20 right-4 md:bottom-6 sm:right-6 z-50 max-w-[360px] w-[calc(100%-2rem)]`}
        >
          <div className="relative p-5 text-ink shadow-[0_12px_32px_rgba(51,48,43,0.15)]">
            <WobblyCardFrame fill="#FFFDF7" stroke="#33302B" strokeWidth={1.75} />

            <div className="relative z-10 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gold/50 flex items-center justify-center border border-ink/20 text-amber-950">
                    <Cookie className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-ink tracking-tight">Çerez Tercihleri</h4>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-ink-soft hover:text-ink p-1 rounded-md transition-colors"
                  aria-label="Kapat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[12px] text-ink-soft leading-relaxed">
                Oturumunu ve dil tercihini hatırlamak için tarayıcı depolaması, Google girişi sırasında güvenlik çerezi kullanıyoruz. Detaylar için{" "}
                <Link href="/cookies" className="font-bold text-ink underline hover:text-gold-dark">
                  Çerez Politikamızı
                </Link>{" "}
                inceleyebilirsiniz.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAccept}
                  className="relative flex-1 py-2.5 px-4 text-ink font-bold text-xs active:translate-y-[1px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <WobblyButtonFrame fill="#F2B63C" stroke="#33302B" strokeWidth={1.4} />
                  <span className="relative z-10 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Anladım, Kabul Et</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
