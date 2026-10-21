import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideLinks } from "@/components/guides/GuideLinks";
import { JsonLd } from "@/components/seo/JsonLd";
import { guides } from "@/content/guides";
import { publicMetadata, SITE_URL } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() { return guides.map(guide => ({ slug: guide.slug })); }
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = guides.find(entry => entry.slug === slug);
  if (!guide) notFound();
  return publicMetadata(guide.title, guide.description, `/rehber/${guide.slug}`);
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = guides.find(entry => entry.slug === slug);
  if (!guide) notFound();
  const pageUrl = `${SITE_URL}/rehber/${guide.slug}`;
  return <main>
    <JsonLd data={{ "@context": "https://schema.org", "@graph": [
      { "@type": "Article", "@id": `${pageUrl}#article`, headline: guide.title, description: guide.description, mainEntityOfPage: pageUrl, inLanguage: "tr-TR", datePublished: `${guide.updated}T12:00:00+03:00`, dateModified: `${guide.updated}T12:00:00+03:00`, image: `${SITE_URL}/opengraph-image`, author: { "@type": "Organization", name: "KayıpQR", url: SITE_URL }, publisher: { "@type": "Organization", name: "KayıpQR", url: SITE_URL } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Ana sayfa", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Rehberler", item: `${SITE_URL}/rehber` }, { "@type": "ListItem", position: 3, name: guide.title, item: pageUrl }] },
    ] }} />
    <div className="max-w-[1180px] mx-auto px-6 sm:px-8 py-8 sm:py-12">
      <nav aria-label="İçerik yolu" className="flex flex-wrap gap-2 text-xs sm:text-sm text-ink-soft mb-10"><Link className="underline" href="/">Ana sayfa</Link><span aria-hidden="true">/</span><Link className="underline" href="/rehber">Rehberler</Link><span aria-hidden="true">/</span><span aria-current="page">{guide.label}</span></nav>
      <article className="grid lg:grid-cols-[minmax(0,1fr)_250px] gap-8 lg:gap-14 items-start">
        <div className="min-w-0 max-w-3xl">
          <header className="mb-10"><p className="font-bold text-gold-dark text-sm mb-4">{guide.label}</p><h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">{guide.title}</h1><p className="text-xs text-ink-soft mt-5">KayıpQR · Güncellendi: <time dateTime={guide.updated}>21 Ekim 2026</time></p><p className="text-base sm:text-lg leading-relaxed text-ink-soft mt-6">{guide.intro}</p></header>
          <nav aria-label="Rehber içindekiler" className="lg:hidden border border-ink/15 rounded-xl bg-paper-card p-5 mb-9"><p className="font-bold mb-3 text-sm">Bu rehberde</p><ol className="space-y-3 text-sm">{guide.sections.map((section, index) => <li key={section.title}><a className="underline underline-offset-4" href={`#bolum-${index + 1}`}>{section.title}</a></li>)}</ol></nav>
          {guide.sections.map((section, index) => <section key={section.title} id={`bolum-${index + 1}`} className="mb-10 scroll-mt-8"><h2 className="text-xl sm:text-2xl font-extrabold mb-4 leading-snug">{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph} className="text-[15px] sm:text-base leading-[1.85] text-ink-soft mb-4">{paragraph}</p>)}{section.tips && <ul className="list-disc pl-5 space-y-3 text-[15px] leading-relaxed text-ink-soft">{section.tips.map(tip => <li key={tip}>{tip}</li>)}</ul>}</section>)}
          <section aria-labelledby="guide-faq" className="border-t border-ink/15 pt-8"><h2 id="guide-faq" className="text-2xl font-extrabold mb-6">Sık sorulan sorular</h2>{guide.questions.map(entry => <div key={entry.question} className="mb-6"><h3 className="font-bold mb-2">{entry.question}</h3><p className="text-ink-soft leading-relaxed text-[15px]">{entry.answer}</p></div>)}</section>
          <section className="bg-gold/20 border border-ink/20 rounded-2xl p-6 sm:p-8 mt-10"><h2 className="text-2xl font-extrabold">Kendi etiketini hazırlamaya başla.</h2><p className="text-sm leading-relaxed text-ink-soft mt-3 mb-6">Eşyanı ekle, tasarımını seç, indirip bastır. Bulan kişi sana KayıpQR üzerinden mesaj gönderebilsin.</p><Link href="/register" className="inline-flex bg-gold border border-ink/30 rounded-lg px-5 py-3 font-bold text-sm">Ücretsiz QR etiketi oluştur →</Link><Link href="/privacy" className="block text-sm underline mt-5">Hangi bilgiler görünür? Gizlilik politikasını oku</Link></section>
        </div>
        <aside className="hidden lg:block sticky top-8 border border-ink/15 rounded-2xl p-5 bg-paper-card"><p className="text-sm font-extrabold mb-4">Bu rehberde</p><ol className="space-y-4 text-sm text-ink-soft">{guide.sections.map((section, index) => <li key={section.title}><a className="hover:underline leading-relaxed" href={`#bolum-${index + 1}`}>{index + 1}. {section.title}</a></li>)}</ol></aside>
      </article>
    </div>
    <GuideLinks exclude={guide.slug} />
  </main>;
}
