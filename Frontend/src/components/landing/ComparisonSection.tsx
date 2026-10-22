"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { WobblyCardFrame } from "@/components/ui/SketchBorders";
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
            type="button"
            aria-pressed={activeView === "finder"}
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
            type="button"
            aria-pressed={activeView === "owner"}
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

      {/* Photo scenes using the actual demo interface as reference */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeInScale}
        className="max-w-4xl mx-auto relative w-full"
      >
        {/* Washi tape */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 w-28 h-5.5 bg-gold/90 -rotate-2 rounded-[2px] border border-ink/25 shadow-xs pointer-events-none overflow-hidden">
          <svg className="w-full h-full opacity-35" viewBox="0 0 80 16">
            <line x1="5" y1="0" x2="20" y2="16" stroke="#5C3E08" strokeWidth="1.5" />
            <line x1="25" y1="0" x2="40" y2="16" stroke="#5C3E08" strokeWidth="1.5" />
            <line x1="45" y1="0" x2="60" y2="16" stroke="#5C3E08" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="relative p-3 sm:p-5 text-ink bg-paper-card rounded-2xl border border-ink/20 shadow-md">
          <WobblyCardFrame fill="#FFFDF7" stroke="#33302B" strokeWidth={1.8} />
          <div className="relative z-10 aspect-[3/2] overflow-hidden rounded-xl bg-paper-hover">
            <AnimatePresence mode="wait">
              <motion.figure
                key={activeView}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <Image
                  src={`/images/conversation/${activeView}.webp`}
                  alt={activeView === "finder"
                    ? "KayıpQR sayfasından mesaj yazılan telefon ve bulunan QR etiketli çanta"
                    : "Laptopta KayıpQR mesajlar ekranını kullanan eşya sahibi"}
                  fill
                  sizes="(max-width: 767px) 95vw, (max-width: 1024px) 90vw, 860px"
                  className="object-cover"
                />
                <figcaption className="absolute bottom-2 right-2 rounded bg-paper-card/95 px-2 py-1 text-[10px] font-medium text-ink-soft shadow-sm">
                  Temsili görsel · {activeView === "finder" ? "Bulan kişi" : "Eşya sahibi"}
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

    </section>
  );
};
