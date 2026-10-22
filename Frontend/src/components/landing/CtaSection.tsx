"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, QrCode, ShieldCheck, Sparkles } from "lucide-react";
import { WobblyCardFrame, WobblyButtonFrame } from "@/components/ui/SketchBorders";
import {
  staggerContainer,
  fadeInUp,
  fadeInScale,
  svgPathDraw,
} from "@/lib/animations";

export const CtaSection = () => {
  return (
    <section className="mx-auto max-w-[1040px] px-4 sm:px-8 py-14 sm:py-16 md:py-24 min-h-[70vh] sm:min-h-[100dvh] flex flex-col justify-center">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeInScale}
        className="relative p-5 sm:p-14 text-center overflow-hidden bg-[#FBF0D2] rounded-2xl border-[1.5px] border-ink/20 shadow-md"
      >
        {/* Organic wobbly frame with integrated warm gold/light fill */}
        <WobblyCardFrame fill="#FBF0D2" stroke="#33302B" strokeWidth={1.8} className="drop-shadow-[0_6px_20px_rgba(51,48,43,0.08)]" />

        {/* Washi tape on top (Firmly stuck on card) */}
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 w-32 sm:w-40 h-6.5 sm:h-7 bg-gold -rotate-1 rounded-[2px] border border-ink/25 shadow-[0_2px_5px_rgba(51,48,43,0.14)] pointer-events-none overflow-hidden">
          <svg className="w-full h-full opacity-40" viewBox="0 0 90 18">
            <line x1="5" y1="0" x2="20" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
            <line x1="25" y1="0" x2="40" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
            <line x1="45" y1="0" x2="60" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
            <line x1="65" y1="0" x2="80" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
          </svg>
        </div>

        <motion.div
          variants={staggerContainer(0.12, 0.1)}
          className="relative z-10 max-w-2xl mx-auto"
        >
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-ink/25 text-xs font-bold text-ink mb-3 sm:mb-4 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-gold-dark" />
            <span>İlk etiketinle başla</span>
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-extrabold text-ink leading-tight tracking-tight"
          >
            Bir etiket hazırla.{" "}
            <span className="relative inline-block">
              Bir iletişim yolu bırak.
              <svg
                viewBox="0 0 240 18"
                preserveAspectRatio="none"
                className="absolute left-0 -bottom-2 h-4 sm:h-5 w-full -rotate-[0.5deg] pointer-events-none"
                aria-hidden="true"
              >
                <motion.path
                  variants={svgPathDraw}
                  d="M 3 10 Q 40 4 90 11 Q 140 16 190 8 Q 215 4 237 11"
                  stroke="#33302B"
                  strokeWidth="4"
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
            Ücretsiz hesabını oluştur, ilk eşyanı ekle ve QR etiketini indir. Gerisi, etiketini bastırıp eşyana eklemek.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.div
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
            >
              <Link
                href="/register?redirect=/studio"
                className="relative inline-flex items-center justify-center gap-2.5 px-8 py-4 text-[16px] font-bold text-ink active:translate-y-[2px] transition-all"
              >
                <WobblyButtonFrame fill="#F2B63C" stroke="#33302B" strokeWidth={1.8} />
                <QrCode className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Ücretsiz QR etiketini oluştur</span>
                <ArrowRight className="w-4 h-4 relative z-10" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="mt-6 flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-ink-soft"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Kredi kartı gerekmez
            </span>
            <span>·</span>
            <span>Dijital etiket</span>
            <span>·</span>
            <span>Baskı sana ait</span>
          </motion.div>
        </motion.div>

      </motion.div>
    </section>
  );
};
