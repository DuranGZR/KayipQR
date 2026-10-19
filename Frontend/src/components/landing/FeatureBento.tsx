"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  EyeOff,
  RefreshCw,
  BellRing,
  Smartphone,
  Sparkles,
  Check,
} from "lucide-react";
import { WobblyCardFrame } from "@/components/ui/SketchBorders";
import {
  staggerContainer,
  fadeInUp,
  svgPathDraw,
} from "@/lib/animations";

const FEATURES = [
  {
    icon: EyeOff,
    tag: "GİZLİLİK ÖNCELİKLİ",
    title: "Numaranı etikete yazman gerekmez",
    desc: "Telefon numaran ve hesap e-postan bulan kişiye gösterilmez. Görünen sahip adını ve eşya notunu ise sen belirlersin.",
    highlight: "Ne göstereceğine sen karar ver.",
    tapeColor: "bg-gold/85",
    tapeRotate: "-rotate-2",
  },
  {
    icon: RefreshCw,
    tag: "GÜNCEL BİLGİLER",
    title: "Bilgilerin değişsin, etiketin kalsın",
    desc: "Eşyanın adını, notunu veya durumunu hesabından güncelle. Bilgiler değiştiğinde mevcut QR etiketini yeniden bastırman gerekmez.",
    highlight: "Aynı QR, güncel bilgiler.",
    tapeColor: "bg-gold/75",
    tapeRotate: "rotate-3",
  },
  {
    icon: BellRing,
    tag: "TARAMALAR VE MESAJLAR",
    title: "Tarama ve mesajları takip et",
    desc: "QR taramalarını ve gelen mesajları hesabında gör. E-posta uyarılarını tercihlerine göre aç; bulan kişi isterse konumunu da paylaşabilir.",
    highlight: "Gelişmeleri hesabından takip et.",
    tapeColor: "bg-gold/90",
    tapeRotate: "-rotate-1",
  },
  {
    icon: Smartphone,
    tag: "ÜYELİK GEREKMEZ",
    title: "Bulan kişi doğrudan yazabilsin",
    desc: "QR kodunu tarayıp açılan sayfadan mesaj gönderebilir. Üye olması veya uygulama indirmesi gerekmez.",
    highlight: "Tarayıcıdan iletişim.",
    tapeColor: "bg-gold/80",
    tapeRotate: "rotate-2",
  },
];

export const FeatureBento = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <section id="ozellikler" className="mx-auto max-w-[1180px] px-4 sm:px-8 py-10 sm:py-20 md:py-28 min-h-[100dvh] flex flex-col justify-center">
      
      {/* Section Header */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer(0.12)}
        className="text-center max-w-2xl mx-auto mb-6 sm:mb-16"
      >
        <motion.div
          variants={fadeInUp}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/30 border border-ink/30 text-xs font-bold text-ink mb-2 sm:mb-3 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-ink" />
          <span>Sana Ulaşırlar, Bilgilerine Değil</span>
        </motion.div>

        <motion.h2
          variants={fadeInUp}
          className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-extrabold text-ink tracking-tight leading-[1.15]"
        >
          Bir etiketin yanında{" "}
          <span className="relative inline-block">
            gelen kolaylıklar.
            <svg
              viewBox="0 0 240 18"
              preserveAspectRatio="none"
              className="absolute left-0 -bottom-2 h-4 sm:h-5 w-full -rotate-[0.5deg] pointer-events-none"
              aria-hidden="true"
            >
              <motion.path
                variants={svgPathDraw}
                d="M 3 10 Q 40 4 90 11 Q 140 16 190 8 Q 215 4 237 11"
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
          İletişim bilgilerini etikete yazmadan mesajlaş, taramaları takip et ve eşya bilgilerini aynı QR üzerinden güncelle.
        </motion.p>
      </motion.div>

      {/* ================= MOBILE VIEW (Single Full Card with Tabs & Navigation) ================= */}
      <div className="block md:hidden w-full max-w-md mx-auto">
        {/* Feature Selector Tabs (2x2 grid) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-xl border border-ink/20 shadow-2xs mb-4">
          {FEATURES.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = activeFeature === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveFeature(idx)}
                className={`py-2 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? "bg-gold text-ink font-extrabold shadow-2xs border border-ink/30"
                    : "text-ink-soft hover:text-ink hover:bg-paper-hover"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {idx === 0 ? "Gizlilik" : idx === 1 ? "Güncelleme" : idx === 2 ? "Bildirim" : "Kolaylık"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Feature Card */}
        {(() => {
          const item = FEATURES[activeFeature];
          const Icon = item.icon;
          return (
            <div className="relative p-5 sm:p-7 bg-white rounded-2xl border-[1.5px] border-ink/20 shadow-md">
              <WobblyCardFrame fill="#FFFDF7" stroke="#33302B" strokeWidth={1.6} className="drop-shadow-[0_4px_16px_rgba(51,48,43,0.06)]" />

              {/* Washi Masking Tape Top (Firmly stuck on card) */}
              <div
                className={`absolute -top-2.5 left-8 z-30 w-20 h-6 ${item.tapeColor} ${item.tapeRotate} rounded-[2px] border border-ink/25 shadow-[0_2px_5px_rgba(51,48,43,0.14)] pointer-events-none overflow-hidden`}
              >
                <svg className="w-full h-full opacity-40" viewBox="0 0 65 18">
                  <line x1="5" y1="0" x2="18" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
                  <line x1="20" y1="0" x2="33" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
                  <line x1="35" y1="0" x2="48" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
                  <line x1="50" y1="0" x2="63" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
                </svg>
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gold/25 border-[1.5px] border-ink flex items-center justify-center text-ink shadow-xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft bg-paper-hover px-2.5 py-1 rounded border border-ink/15">
                    {item.tag}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-ink">
                  {item.title}
                </h3>

                <p className="mt-2 text-[13px] text-ink-soft leading-relaxed">
                  {item.desc}
                </p>

                {/* Bottom Highlight & Navigation */}
                <div className="mt-5 pt-3.5 border-t border-ink/10 flex items-center justify-between">
                  <span className="text-emerald-800 flex items-center gap-1.5 text-[11px] font-bold">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    {item.highlight}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={activeFeature === 0}
                      onClick={() => setActiveFeature((p) => Math.max(0, p - 1))}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border border-ink/20 bg-paper-hover text-ink disabled:opacity-30 disabled:pointer-events-none"
                    >
                      ←
                    </button>
                    <span className="text-[10.5px] font-mono font-bold text-ink-soft">
                      {activeFeature + 1}/{FEATURES.length}
                    </span>
                    <button
                      type="button"
                      disabled={activeFeature === FEATURES.length - 1}
                      onClick={() => setActiveFeature((p) => Math.min(FEATURES.length - 1, p + 1))}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border border-ink bg-gold text-ink shadow-2xs disabled:opacity-30 disabled:pointer-events-none"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ================= DESKTOP VIEW (Original 4 Cards Grid) ================= */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer(0.14)}
        className="hidden md:grid md:grid-cols-2 gap-8"
      >
        {FEATURES.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={idx}
              variants={fadeInUp}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="relative p-7 sm:p-9 flex flex-col justify-between group transition-shadow duration-200"
            >
              <WobblyCardFrame fill="#FFFDF7" stroke="#33302B" strokeWidth={1.6} className="drop-shadow-[0_4px_16px_rgba(51,48,43,0.06)]" />

              {/* Washi Masking Tape Top (Firmly stuck on card) */}
              <div
                className={`absolute -top-2.5 left-10 z-30 w-22 sm:w-26 h-6 sm:h-6.5 ${item.tapeColor} ${item.tapeRotate} rounded-[2px] border border-ink/25 shadow-[0_2px_5px_rgba(51,48,43,0.14)] pointer-events-none overflow-hidden`}
              >
                <svg className="w-full h-full opacity-40" viewBox="0 0 65 18">
                  <line x1="5" y1="0" x2="18" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
                  <line x1="20" y1="0" x2="33" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
                  <line x1="35" y1="0" x2="48" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
                  <line x1="50" y1="0" x2="63" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
                </svg>
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-gold/25 border-[1.5px] border-ink flex items-center justify-center text-ink shadow-xs group-hover:scale-105 group-hover:bg-gold/40 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-soft bg-paper-hover px-2.5 py-1 rounded border border-ink/15">
                    {item.tag}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl md:text-[25px] font-extrabold text-ink tracking-tight">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm sm:text-[15.5px] text-ink-soft leading-relaxed">
                  {item.desc}
                </p>
              </div>

              {/* Bottom Feature Tag */}
              <div className="mt-7 pt-4 border-t border-ink/10 flex items-center justify-between text-xs font-bold text-ink relative z-10">
                <span className="text-emerald-800 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  {item.highlight}
                </span>
                <span className="text-[11px] text-ink-soft font-mono">#KAYIPQR</span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

    </section>
  );
};
