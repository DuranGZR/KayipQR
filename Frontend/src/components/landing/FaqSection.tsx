"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import {
  WobblyAccordionFrame,
  WobblyDivider,
  WobblyBoxFrame,
} from "@/components/ui/SketchBorders";
import { haptic } from "@/lib/haptics";
import {
  staggerContainer,
  fadeInUp,
  svgPathDraw,
} from "@/lib/animations";

const FAQS = [
  {
    "q": "Fiziksel etiket gönderiyor musunuz?",
    "a": "Hayır. KayıpQR dijital bir QR etiketi oluşturur. Dosyanı indirip evde yazdırabilir veya istediğin baskı merkezinde bastırabilirsin. Fiziksel baskı ve malzemeyi sen temin edersin."
  },
  {
    "q": "Bulan kişi hangi bilgilerimi görür?",
    "a": "Telefon numaran ve hesap e-postan gösterilmez. Eşyanın adını, ayrıca paylaşmayı seçtiğin sahip adını ve notu görebilir. İletişim site üzerinden gerçekleşir."
  },
  {
    "q": "Bulan kişinin üye olması gerekir mi?",
    "a": "Hayır. QR kodunu tarayıp açılan sayfadan mesaj gönderebilir. Uygulama indirmesi veya hesap açması gerekmez."
  },
  {
    "q": "Bilgileri değiştirirsem etiketi yeniden bastırmalı mıyım?",
    "a": "Hayır. Eşyanın adını, notunu ve durumunu güncellediğinde mevcut QR aynı sayfaya ulaşmaya devam eder. Etiketin görünümünü değiştirmek istersen yeni tasarımı ayrıca bastırabilirsin."
  },
  {
    "q": "A4 baskı nasıl çalışır?",
    "a": "Bir eşyanın QR etiketini, seçtiğin yerleşime göre aynı A4 sayfasında birden fazla kez hazırlayabilirsin. Şablonu indirebilir, yazdırabilir veya yazdırma ekranından PDF olarak kaydedebilirsin."
  },
  {
    "q": "KayıpQR ücretsiz mi?",
    "a": "Evet. Hesap oluşturabilir, eşyalarını ekleyebilir, QR etiketlerini indirip site üzerinden mesajlaşabilirsin. Fiziksel baskı masrafları buna dahil değildir."
  },
  {
    "q": "KayıpQR eşyamın konumunu canlı takip eder mi?",
    "a": "Hayır. KayıpQR bir GPS takip cihazı değildir. Etiketi bulan kişinin sana ulaşmasını sağlar. Bulan kişi isterse konuşmada konumunu paylaşabilir."
  },
  {
    "q": "QR’ın açılması ve mesajlaşmak için internet gerekir mi?",
    "a": "Evet. QR’ın yönlendirdiği sayfayı açmak ve mesajlaşmak için internet bağlantısı gerekir."
  }
];

export const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    haptic.lightTap();
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="sss" className="mx-auto max-w-[1040px] px-4 sm:px-8 py-10 sm:py-16 md:py-24 min-h-[75vh] sm:min-h-[100dvh] flex flex-col justify-center">
      
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
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/30 border border-ink/30 text-xs font-bold text-ink mb-2.5 shadow-xs"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Aklına takılanlar</span>
        </motion.div>

        <motion.h2
          variants={fadeInUp}
          className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-extrabold text-ink tracking-tight leading-[1.15]"
        >
          Sıkça Sorulan Sorular
        </motion.h2>

        <motion.p
          variants={fadeInUp}
          className="mt-3.5 sm:mt-5 text-sm sm:text-lg md:text-[19px] text-ink-soft leading-relaxed"
        >
          KayıpQR hakkında merak ettiğin her şey burada.
        </motion.p>
      </motion.div>

      {/* Accordion List with Organic Hand-Drawn Wobbly Borders */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={staggerContainer(0.08)}
        className="space-y-4 sm:space-y-5 max-w-3xl mx-auto w-full"
      >
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <motion.div
              key={idx}
              variants={fadeInUp}
              whileHover={{ y: -2 }}
              className="relative transition-all drop-shadow-[0_4px_14px_rgba(51,48,43,0.06)]"
            >
              <WobblyAccordionFrame fill="#FFFDF7" stroke="#33302B" strokeWidth={1.65} />

              <button
                onClick={() => toggle(idx)}
                className="relative z-10 w-full px-5 sm:px-7 py-4 sm:py-5 text-left flex items-center justify-between gap-3 font-extrabold text-sm sm:text-[17px] text-ink hover:text-ink/80 transition-colors"
              >
                <span>{faq.q}</span>
                <div
                  className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  <WobblyBoxFrame
                    fill={isOpen ? "#F2B63C" : "#F4F0E6"}
                    stroke="#33302B"
                    strokeWidth={1.3}
                  />
                  <ChevronDown className="relative z-10 w-4 h-4 sm:w-4.5 sm:h-4.5 text-ink" />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden relative z-10"
                  >
                    <div className="px-5 sm:px-7 pb-5 sm:pb-6 text-xs sm:text-[15px] text-ink-soft leading-relaxed pt-1">
                      <WobblyDivider stroke="#33302B" strokeWidth={1.3} className="opacity-25 mb-3" />
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>

    </section>
  );
};
