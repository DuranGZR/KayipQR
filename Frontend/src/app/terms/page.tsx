import React from "react";
import { publicMetadata } from "@/lib/seo";
import Link from "next/link";
import { QrCode, ArrowLeft, FileText, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { WobblyCardFrame, WobblyBoxFrame } from "@/components/ui/SketchBorders";
import { Footer } from "@/components/landing/Footer";

export const metadata = publicMetadata("Kullanım Koşulları", "KayıpQR platformu kullanım koşulları, hizmet şartları ve kullanıcı sorumlulukları.", "/terms");

export default function TermsOfServicePage() {
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
          
          {/* Left Sticky Table of Contents (Hidden on mobile) */}
          <div className="hidden lg:block lg:col-span-4 sticky top-8 space-y-3">
            <div className="bg-paper-card p-5 rounded-2xl border border-ink/20 shadow-xs space-y-3">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5 pb-2 border-b border-ink/10">
                <FileText className="w-3.5 h-3.5 text-gold-dark" />
                <span>İçindekiler</span>
              </h4>
              <nav className="space-y-1 text-xs">
                <a href="#section-1" className="block py-1.5 px-2 rounded-lg hover:bg-gold/30 text-ink-soft hover:text-ink font-medium transition-colors">
                  1. Hesap Oluşturma & Güvenlik
                </a>
                <a href="#section-2" className="block py-1.5 px-2 rounded-lg hover:bg-gold/30 text-ink-soft hover:text-ink font-medium transition-colors">
                  2. Yasaklı Davranışlar
                </a>
                <a href="#section-3" className="block py-1.5 px-2 rounded-lg hover:bg-gold/30 text-ink-soft hover:text-ink font-medium transition-colors">
                  3. Sorumluluk Sınırlandırması
                </a>
                <a href="#section-4" className="block py-1.5 px-2 rounded-lg hover:bg-gold/30 text-ink-soft hover:text-ink font-medium transition-colors">
                  4. Değişiklikler & Yürürlük
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
                    <FileText className="w-3.5 h-3.5" />
                    <span>Kullanıcı Sözleşmesi</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                    Kullanım Koşulları
                  </h1>
                  <p className="text-xs text-ink-soft mt-1">
                    Son Güncelleme: 21 Ekim 2026
                  </p>
                </div>

                {/* Core Term Highlight */}
                <div className="p-4 rounded-xl bg-paper-hover border-[1.5px] border-ink/20 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-gold-dark shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-ink">
                    <strong>Hizmet Niteliği:</strong> KayıpQR fiziksel ürün basımı ve kargolaması yapmaz. Platform, kullanıcıların dijital QR kodları oluşturmasına, özelleştirmesine, PDF/PNG çıktısı almasına ve anonim iletişim kurmasına olanak sağlayan bir yazılım hizmetidir.
                  </div>
                </div>

                {/* Terms Sections */}
                <div className="space-y-6 text-xs text-ink-soft leading-relaxed">
                  <section id="section-1" className="space-y-2 scroll-mt-6">
                    <h2 className="text-sm sm:text-base font-bold text-ink">
                      1. Hesap Oluşturma ve Güvenlik
                    </h2>
                    <p>
                      Kullanıcı, hesap oluştururken doğru ve güncel bilgiler sağlamakla yükümlüdür. Yeni e-posta kayıtları adres doğrulaması gerektirir. Google ile giriş de kullanılabilir. Şifre sıfırlama bağlantıları gönderimden itibaren 30 dakika, e-posta doğrulama bağlantıları 24 saat geçerlidir. Hesap şifresinin gizliliği ve hesap üzerinden yapılan tüm işlemler kullanıcının kendi sorumluluğundadır.
                    </p>
                  </section>

                  <section id="section-2" className="space-y-2 scroll-mt-6">
                    <h2 className="text-sm sm:text-base font-bold text-ink">
                      2. Yasaklı Davranışlar ve Kötüye Kullanım
                    </h2>
                    <p>
                      KayıpQR platformunda aşağıdaki faaliyetler kesinlikle yasaktır ve hesapların derhal askıya alınmasına neden olur:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Yasadışı, tehditkar, taciz edici, hakaret içeren veya dolandırıcılık amaçlı mesajlar göndermek.</li>
                      <li>Sistemi spam, otomatik bot veya hizmeti engelleme (DDoS) amacıyla kullanmak.</li>
                      <li>Başkalarına ait eşyaları veya kimlik bilgilerini izinsiz şekilde sisteme kaydetmek.</li>
                    </ul>
                  </section>

                  <section id="section-3" className="space-y-2 scroll-mt-6">
                    <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600" /> 3. Sorumluluğun Sınırlandırılması
                    </h2>
                    <p>
                      KayıpQR, kaybolan eşyaların kesin olarak bulunacağını veya teslim edileceğini garanti etmez. Platform, eşyayı bulan kişi ile sahibi arasında güvenli bir iletişim köprüsü oluşturur; tarafların fiziksel buluşma veya teslimat süreçlerinde güvenlik önlemlerini kendileri alması gerekmektedir.
                    </p>
                  </section>

                  <section id="section-4" className="space-y-2 scroll-mt-6">
                    <h2 className="text-sm sm:text-base font-bold text-ink">
                      4. Değişiklikler ve Yürürlük
                    </h2>
                    <p>
                      KayıpQR, kullanım koşullarını dilediği zaman güncelleme hakkını saklı tutar. Değişiklikler web sitesinde yayınlandığı andan itibaren yürürlüğe girer.
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
