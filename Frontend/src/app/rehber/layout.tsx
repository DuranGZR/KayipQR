import Link from "next/link";
import { QrCode } from "lucide-react";
import { Footer } from "@/components/landing/Footer";

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen dot-grid-pattern text-ink">
    <header className="max-w-[1180px] mx-auto px-6 sm:px-8 py-6 flex items-center justify-between gap-4 border-b border-ink/10">
      <Link href="/" aria-label="KayıpQR ana sayfa" className="inline-flex items-center gap-2 font-extrabold text-xl"><span className="bg-gold p-2 rounded-lg -rotate-3"><QrCode size={20} aria-hidden="true" /></span>kayıp<span className="text-gold-dark -ml-2">qr</span></Link>
      <Link href="/register?redirect=/studio" className="bg-gold border border-ink/30 rounded-lg px-4 py-2 text-sm font-bold shadow-xs">Ücretsiz QR oluştur</Link>
    </header>
    {children}
    <Footer />
  </div>;
}
