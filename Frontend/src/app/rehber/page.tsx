import Link from "next/link";
import { GuideLinks } from "@/components/guides/GuideLinks";
import { JsonLd } from "@/components/seo/JsonLd";
import { guides } from "@/content/guides";
import { publicMetadata, SITE_URL } from "@/lib/seo";

export const metadata = publicMetadata("QR Etiket Rehberleri: Kayıp Eşya, Valiz ve Anahtarlık", "QR etiketini oluşturma, bastırma ve kullanma rehberleri. Kayıp eşya, valiz ve anahtarlık için kişisel bilgilerini koruyan iletişim önerileri.", "/rehber");

export default function GuidesPage() {
  return <main>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "KayıpQR etiket rehberleri", url: `${SITE_URL}/rehber`, inLanguage: "tr-TR", hasPart: guides.map(guide => ({ "@type": "WebPage", name: guide.title, url: `${SITE_URL}/rehber/${guide.slug}` })) }} />
    <div className="max-w-[1180px] mx-auto px-6 sm:px-8 pt-10 sm:pt-16">
      <nav aria-label="İçerik yolu" className="text-sm text-ink-soft mb-8"><Link className="underline" href="/">Ana sayfa</Link><span aria-hidden="true"> / </span>Rehberler</nav>
      <p className="text-xs uppercase tracking-widest text-gold-dark font-bold mb-4">Nasıl hazırlanır, nasıl kullanılır?</p>
      <h1 className="max-w-3xl text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">Eşyan için doğru QR etiketini hazırla.</h1>
      <p className="max-w-2xl text-ink-soft text-base sm:text-lg leading-relaxed mt-6">Bir kod oluşturmaktan daha fazlası: okunabilir baskı, doğru yerleştirme ve kişisel bilgilerini paylaşmadan iletişim. Kullanacağın eşyaya göre rehberini seç.</p>
    </div>
    <GuideLinks />
    <p className="max-w-[1180px] mx-auto px-6 sm:px-8 pb-12 text-sm text-ink-soft leading-relaxed">KayıpQR dijital etiket oluşturur; fiziksel baskıyı sen temin edersin. Bir GPS takip sistemi değildir ve eşyanın bulunmasını garanti etmez.</p>
  </main>;
}
