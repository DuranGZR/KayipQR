"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  ShieldCheck,
  Send,
  MapPin,
  CheckCircle2,
  Lock,
  UserCheck,
} from "lucide-react";
import { WobblyCardFrame, WobblyBoxFrame, WobblyButtonFrame } from "@/components/ui/SketchBorders";
import {
  staggerContainer,
  fadeInUp,
  fadeInScale,
  svgPathDraw,
} from "@/lib/animations";

export const ComparisonSection = () => {
  const [activeView, setActiveView] = useState<"finder" | "owner">("finder");

  return (
    <section id="guvenlik" className="mx-auto max-w-[1180px] px-4 sm:px-8 py-14 sm:py-20 md:py-28 min-h-[100dvh] flex flex-col justify-center">
      
      {/* Section Header */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer(0.12)}
        className="text-center max-w-2xl mx-auto mb-8 sm:mb-14"
      >
        <motion.div
          variants={fadeInUp}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/30 border border-ink/30 text-xs font-bold text-ink mb-3 shadow-xs"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>İki Taraf İçin de Kolay</span>
        </motion.div>

        <motion.h2
          variants={fadeInUp}
          className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-extrabold text-ink tracking-tight leading-[1.15]"
        >
          Bir mesajla{" "}
          <span className="relative inline-block">
            iletişim başlasın.
            <svg
              viewBox="0 0 200 18"
              preserveAspectRatio="none"
              className="absolute left-0 -bottom-2 h-4 sm:h-5 w-full -rotate-[0.5deg] pointer-events-none"
              aria-hidden="true"
            >
              <motion.path
                variants={svgPathDraw}
                d="M 3 10 Q 35 4 80 11 Q 120 16 160 8 Q 180 4 197 11"
                stroke="#F2B63C"
                strokeWidth="4.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </motion.h2>

        <motion.p
          variants={fadeInUp}
          className="mt-3.5 sm:mt-5 text-sm sm:text-lg md:text-[19px] text-ink-soft leading-relaxed"
        >
          Bulan kişi haber versin, sen yanıtla. Teslim yerini ve zamanını aynı konuşmada birlikte belirleyin.
        </motion.p>
      </motion.div>

      {/* Switcher Buttons with Wobbly Borders */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeInUp}
        className="flex justify-center mb-6 sm:mb-10 w-full"
      >
        <div className="p-1 sm:p-1.5 flex items-center gap-1 sm:gap-2 relative bg-white rounded-xl border border-ink/20 shadow-2xs">
          <button
            onClick={() => setActiveView("finder")}
            className={`relative px-3 sm:px-5 py-1.5 sm:py-2.5 text-[11px] sm:text-sm font-bold transition-all flex items-center gap-1.5 rounded-lg ${
              activeView === "finder"
                ? "bg-gold text-ink shadow-2xs font-extrabold"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Bulan kişi</span>
          </button>

          <button
            onClick={() => setActiveView("owner")}
            className={`relative px-3 sm:px-5 py-1.5 sm:py-2.5 text-[11px] sm:text-sm font-bold transition-all flex items-center gap-1.5 rounded-lg ${
              activeView === "owner"
                ? "bg-gold text-ink shadow-2xs font-extrabold"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Eşya sahibi</span>
          </button>
        </div>
      </motion.div>

      {/* Device Simulator Card */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeInScale}
        className="max-w-[360px] sm:max-w-[430px] mx-auto relative w-full"
      >
        {/* Washi tape */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 w-28 h-5.5 bg-gold/90 -rotate-2 rounded-[2px] border border-ink/25 shadow-xs pointer-events-none overflow-hidden">
          <svg className="w-full h-full opacity-35" viewBox="0 0 80 16">
            <line x1="5" y1="0" x2="20" y2="16" stroke="#5C3E08" strokeWidth="1.5" />
            <line x1="25" y1="0" x2="40" y2="16" stroke="#5C3E08" strokeWidth="1.5" />
            <line x1="45" y1="0" x2="60" y2="16" stroke="#5C3E08" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="relative p-3.5 sm:p-7 text-ink overflow-hidden bg-white rounded-2xl border-[1.5px] border-ink/20 shadow-md">
          <WobblyCardFrame fill="#FFFDF7" stroke="#33302B" strokeWidth={1.8} className="drop-shadow-[0_6px_20px_rgba(51,48,43,0.09)]" />

          {/* Device Header */}
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-ink/15 text-xs text-ink-soft relative z-10">
            <span className="font-bold text-ink">kayipqr.com/q/X8K2P9QZ</span>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300">
              <Lock className="w-3 h-3" />
              <span>Örnek kullanım</span>
            </div>
          </div>

          {/* Content for Finder / Owner with Smooth Transition */}
          <AnimatePresence mode="wait">
            {activeView === "finder" ? (
              <motion.div
                key="finder"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4 relative z-10"
              >
                <div className="text-center py-2">
                  <span className="text-[11px] font-bold text-amber-900 bg-gold/40 px-3 py-1 rounded-full border border-ink/20 inline-block mb-2">
                    Bu Eşyanın Bir Sahibi Var
                  </span>
                  <h4 className="text-xl font-bold text-ink">
                    Siyah Laptop Çantası (15.6")
                  </h4>
                  <p className="text-xs text-ink-soft mt-1">
                    Sahibi: <span className="font-bold text-ink">Duran</span> · Üye olmadan mesaj yazabilirsiniz.
                  </p>
                </div>

                <div className="p-4 relative space-y-3">
                  <WobblyBoxFrame fill="#FFFFFF" stroke="#33302B" strokeWidth={1.4} />

                  <div className="text-xs text-ink-soft font-semibold relative z-10">
                    Sahibine iletilecek mesajınız:
                  </div>
                  <div className="bg-paper-hover p-3 rounded-lg border border-ink/15 text-xs text-ink relative z-10">
                    Merhaba, çantanızı metro istasyonunda buldum. Güvenlik amirliğine teslim ediyorum.
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 relative z-10">
                    <span className="text-ink font-bold flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-gold-dark" /> Konum Eklendi (Konak Metro)
                    </span>
                    <span className="text-[10px] text-ink-soft">18:42</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full py-3.5 text-ink font-bold text-sm flex items-center justify-center gap-2 active:translate-y-[1px] transition-all"
                >
                  <WobblyButtonFrame fill="#F2B63C" stroke="#33302B" strokeWidth={1.7} />
                  <Send className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Mesajı gönder</span>
                </motion.button>

                <p className="text-[11px] text-center text-ink-soft">
                  Mesaj göndermek için telefon numaranı paylaşman gerekmez.
                </p>
              </motion.div>
            ) : (
              /* Content for Owner */
              <motion.div
                key="owner"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4 relative z-10"
              >
                {/* Notification Banner */}
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-emerald-950">
                      Yeni mesaj
                    </h5>
                    <p className="text-[11px] text-emerald-800">
                      Laptop çantan için bir mesaj geldi.
                    </p>
                  </div>
                </div>

                {/* Chat snippet */}
                <div className="p-4 relative space-y-3">
                  <WobblyBoxFrame fill="#FFFFFF" stroke="#33302B" strokeWidth={1.4} />

                  <div className="flex items-start gap-2.5 relative z-10">
                    <div className="w-7 h-7 rounded-full bg-paper-hover border border-ink/30 flex items-center justify-center text-[10px] font-bold text-ink shrink-0">
                      Bulan
                    </div>
                    <div className="bg-paper-hover p-3 rounded-xl border border-ink/15 text-xs text-ink max-w-[82%]">
                      Merhaba, çantanızı metro istasyonunda buldum. Güvenlik amirliğine teslim ediyorum.
                      <div className="mt-1 text-[10px] text-ink font-bold flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gold-dark" /> Konak Metro İstasyonu
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 justify-end relative z-10">
                    <div className="bg-gold text-ink font-semibold p-3 rounded-xl border border-ink/30 text-xs max-w-[82%] shadow-xs">
                      Çok teşekkür ederim! Hemen güvenliğe geçiyorum.
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative flex-1 py-3 rounded-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-[0_1.5px_0px_#33302B] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <WobblyButtonFrame stroke="#1e293b" strokeWidth={1.4} />
                    <CheckCircle2 className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Eşyayı Teslim Aldım</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative px-3.5 py-3 rounded-[9px] bg-paper-hover text-ink font-semibold text-xs hover:bg-paper-card transition-colors"
                  >
                    <WobblyButtonFrame stroke="#33302B" strokeWidth={1.2} />
                    <span className="relative z-10">Kapat</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>

    </section>
  );
};
