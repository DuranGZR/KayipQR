"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Palette,
  Printer,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { WobblyCardFrame } from "@/components/ui/SketchBorders";
import {
  staggerContainer,
  fadeInUp,
  svgPathDraw,
} from "@/lib/animations";

const STEPS = [
  {
    num: "01",
    tapeRotate: "-rotate-2",
    tapeColor: "bg-gold/80",
    title: "Eşyanı ekle, etiketini tasarla",
    desc: "Eşyana bir ad ver, tasarımını seç ve bulan kişiye göstermek istediğin bilgileri düzenle.",
    badge: "Sana özel etiket",
    icon: Palette,
    image: "/images/how-it-works/01-tasarla.webp",
    imageAlt: "Laptopta krem ve sarı renkli bir QR etiketi tasarlayan kişi",
  },
  {
    num: "02",
    tapeRotate: "rotate-3",
    tapeColor: "bg-gold/90",
    title: "İndir ve bastır",
    desc: "QR etiketini indir. Evde yazdırabilir veya seçtiğin malzemeye bir baskı merkezinde bastırabilirsin.",
    badge: "Dijital olarak indir",
    icon: Printer,
    image: "/images/how-it-works/02-bastir.webp",
    imageAlt: "Evde yazdırılan QR etiketini kanvas çantasına yerleştiren kişi",
  },
  {
    num: "03",
    tapeRotate: "-rotate-1",
    tapeColor: "bg-gold/75",
    title: "Bulan kişi sana yazsın",
    desc: "Etiketi tarayan kişi açılan sayfadan mesaj göndersin. Sen de hesabından yanıt verip teslim için anlaş.",
    badge: "Site üzerinden mesajlaş",
    icon: Smartphone,
    image: "/images/how-it-works/03-mesajlas.webp",
    imageAlt: "QR etiketli çantayı bulan kişinin telefondan sahibine mesaj göndermesi",
  },
];

function StepPhoto({ step }: { step: (typeof STEPS)[number] }) {
  return (
    <figure className="pt-5 mt-auto">
      <div className="relative aspect-[3/2] overflow-hidden rounded-xl border border-ink/15 bg-paper-hover">
        <Image
          src={step.image}
          alt={step.imageAlt}
          fill
          sizes="(max-width: 767px) 90vw, (max-width: 1180px) 30vw, 330px"
          className="object-cover"
        />
        <figcaption className="absolute bottom-2 right-2 rounded bg-paper-card/95 px-2 py-1 text-[9px] font-medium text-ink-soft shadow-sm">
          Temsili görsel
        </figcaption>
      </div>
    </figure>
  );
}

export const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="nasil-calisir" className="mx-auto max-w-[1180px] px-4 sm:px-8 py-10 sm:py-20 md:py-28 min-h-[100dvh] flex flex-col justify-center">
      
      {/* Section Header with Hand-Drawn Underline */}
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
          <span>3 Basit Adım</span>
        </motion.div>

        <motion.h2
          variants={fadeInUp}
          className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-extrabold text-ink tracking-tight leading-[1.15]"
        >
          Tasarla. Bastır.{" "}
          <span className="relative inline-block">
            Eşyana ekle.
            <svg
              viewBox="0 0 280 18"
              preserveAspectRatio="none"
              className="absolute left-0 -bottom-2 h-4 sm:h-5 w-full -rotate-[0.5deg] pointer-events-none"
              aria-hidden="true"
            >
              <motion.path
                variants={svgPathDraw}
                d="M 3 10 Q 45 4 100 11 Q 160 16 220 8 Q 255 4 277 11"
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
          QR etiketini hazırladıktan sonra, eşyanı bulan kişinin sana ulaşabileceği bir yol açmış olursun.
        </motion.p>
      </motion.div>

      {/* ================= MOBILE VIEW (Single Full Card with Tabs & Navigation) ================= */}
      <div className="block md:hidden w-full max-w-md mx-auto">
        {/* Step Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-white rounded-xl border border-ink/20 shadow-2xs mb-4">
          {STEPS.map((step, idx) => {
            const isSelected = activeStep === idx;
            return (
              <button
                key={step.num}
                type="button"
                onClick={() => setActiveStep(idx)}
                aria-pressed={isSelected}
                className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                  isSelected
                    ? "bg-gold text-ink font-extrabold shadow-2xs border border-ink/30"
                    : "text-ink-soft hover:text-ink hover:bg-paper-hover"
                }`}
              >
                <span className="text-[9.5px] opacity-75">Adım {step.num}</span>
                <span className="truncate max-w-full">
                  {idx === 0 ? "1. Tasarla" : idx === 1 ? "2. Bastır" : "3. Mesajlaş"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Step Card */}
        {(() => {
          const step = STEPS[activeStep];
          const Icon = step.icon;
          return (
            <div className="relative p-5 sm:p-7 bg-white rounded-2xl border-[1.5px] border-ink/20 shadow-md">
              <WobblyCardFrame fill="#FFFDF7" stroke="#33302B" strokeWidth={1.7} className="drop-shadow-[0_4px_16px_rgba(51,48,43,0.06)]" />

              {/* Washi Masking Tape Top (Firmly stuck on card) */}
              <div
                className={`absolute -top-2.5 left-8 z-30 w-20 h-6 ${step.tapeColor} ${step.tapeRotate} rounded-[2px] border border-ink/25 shadow-[0_2px_5px_rgba(51,48,43,0.14)] pointer-events-none overflow-hidden`}
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
                  <span className="font-mono text-2xl font-extrabold text-ink/25">
                    {step.num} / 03
                  </span>
                </div>

                <span className="inline-block self-start px-2.5 py-0.5 rounded bg-paper-hover border border-ink/20 text-[10.5px] font-bold text-ink-soft mb-1.5">
                  {step.badge}
                </span>

                <h3 className="text-lg font-bold text-ink">
                  {step.title}
                </h3>

                <p className="mt-2 text-[13px] text-ink-soft leading-relaxed">
                  {step.desc}
                </p>

                <StepPhoto step={step} />

                {/* Bottom Navigation & Indicator */}
                <div className="mt-4 pt-3.5 border-t border-ink/10 flex items-center justify-between">
                  <span />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={activeStep === 0}
                      onClick={() => setActiveStep((p) => Math.max(0, p - 1))}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border border-ink/20 bg-paper-hover text-ink disabled:opacity-30 disabled:pointer-events-none"
                    >
                      ← Geri
                    </button>
                    <button
                      type="button"
                      disabled={activeStep === STEPS.length - 1}
                      onClick={() => setActiveStep((p) => Math.min(STEPS.length - 1, p + 1))}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border border-ink bg-gold text-ink shadow-2xs disabled:opacity-30 disabled:pointer-events-none"
                    >
                      İleri →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ================= DESKTOP VIEW (Original 3 Wobbly Cards Grid) ================= */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer(0.18)}
        className="hidden md:grid md:grid-cols-3 gap-8"
      >
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.num}
              variants={fadeInUp}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="relative flex flex-col justify-between p-7 group transition-shadow duration-200"
            >
              <WobblyCardFrame fill="#FFFDF7" stroke="#33302B" strokeWidth={1.7} className="drop-shadow-[0_4px_16px_rgba(51,48,43,0.06)]" />

              {/* Washi Masking Tape Top (Firmly stuck on card) */}
              <div
                className={`absolute -top-2.5 left-10 z-30 w-22 sm:w-26 h-6 sm:h-6.5 ${step.tapeColor} ${step.tapeRotate} rounded-[2px] border border-ink/25 shadow-[0_2px_5px_rgba(51,48,43,0.14)] pointer-events-none overflow-hidden`}
              >
                <svg className="w-full h-full opacity-40" viewBox="0 0 65 18">
                  <line x1="5" y1="0" x2="18" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
                  <line x1="20" y1="0" x2="33" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
                  <line x1="35" y1="0" x2="48" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
                  <line x1="50" y1="0" x2="63" y2="18" stroke="#5C3E08" strokeWidth="1.5" />
                </svg>
              </div>

              <div className="relative z-10 flex h-full flex-col">
                {/* Header with Step Number */}
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-gold/25 border-[1.5px] border-ink flex items-center justify-center text-ink shadow-xs group-hover:scale-105 group-hover:bg-gold/40 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-3xl font-extrabold text-ink/20 group-hover:text-gold-dark/60 transition-colors">
                    {step.num}
                  </span>
                </div>

                <span className="inline-block self-start px-2.5 py-0.5 rounded bg-paper-hover border border-ink/20 text-[11px] font-bold text-ink-soft mb-2">
                  {step.badge}
                </span>

                <h3 className="text-xl sm:text-2xl md:text-[25px] font-extrabold text-ink tracking-tight">
                  {step.title}
                </h3>

                <p className="mt-2.5 text-sm sm:text-[15.5px] text-ink-soft leading-relaxed">
                  {step.desc}
                </p>

                <StepPhoto step={step} />
              </div>

            </motion.div>
          );
        })}
      </motion.div>

    </section>
  );
};
