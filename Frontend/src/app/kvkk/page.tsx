import React from "react";
import { publicMetadata } from "@/lib/seo";
import Link from "next/link";
import { QrCode, ArrowLeft, Shield, Scale, UserCheck, FileCheck } from "lucide-react";
import { WobblyCardFrame, WobblyBoxFrame } from "@/components/ui/SketchBorders";
import { Footer } from "@/components/landing/Footer";

export const metadata = publicMetadata("KVKK Aydınlatma Metni", "6698 Sayılı Kişisel Verilerin Korunması Kanunu kapsamında KayıpQR aydınlatma metni.", "/kvkk");

export default function KvkkPage() {
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
                <Scale className="w-3.5 h-3.5 text-blue-800" />
                <span>İçindekiler</span>
              </h4>
              <nav className="space-y-1 text-xs">
                <a href="#kvkk-1" className="block py-1.5 px-2 rounded-lg hover:bg-gold/30 text-ink-soft hover:text-ink font-medium transition-colors">
                  1. Veri Sorumlusu
                </a>
                <a href="#kvkk-2" className="block py-1.5 px-2 rounded-lg hover:bg-gold/30 text-ink-soft hover:text-ink font-medium transition-colors">
                  2. İşlenme Amaçları
                </a>
                <a href="#kvkk-3" className="block py-1.5 px-2 rounded-lg hover:bg-gold/30 text-ink-soft hover:text-ink font-medium transition-colors">
                  3. İlgili Kişinin Hakları
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
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/70 border border-blue-300 text-blue-900 text-xs font-bold mb-2">
                    <Scale className="w-3.5 h-3.5" />
                    <span>6698 Sayılı Kanun Uyarınca</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                    KVKK Aydınlatma Metni
                  </h1>
                  <p className="text-xs text-ink-soft mt-1">
                    Kişisel Verilerin Korunması ve İşlenmesi Hakkında Bilgilendirme
                  </p>
                </div>

                {/* KVKK Content */}
                <div className="space-y-6 text-xs text-ink-soft leading-relaxed">
                  <section id="kvkk-1" className="space-y-2 scroll-mt-6">
                    <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gold-dark" /> 1. Veri Sorumlusu Sıfatı
                    </h2>
                    <p>
                      6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, <strong>KayıpQR Dijital İletişim Platformu</strong> (“KayıpQR”, İletişim: <strong>contact@durangezer.com</strong>) olarak kişisel verileriniz veri sorumlusu sıfatıyla aşağıda açıklanan çerçevede, hukuka ve dürüstlük kurallarına uygun olarak işlenmektedir.
                    </p>
                  </section>

                  <section id="kvkk-2" className="space-y-2 scroll-mt-6">
                    <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-gold-dark" /> 2. Kişisel Verilerin İşlenme Amaçları
                    </h2>
                    <p>
                      Kişisel verileriniz KVKK'nın 5. ve 6. maddelerinde belirtilen şartlara uygun olarak:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>KayıpQR platformu üzerinden QR kod oluşturulması, özelleştirilmesi ve yönetilmesi,</li>
                      <li>Kayıp eşyayı bulan üçüncü kişilerin eşya sahibiyle gizlilik esasına dayalı anonim iletişim kurabilmesi,</li>
                      <li>Kullanıcı hesaplarının güvenliğinin sağlanması ve şifre sıfırlama süreçlerinin yürütülmesi,</li>
                      <li>Yasal yükümlülüklerin yerine getirilmesi amacıyla işlenmektedir.</li>
                    </ul>
                  </section>

                  <section id="kvkk-3" className="space-y-2 scroll-mt-6">
                    <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-gold-dark" /> 3. İlgili Kişinin Hakları (Madde 11)
                    </h2>
                    <p>
                      KVKK’nın 11. maddesi uyarınca veri sahipleri;
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Kişisel verilerinin işlenip işlenmediğini öğrenme,</li>
                      <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
                      <li>Kişisel verilerin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
                      <li>Kişisel verilerin silinmesini veya yok edilmesini isteme haklarına sahiptir.</li>
                    </ul>
                    <p className="pt-2">
                      Barındırma ve veritabanı hizmetleri, Resend e-posta gönderimi ve isteğe bağlı Google girişi için hizmetin gerektirdiği veriler ilgili sağlayıcılarca işlenebilir. Sohbet fotoğrafları 30 gün sonrasındaki günlük bakımda kaldırılır; yazılı mesajlar ilgili kayıt silinene kadar saklanır. Haklarınıza ilişkin taleplerinizi <strong>contact@durangezer.com</strong> e-posta adresi üzerinden iletebilirsiniz.
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
