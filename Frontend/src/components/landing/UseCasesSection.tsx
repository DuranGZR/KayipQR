"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Laptop,
  Luggage,
  KeyRound,
  Heart,
  Bike,
  Camera,
  Sparkles,
} from "lucide-react";
import { WobblyCardFrame, WobblyButtonFrame } from "@/components/ui/SketchBorders";
import {
  staggerContainer,
  fadeInUp,
  fadeInScale,
} from "@/lib/animations";

const USE_CASES = [
  {
    id: "laptop",
    title: "Laptop & Tablet",
    icon: Laptop,
    category: "Elektronik & Ofis",
    headline: "Ekranı açmadan sana ulaşabilsinler.",
    description:
      "QR etiketini cihazına veya kılıfına ekle. Bulan kişi cihazın kilidini açmadan sana mesaj gönderebilsin.",
    material: "Mat Şeffaf / Su Geçirmez Sticker",
    dimensions: "35mm x 35mm",
    image: "/images/use-cases/laptop.webp",
    imageAlt: "QR etiketli kanvas laptop kılıfı ve tablet",
  },
  {
    id: "luggage",
    title: "Bavul & Seyahat",
    icon: Luggage,
    category: "Havalimanı & Yolculuk",
    headline: "Karışan bavulun için bir iletişim yolu.",
    description:
      "Etiketi bavuluna veya bagaj kartına ekle. Bavulunu bulan kişi kodu tarayıp sana haber verebilsin.",
    material: "Sert Bagaj Kartı / Lamine Etiket",
    dimensions: "50mm x 50mm",
    image: "/images/use-cases/luggage.webp",
    imageAlt: "Havalimanında QR bagaj etiketi takılmış koyu renkli valiz",
  },
  {
    id: "keys",
    title: "Anahtar & Cüzdan",
    icon: KeyRound,
    category: "Günlük Eşyalar",
    headline: "Küçük eşyalarına ulaşılabilir bir sahip ekle.",
    description:
      "QR’ı anahtarlığına ekle veya basılı etiketi cüzdanına yerleştir. Bulan kişi sana nerede olduğunu yazabilsin.",
    material: "Pleksi / Metal Anahtarlık",
    dimensions: "25mm x 25mm",
    image: "/images/use-cases/keys.webp",
    imageAlt: "QR anahtarlık etiketi ve cüzdandaki iletişim kartı",
  },
  {
    id: "pets",
    title: "Evcil Hayvan",
    icon: Heart,
    category: "Pati Dostlarımız",
    headline: "Dostunu bulan kişi sana ulaşabilsin.",
    description:
      "QR etiketini tasmasına ekle. Dostunu bulan kişi site üzerinden sana mesaj gönderebilsin.",
    material: "Tasma Madalyonu",
    dimensions: "20mm x 20mm",
    image: "/images/use-cases/pets.webp",
    imageAlt: "Tasmasında QR künye taşıyan golden retriever",
  },
  {
    id: "bike",
    title: "Bisiklet & Scooter",
    icon: Bike,
    category: "Mobilite",
    headline: "Üzerinde numaran değil, QR etiketin olsun.",
    description:
      "Etiketi görülebilen uygun bir yüzeye yerleştir. Bisikletini veya scooter’ını bulan kişi sana haber verebilsin.",
    material: "Su Geçirmez Vinil Sticker",
    dimensions: "40mm x 40mm",
    image: "/images/use-cases/bike.webp",
    imageAlt: "Kadrosunda QR etiketi bulunan bordo şehir bisikleti",
  },
  {
    id: "camera",
    title: "Fotoğraf & Ekipman",
    icon: Camera,
    category: "Prodüksiyon & Çanta",
    headline: "Çekimden geriye eşyan kalmasın.",
    description:
      "Etiketi ekipmanına veya taşıma çantana ekle. Unutulduğunda bulan kişi sana mesaj gönderebilsin.",
    material: "Mat Ekipman Stickerı",
    dimensions: "30mm x 30mm",
    image: "/images/use-cases/camera.webp",
    imageAlt: "QR etiketli kanvas çantasında fotoğraf makinesi",
  },
];

export const UseCasesSection = () => {
  const [activeTab, setActiveTab] = useState(USE_CASES[0]);

  return (
    <section id="nerede-kullanilir" className="mx-auto max-w-[1180px] px-4 sm:px-8 py-14 sm:py-20 md:py-28 min-h-[100dvh] flex flex-col justify-center">
      
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
          <Sparkles className="w-3.5 h-3.5" />
          <span>Yanından ayırmadıkların için</span>
        </motion.div>

        <motion.h2
          variants={fadeInUp}
          className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-extrabold text-ink tracking-tight leading-[1.15]"
        >
          Birçok eşyaya, aynı kolaylık.
        </motion.h2>

        <motion.p
          variants={fadeInUp}
          className="mt-3.5 sm:mt-5 text-sm sm:text-lg md:text-[19px] text-ink-soft leading-relaxed"
        >
          Çantandan anahtarına, bavulundan evcil hayvanının tasmasına kadar QR etiketini uygun bir yüzeye ekleyebilirsin.
        </motion.p>
      </motion.div>

      <p className="text-center text-xs text-ink-soft mb-6">Etiketi kullanmadan önce basılı hâlini telefon kameranla dene.</p>

      {/* Category Buttons with Hand-Drawn Wobbly Borders & Stagger */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer(0.08)}
        className="flex items-center justify-start sm:justify-center gap-2.5 overflow-x-auto pb-4 mb-10 no-scrollbar"
      >
        {USE_CASES.map((uc) => {
          const Icon = uc.icon;
          const isSelected = activeTab.id === uc.id;
          return (
            <motion.button
              key={uc.id}
              variants={fadeInUp}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setActiveTab(uc)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-xs sm:text-[13.5px] font-bold whitespace-nowrap transition-all duration-150 ${
                isSelected
                  ? "text-ink translate-y-[-1px]"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <WobblyButtonFrame fill={isSelected ? "#F2B63C" : "#FFFDF7"} stroke="#33302B" strokeWidth={isSelected ? 1.6 : 1.1} />
              <Icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{uc.title}</span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Active Showcase Card with Smooth Transitions */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeInScale}
        className="max-w-4xl mx-auto"
      >
        <div className="relative p-8 sm:p-10 text-ink">
          <WobblyCardFrame fill="#FFFDF7" stroke="#33302B" strokeWidth={1.8} className="drop-shadow-[0_4px_20px_rgba(51,48,43,0.08)]" />

          {/* Washi tape */}
          <div className="absolute -top-3 left-14 z-20 w-24 h-5.5 bg-gold/90 -rotate-2 rounded-[1px] border border-ink/20 shadow-xs pointer-events-none overflow-hidden">
            <svg className="w-full h-full opacity-35" viewBox="0 0 70 16">
              <line x1="5" y1="0" x2="18" y2="16" stroke="#5C3E08" strokeWidth="1.5" />
              <line x1="25" y1="0" x2="38" y2="16" stroke="#5C3E08" strokeWidth="1.5" />
              <line x1="45" y1="0" x2="58" y2="16" stroke="#5C3E08" strokeWidth="1.5" />
            </svg>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10"
            >
              
              {/* Left Details */}
              <div className="md:col-span-7 flex flex-col justify-between">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded bg-gold/40 border border-ink/25 text-xs font-bold text-ink uppercase tracking-wider mb-3">
                    {activeTab.category}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-ink leading-snug">
                    {activeTab.headline}
                  </h3>
                  <p className="mt-3.5 text-[14.5px] text-ink-soft leading-relaxed">
                    {activeTab.description}
                  </p>
                </div>

                <div className="mt-7 pt-5 border-t border-ink/10 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-ink-soft font-medium uppercase tracking-wider block text-[11px]">
                      Önerilen Baskı
                    </span>
                    <span className="font-bold text-ink mt-0.5 block text-[13px]">
                      {activeTab.material}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-soft font-medium uppercase tracking-wider block text-[11px]">
                      Örnek baskı boyutu
                    </span>
                    <span className="font-bold text-ink mt-0.5 block text-[13px]">
                      {activeTab.dimensions}
                    </span>
                  </div>
                </div>
              </div>

              {/* Illustrative use-case photograph */}
              <figure className="relative md:col-span-5 aspect-[3/2] overflow-hidden rounded-xl border border-ink/15 bg-paper-hover">
                <Image
                  src={activeTab.image}
                  alt={activeTab.imageAlt}
                  fill
                  sizes="(max-width: 767px) 90vw, 360px"
                  className="object-cover"
                />
                <figcaption className="absolute bottom-2 right-2 rounded bg-paper-card/95 px-2 py-1 text-[9px] font-medium text-ink-soft shadow-sm">
                  Temsili görsel
                </figcaption>
              </figure>

            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

    </section>
  );
};
