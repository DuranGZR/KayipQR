"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { QrCode, Heart } from "lucide-react";
import { WobblyBoxFrame } from "@/components/ui/SketchBorders";
import { fadeInUp, fadeInScale } from "@/lib/animations";

export const Footer = () => {
  return (
    <motion.footer
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={fadeInUp}
      className="mx-auto max-w-[1180px] px-6 sm:px-8 pt-12 pb-16"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-ink/10">
        {/* Brand */}
        <div className="md:col-span-5 flex flex-col items-start">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center text-ink shadow-[0_1.5px_0px_#33302B] -rotate-2 group-hover:rotate-0 transition-transform relative">
              <WobblyBoxFrame stroke="#33302B" strokeWidth={1.3} />
              <QrCode className="w-4 h-4 relative z-10" />
            </div>
            <span className="font-bold text-[20px] tracking-tight text-ink">
              kayıp<span className="text-gold-dark">qr</span>
            </span>
          </Link>

          <p className="mt-3.5 text-[13.5px] text-ink-soft leading-relaxed max-w-sm">
            KayıpQR, eşyalarını bulan kişilerin telefon numaranı görmeden sana mesaj göndermesini sağlayan QR etiket hizmetidir.
          </p>


        </div>

        {/* Links */}
        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-[13px] font-medium">
          <div>
            <h4 className="font-bold text-ink uppercase tracking-wider text-[11px]">
              Ürün
            </h4>
            <ul className="mt-3 space-y-2 text-ink-soft">
              <li>
                <a href="/#nasil-calisir" className="hover:text-ink hover:underline">
                  Nasıl Çalışır?
                </a>
              </li>
              <li>
                <a href="/#ozellikler" className="hover:text-ink hover:underline">
                  Özellikler
                </a>
              </li>
              <li>
                <a href="/#nerede-kullanilir" className="hover:text-ink hover:underline">
                  Kullanım Alanları
                </a>
              </li>
              <li>
                <Link href="/register" className="hover:text-ink hover:underline">
                  QR Tasarım Stüdyosu
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-ink uppercase tracking-wider text-[11px]">
              Gizlilik ve koşullar
            </h4>
            <ul className="mt-3 space-y-2 text-ink-soft">
              <li>
                <Link href="/privacy" className="hover:text-ink hover:underline">
                  Gizlilik Politikası
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-ink hover:underline">
                  Kullanım Koşulları
                </Link>
              </li>
              <li>
                <Link href="/kvkk" className="hover:text-ink hover:underline">
                  KVKK Aydınlatma
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-ink hover:underline">
                  Çerez Politikası
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-ink uppercase tracking-wider text-[11px]">
              Hesap
            </h4>
            <ul className="mt-3 space-y-2 text-ink-soft">
              <li>
                <Link href="/login" className="hover:text-ink hover:underline">
                  Giriş yap
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-ink hover:underline">
                  Kayıt ol
                </Link>
              </li>
              <li>
                <a href="/#sss" className="hover:text-ink hover:underline">
                  Sıkça Sorulanlar
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-soft">
        <p>© {new Date().getFullYear()} KayıpQR. Tüm hakları saklıdır.</p>
        <p className="flex items-center gap-1">
          <span>Eşyalarınla yeniden buluşman için.</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
        </p>
      </div>
    </motion.footer>
  );
};
