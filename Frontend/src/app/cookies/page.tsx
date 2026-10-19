import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { QrCode, ArrowLeft, Cookie, Info, ToggleLeft } from "lucide-react";
import { WobblyCardFrame, WobblyBoxFrame } from "@/components/ui/SketchBorders";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Çerez (Cookie) Politikası | KayıpQR",
  description: "KayıpQR çerez kullanımı ve yerel depolama politikası.",
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen dot-grid-pattern text-ink flex flex-col justify-between selection:bg-gold selection:text-ink">
      {/* Header */}
      <header className="mx-auto w-full max-w-5xl px-6 sm:px-8 py-8 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center text-ink shadow-[0_1.5px_0px_#33302B] -rotate-2 group-hover:rotate-0 transition-transform relative">
            <WobblyBoxFrame stroke="#33302B" strokeWidth={1.3} />
            <QrCode className="w-4 h-4 relative z-10" />
          </div>
          <span className="font-bold text-[20px] tracking-tight text-ink">
            kayıp<span className="text-gold-dark">qr</span>
          </span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-ink-soft hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ana Sayfaya Dön</span>
        </Link>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-8 py-6 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Sticky Table of Contents */}
          <div className="hidden lg:block lg:col-span-4 sticky top-8 space-y-3">
            <div className="bg-paper-card p-5 rounded-2xl border border-ink/20 shadow-xs space-y-3">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5 pb-2 border-b border-ink/10">
                <Cookie className="w-3.5 h-3.5 text-amber-800" />
                <span>İçindekiler</span>
              </h4>
              <nav className="space-y-1 text-xs">
                <a href="#cookie-1" className="block py-1.5 px-2 rounded-lg hover:bg-gold/30 text-ink-soft hover:text-ink font-medium transition-colors">
                  1. Çerez Nedir?
                </a>
                <a href="#cookie-2" className="block py-1.5 px-2 rounded-lg hover:bg-gold/30 text-ink-soft hover:text-ink font-medium transition-colors">
                  2. Çerez Türleri
                </a>
                <a href="#cookie-3" className="block py-1.5 px-2 rounded-lg hover:bg-gold/30 text-ink-soft hover:text-ink font-medium transition-colors">
                  3. Çerez Yönetimi
                </a>
              </nav>
            </div>
          </div>

          {/* Right Main Text Content */}
          <div className="lg:col-span-8 relative">
            <div className="relative p-6 sm:p-10 bg-paper-card rounded-2xl border border-ink/20 shadow-md">
              <WobblyCardFrame fill="#FFFDF7" stroke="#33302B" strokeWidth={1.8} />

              <div className="relative z-10 space-y-6">
                {/* Title Section */}
                <div className="border-b border-ink/10 pb-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/70 border border-amber-300 text-amber-900 text-xs font-bold mb-2">
                    <Cookie className="w-3.5 h-3.5" />
                    <span>Çerezler ve Yerel Depolama</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                    Çerez Politikası
                  </h1>
                  <p className="text-xs text-ink-soft mt-1">
                    Web sitemizde kullanılan çerez türleri ve yönetim yöntemleri hakkında bilgiler.
                  </p>
                </div>

                {/* Cookies Content */}
                <div className="space-y-6 text-xs text-ink-soft leading-relaxed">
                  <section id="cookie-1" className="space-y-2 scroll-mt-6">
                    <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                      <Info className="w-4 h-4 text-gold-dark" /> 1. Çerez (Cookie) Nedir?
                    </h2>
                    <p>
                      Çerezler, ziyaret ettiğiniz internet siteleri tarafından tarayıcınıza veya cihazınıza kaydedilen küçük metin dosyalarıdır. KayıpQR, kullanıcı deneyimini iyileştirmek, oturum güvenliğini sağlamak ve tercihlerinizi hatırlamak için çerezler ve yerel depolama (Local Storage) kullanmaktadır.
                    </p>
                  </section>

                  <section id="cookie-2" className="space-y-2 scroll-mt-6">
                    <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                      <ToggleLeft className="w-4 h-4 text-gold-dark" /> 2. Kullandığımız Çerez Türleri
                    </h2>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>
                        <strong>Zorunlu / Teknik Çerezler:</strong> Web sitesinin düzgün çalışması, güvenli oturum açma (JWT token yönetimi) ve anonim sohbet oturumunun sürdürülmesi için teknik olarak zorunludur.
                      </li>
                      <li>
                        <strong>İşlevsel Çerezler:</strong> Dil seçimi, QR tasarım stüdyosu tercihleri ve çerez onay tercihinizin hatırlanması için kullanılır.
                      </li>
                      <li>
                        <strong>Performans ve Analitik:</strong> Sayfa ziyaret sayıları ve hata loglarının anonim olarak tespit edilmesini sağlar. Üçüncü şahıslara kişisel reklam hedeflemesi amacıyla aktarılmaz.
                      </li>
                    </ul>
                  </section>

                  <section id="cookie-3" className="space-y-2 scroll-mt-6">
                    <h2 className="text-sm sm:text-base font-bold text-ink">
                      3. Çerez Tercihlerini Yönetme
                    </h2>
                    <p>
                      Tarayıcınızın ayarlarından çerezleri dilediğiniz zaman silebilir, engelleyebilir veya uyarı verilmesini sağlayabilirsiniz. Ancak zorunlu oturum çerezlerinin engellenmesi durumunda KayıpQR yönetim paneline giriş yapılamayabilir.
                    </p>
                  </section>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
