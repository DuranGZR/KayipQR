"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
} from "lucide-react";
import {
  WobblyCardFrame,
  WobblyButtonFrame,
} from "@/components/ui/SketchBorders";
import {
  DynamicQrRenderer,
  CUSTOM_QR_DESIGNS,
} from "@/components/ui/DynamicQrRenderer";
import {
  staggerContainer,
  fadeInUp,
  fadeInRight,
  svgPathDraw,
} from "@/lib/animations";
import { haptic } from "@/lib/haptics";

const showcaseBadges = ["Akışkan çizgiler", "Yaprak desenleri", "Dairesel tasarım", "Doğadan ilham alan", "KayıpQR klasiği", "Yatay çizgiler", "Noktalı tasarım", "Pul çerçevesi"];

export const HeroSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const currentDesign = CUSTOM_QR_DESIGNS[activeIndex];

  // Restart the delay after every change, including a tap.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % CUSTOM_QR_DESIGNS.length);
    }, 6500);
    return () => clearTimeout(timeout);
  }, [activeIndex]);

  return (
    <section className="relative mx-auto max-w-[1180px] px-3.5 sm:px-8 min-h-[100dvh] pt-16 sm:pt-24 md:pt-28 pb-8 sm:pb-16 flex flex-col justify-center">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_460px] items-center gap-6 lg:gap-14 my-auto w-full">
        
        {/* ================= LEFT COLUMN ================= */}
        <motion.div
          variants={staggerContainer(0.12, 0.1)}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-start w-full max-w-2xl lg:max-w-none"
        >
          <motion.h1
            variants={fadeInUp}
            className="text-3xl xs:text-4xl sm:text-[44px] md:text-[50px] lg:text-[54px] xl:text-[58px] font-extrabold text-ink leading-[1.16] tracking-tight"
          >
            <span className="block">Eşyan sana dönsün,</span>
            <span className="relative inline-block mt-1 sm:mt-2">
              numaran sende kalsın.
              <svg
                viewBox="0 0 320 18"
                preserveAspectRatio="none"
                className="absolute left-0 -bottom-2 h-4 sm:h-5 w-full -rotate-[0.5deg] pointer-events-none"
                aria-hidden="true"
              >
                <motion.path
                  variants={svgPathDraw}
                  d="M 3 11 Q 50 4 110 10 Q 180 15 240 8 Q 285 4 317 11"
                  stroke="#F2B63C"
                  strokeWidth="4.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="mt-3.5 sm:mt-6 text-sm sm:text-lg md:text-[19px] leading-relaxed text-ink/85 max-w-[50ch]"
          >
            Eşyana bir QR etiketi ekle. Bulan kişi kodu okutup sana site üzerinden mesaj göndersin; telefon numaranı veya e-postanı paylaşman gerekmesin.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="mt-5 sm:mt-8 flex flex-wrap items-center gap-3.5 sm:gap-6 w-full sm:w-auto"
          >
            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto"
            >
              <Link
                href="/studio"
                className="relative inline-flex items-center justify-center font-bold text-sm sm:text-[17px] text-ink px-6 sm:px-9 py-3 sm:py-4 active:translate-y-[1.5px] transition-all w-full sm:w-auto shadow-xs"
              >
                <WobblyButtonFrame fill="#F2B63C" stroke="#33302B" strokeWidth={1.8} />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span>Ücretsiz QR etiketini oluştur</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
              </Link>
            </motion.div>
            
            <motion.a
              whileHover={{ x: 4 }}
              href="#nasil-calisir"
              className="text-xs sm:text-[15.5px] font-bold text-ink/80 underline underline-offset-4 decoration-gold decoration-2 hover:text-ink hover:decoration-gold-dark transition-all mx-auto sm:mx-0"
            >
              Nasıl çalışır? →
            </motion.a>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="mt-4 sm:mt-6 flex flex-col gap-1.5 text-xs sm:text-[14.5px] text-ink-soft font-medium"
          >
            <span className="flex items-center gap-2">
              <span className="text-emerald-700 font-extrabold text-sm sm:text-base">✓</span>
              Telefon numaran etikette görünmez.
            </span>
            <span className="flex items-center gap-2">
              <span className="text-emerald-700 font-extrabold text-sm sm:text-base">✓</span>
              Bulan kişinin üye olması gerekmez.
            </span>
            <span className="flex items-center gap-2">
              <span className="text-emerald-700 font-extrabold text-sm sm:text-base">✓</span>
              Etiketini indir, istediğin yerde bastır.
            </span>
          </motion.div>

        </motion.div>

        {/* ================= RIGHT COLUMN: INTERACTIVE STICKER SHOWCASE ================= */}
        <motion.div 
          variants={fadeInRight}
          initial="hidden"
          animate="visible"
          className="flex w-full flex-col items-center select-none mt-2 lg:mt-0"
        >
          <div className="w-full max-w-[360px] sm:max-w-[440px] relative">
            <div className="relative p-4 sm:p-7 text-ink min-h-[340px] sm:min-h-[450px] flex flex-col justify-between bg-white rounded-2xl border-[1.5px] border-ink/20 shadow-md">
              <WobblyCardFrame fill="#FFFDF7" stroke="#33302B" strokeWidth={1.8} className="drop-shadow-[0_8px_28px_rgba(51,48,43,0.12)]" />

              {/* Washi Masking Tape Top */}
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 w-28 sm:w-36 h-6 sm:h-7 bg-gold/90 -rotate-1 rounded-[2px] border border-ink/25 shadow-[0_2px_6px_rgba(51,48,43,0.14)] pointer-events-none overflow-hidden">
                <svg className="w-full h-full opacity-40" viewBox="0 0 90 18">
                  <line x1="6" y1="0" x2="20" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
                  <line x1="24" y1="0" x2="38" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
                  <line x1="42" y1="0" x2="56" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
                  <line x1="60" y1="0" x2="74" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
                  <line x1="78" y1="0" x2="92" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
                </svg>
              </div>

              {/* Showcase Header Bar */}
              <div className="pb-2.5 relative z-10 flex items-center justify-between border-b border-ink/10">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded bg-gold border border-ink flex items-center justify-center font-black text-[10px] text-ink">
                    QR
                  </span>
                  <span className="font-extrabold text-xs sm:text-[13px] text-ink truncate">
                    {currentDesign.name}
                  </span>
                </div>
                <span className="text-[9.5px] sm:text-[10.5px] font-bold text-amber-900 bg-gold/30 px-2 py-0.5 rounded-full border border-gold">
                  {showcaseBadges[activeIndex]}
                </span>
              </div>

              {/* Animated Custom SVG QR Preview */}
              <button
                type="button"
                aria-label="Sonraki QR tasarımını göster"
                onClick={() => {
                  haptic.lightTap();
                  setActiveIndex(previous => (previous + 1) % CUSTOM_QR_DESIGNS.length);
                }}
                className="my-auto py-4 flex items-center justify-center relative z-10 cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentDesign.id}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col items-center justify-center drop-shadow-[0_14px_28px_rgba(51,48,43,0.14)]"
                  >
                    <DynamicQrRenderer
                      data="https://kayipqr.com/q/KQR"
                      size={255}
                      designId={currentDesign.id}
                      dotColor={currentDesign.fgColor}
                      bgColor={currentDesign.bgColor}
                      accentColor={currentDesign.accentColor}
                      labelText="BENİ TARA"
                    />
                  </motion.div>
                </AnimatePresence>
              </button>

              {/* Bottom Tagline */}
              <div className="pt-2 border-t border-ink/10 flex items-center justify-between text-[10px] text-ink-soft relative z-10">
                <span className="min-w-0 flex-1 pr-3">Diğer tasarımları görmek için QR’a dokun.</span>
                <span className="font-mono font-bold text-ink shrink-0">Örnek QR etiketi</span>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};
