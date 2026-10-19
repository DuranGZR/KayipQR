"use client";

import React, { useState } from "react";
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
import { WobblyCardFrame, WobblyBoxFrame, WobblyButtonFrame } from "@/components/ui/SketchBorders";
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
    sampleMsg: "Merhaba, kafede unuttuğunuz Space Gray MacBook çantanızı baristaya bıraktım!",
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
    sampleMsg: "İstanbul-İzmir uçuşunda bavulunuz karışmış, 4 numaralı bagaj bandı yanındayım.",
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
    sampleMsg: "Apartman girişinde anahtar demetinizi buldum, yönetici odasındayım.",
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
    sampleMsg: "Parkta Golden cinsi köpeğinizi bulduk, veteriner kliniğinde bekliyoruz.",
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
    sampleMsg: "Metro çıkışında kilitli unuttuğunuz kırmızı bisikletinizi gördüm.",
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
    sampleMsg: "Stüdyoda unuttuğunuz Sony lens çantasını resepsiyona teslim ettim.",
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

              {/* Right: Message Simulation Box with Wobbly Box Frame */}
              <div className="md:col-span-5">
                <div className="relative p-5 space-y-3">
                  <WobblyBoxFrame fill="#FFFFFF" stroke="#33302B" strokeWidth={1.5} />

                  <div className="flex items-center gap-2 pb-2 border-b border-ink/10 relative z-10 text-xs font-bold text-ink">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 border border-ink" />
                    <span>Örnek mesaj</span>
                  </div>

                  <div className="p-3 rounded-lg bg-paper-hover border border-ink/15 text-[12.5px] text-ink leading-relaxed relative z-10">
                    "{activeTab.sampleMsg}"
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-ink-soft relative z-10">
                    <span>🔒 Telefon numarası paylaşmadan</span>
                    <span className="font-bold text-emerald-700">Site üzerinden mesajlaşma</span>
                  </div>
                </div>
              </div>

            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

    </section>
  );
};
