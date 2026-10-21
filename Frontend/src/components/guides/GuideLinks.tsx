import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { guides } from "@/content/guides";

export function GuideLinks({ exclude }: { exclude?: string }) {
  return <section aria-labelledby="guide-links-title" className="mx-auto max-w-[1180px] px-6 sm:px-8 py-12 sm:py-16">
    <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div><p className="text-xs uppercase tracking-widest font-bold text-gold-dark mb-2">Etiketten iletişime</p><h2 id="guide-links-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight">{exclude ? "Diğer rehberler" : "QR etiket rehberleri"}</h2></div>
      <Link href="/rehber" className="text-sm font-bold underline underline-offset-4">Tüm rehberler</Link>
    </div>
    <div className={`grid gap-5 ${exclude ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
      {guides.filter(guide => guide.slug !== exclude).map(guide => <Link key={guide.slug} href={`/rehber/${guide.slug}`} className="group bg-paper-card border border-ink/20 rounded-2xl p-6 shadow-xs hover:border-ink/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
        <p className="text-xs font-bold text-gold-dark mb-3">{guide.label}</p>
        <h3 className="font-extrabold text-lg leading-snug flex gap-3 justify-between">{guide.title}<ArrowUpRight size={20} className="shrink-0" aria-hidden="true" /></h3>
        <p className="text-sm text-ink-soft leading-relaxed mt-3">{guide.description}</p>
        <span className="inline-block text-sm font-bold mt-5 group-hover:underline">Rehberi oku →</span>
      </Link>)}
    </div>
  </section>;
}
