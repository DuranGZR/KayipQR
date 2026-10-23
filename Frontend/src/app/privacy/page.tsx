import React from "react";
import { publicMetadata } from "@/lib/seo";
import Link from "next/link";
import { QrCode, ArrowLeft, ShieldCheck, Lock, EyeOff, Server, UserCheck } from "lucide-react";
import { WobblyCardFrame, WobblyBoxFrame } from "@/components/ui/SketchBorders";
import { Footer } from "@/components/landing/Footer";

export const metadata = publicMetadata("Gizlilik Politikası", "KayıpQR anonim iletişim altyapısı, veri güvenliği ve gizlilik politikası.", "/privacy");

export default function PrivacyPolicyPage() {
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
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>İçindekiler</span>
              </h4>
              <nav className="space-y-1 text-xs">
                <a href="#privacy-1" className="block py-1.5 px-2 rounded-lg hover:bg-gold/30 text-ink-soft hover:text-ink font-medium transition-colors">
                  1. Toplanan Bilgiler
                </a>
                <a href="#privacy-2" className="block py-1.5 px-2 rounded-lg hover:bg-gold/30 text-ink-soft hover:text-ink font-medium transition-colors">
                  2. Kullanım Amacı
                </a>
                <a href="#privacy-3" className="block py-1.5 px-2 rounded-lg hover:bg-gold/30 text-ink-soft hover:text-ink font-medium transition-colors">
                  3. Kullanıcı Hakları & Silme
                </a>
                <a href="#privacy-4" className="block py-1.5 px-2 rounded-lg hover:bg-gold/30 text-ink-soft hover:text-ink font-medium transition-colors">
                  4. İletişim & Güvenlik
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
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 border border-emerald-300 text-emerald-800 text-xs font-bold mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Gizlilik ve Güvenlik İlkelerimiz</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                    Gizlilik Politikası
                  </h1>
                  <p className="text-xs text-ink-soft mt-1">
                    Son Güncelleme: 21 Ekim 2026
                  </p>
                </div>

                {/* Core Privacy Promise */}
                <div className="p-4 rounded-xl bg-gold/20 border-[1.5px] border-ink/20 flex items-start gap-3">
                  <EyeOff className="w-5 h-5 text-amber-900 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-ink">
                    <strong>Temel Gizlilik Prensibimiz:</strong> Hesap e-postanız ve telefon numaranız eşyanızı bulan kişiye otomatik olarak gösterilmez. Görünen adınızda, eşya bilgilerinde veya mesajlarınızda kendiniz paylaştığınız bilgiler karşı tarafa görünür. Bağlantı HTTPS ile korunur; mesajlaşma uçtan uca şifreli değildir.
                  </div>
                </div>

                {/* Policy Sections */}
                <div className="space-y-6 text-xs text-ink-soft leading-relaxed">
                  <section id="privacy-1" className="space-y-2 scroll-mt-6">
                    <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                      <Lock className="w-4 h-4 text-gold-dark" /> 1. Toplanan Bilgiler
                    </h2>
                    <p>
                      KayıpQR platformunu kullandığınızda aşağıdaki sınırlı veriler toplanır ve güvenli sunucularda saklanır:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Hesap Bilgileri:</strong> E-posta adresi, Argon2id parola özeti (eski hesaplarda bcrypt geçiş desteği), doğrulama durumu, isteğe bağlı ad-soyad ve telefon numarası. Google ile giriş seçilirse Google hesap kimliği, doğrulanmış e-posta ve ad bilgisi alınır; Google parolanız alınmaz.</li>
                      <li><strong>Eşya Bilgileri:</strong> Eşya adı, kategori, açıklama, opsiyonel fotoğraf ve QR tasarım ayarları.</li>
                      <li><strong>Tarama ve İletişim Verileri:</strong> QR tarandığında cihaz türü (Mobil/Masaüstü), yaklaşık şehir (IP bazlı genel bölge), bulan kişinin gönderdiği anonim mesajlar ve isteğe bağlı paylaşılan konum bilgileri. Bulan kişi ilk yanıt bildirimini almak isterse e-posta adresi sohbetle birlikte saklanır; eşya sahibine gösterilmez. Sohbet silindiğinde sohbet kaydındaki adres de silinir; gönderim kuyruğundaki kayıtlar teknik saklama süresine tabidir.</li>
                    </ul>
                  </section>

                  <section id="privacy-2" className="space-y-2 scroll-mt-6">
                    <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                      <Server className="w-4 h-4 text-gold-dark" /> 2. Bilgilerin Kullanım Amacı
                    </h2>
                    <p>
                      Toplanan veriler yalnızca şu amaçlarla işlenir:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>QR taramaları ve mesajlar için site içi bildirim oluşturmak. Tercihiniz açıksa yeni konuşmaların yalnızca ilk mesajı için, aynı adrese 15 dakikada en fazla 1 ve 24 saatte en fazla 10 bildirim e-postası göndermek; QR taramalarında ve sonraki mesajlarda e-posta göndermemek.</li>
                      <li>Yeni hesabın e-posta adresini doğrulamak ve talebiniz üzerine şifre sıfırlama bağlantısı göndermek. Şifre sıfırlama talepleri aynı adres için 60 saniyede bir e-posta ile sınırlıdır.</li>
                      <li>Bulan kişi isteğe bağlı e-posta adresini bırakırsa sahibin ilk cevabında, kişiye özel sohbet bağlantısını içeren tek bir bildirim göndermek. Sonraki cevaplarda e-posta gönderilmez. Kötüye kullanımı önlemek için aynı adrese 15 dakikada en fazla 1, 24 saatte en fazla 10 bulan kişi bildirimi gönderilir. Özel bağlantıyı elinde bulunduran kişi sohbete erişebilir; sohbet silindiğinde erişim sona erer.</li>
                      <li>Bulan kişi ile aranızda güvenli ve anonim sohbet oturumu sağlamak.</li>
                      <li>QR kod tarama istatistiklerini ve güvenlik loglarını yönetmek.</li>
                      <li>Spam, bot saldırıları ve kötüye kullanımı engellemek.</li>
                    </ul>
                  </section>

                  <section id="privacy-3" className="space-y-2 scroll-mt-6">
                    <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-gold-dark" /> 3. Kullanıcı Hakları ve Veri Silme
                    </h2>
                    <p>
                      Kullanıcılarımız diledikleri zaman hesap ayarları üzerinden eşyalarını kalıcı olarak silebilir veya hesaplarının tüm verileriyle birlikte silinmesini talep edebilir. Bir eşya silindiğinde, ona bağlı tüm konuşma kayıtları ve QR tarama geçmişi veritabanından kalıcı olarak temizlenir.
                    </p>
                    <p>Sohbet fotoğrafları 30 gün geçtikten sonraki günlük bakımda kaldırılır; yazılı mesajlar hesap veya ilgili kayıt silinene kadar kalır. Yeni mesajların ya da profil/eşya görsellerinin kullandığı ortak dosyalar korunabilir. Sağlayıcı yedeklerindeki kopyalar sağlayıcının saklama süresi boyunca bulunabilir.</p>
                    <p>Barındırma için Vercel ve bağlı veritabanı sağlayıcısı, e-posta gönderimi için Resend kullanılır. Google yalnızca Google ile giriş seçildiğinde kimlik doğrulama akışına katılır. Hizmetlerin çalışması için gerekli veriler bu sağlayıcılar tarafından işlenebilir.</p>
                    <p>Açık sohbette mesajlar yaklaşık 15, konuşma listesi 30, bildirim listesi 60 saniyede bir yenilenir. Gizli sekmelerde yenileme durur. Tarayıcı bildirimleri izin ve açık sayfa gerektirir; site kapalıyken Web Push bildirimi gönderilmez. E-posta teslimi sağlayıcının erişilebilirliğine bağlıdır.</p>
                  </section>

                  <section id="privacy-4" className="space-y-2 scroll-mt-6">
                    <h2 className="text-sm sm:text-base font-bold text-ink">
                      4. İletişim ve Güvenlik Bildirimi
                    </h2>
                    <p>
                      Gizlilik ve veri güvenliği politikalarımız hakkında her türlü soru ve talebiniz için <strong>contact@durangezer.com</strong> adresinden bize dilediğiniz an ulaşabilirsiniz.
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
