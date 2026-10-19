"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, QrCode } from "lucide-react";
import { WobblyCardFrame, WobblyBoxFrame, WobblyButtonFrame } from "@/components/ui/SketchBorders";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Runtime error caught by error boundary:", error);
  }, [error]);

  return (
    <main className="min-h-screen dot-grid-pattern text-ink flex flex-col justify-between p-6 sm:p-8 selection:bg-gold selection:text-ink">
      {/* Top Header Logo */}
      <header className="mx-auto w-full max-w-5xl flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center text-ink shadow-[0_1.5px_0px_#33302B] -rotate-2 group-hover:rotate-0 transition-transform relative">
            <WobblyBoxFrame stroke="#33302B" strokeWidth={1.3} />
            <QrCode className="w-4 h-4 relative z-10" />
          </div>
          <span className="font-bold text-[20px] tracking-tight text-ink">
            kayıp<span className="text-gold-dark">qr</span>
          </span>
        </Link>
      </header>

      {/* Error Center Card */}
      <div className="w-full max-w-[460px] mx-auto my-auto relative">
        <div className="relative p-8 sm:p-10 text-ink text-center">
          <WobblyCardFrame fill="#FFFDF7" stroke="#33302B" strokeWidth={1.8} className="drop-shadow-[0_12px_32px_rgba(51,48,43,0.12)]" />

          <div className="relative z-10 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100 border-2 border-ink flex items-center justify-center text-rose-800 shadow-[0_4px_0_#33302B] rotate-2">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-rose-700">Beklenmeyen Bir Hata Oluştu</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                Bir Şeyler Ters Gitti
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-ink-soft leading-relaxed max-w-sm mx-auto">
              Sayfa yüklenirken geçici bir sorunla karşılaşıldı. Lütfen sayfayı yenilemeyi deneyin.
            </p>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => reset()}
                className="relative w-full sm:w-auto py-3 px-6 text-ink font-bold text-xs active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <WobblyButtonFrame fill="#F2B63C" stroke="#33302B" strokeWidth={1.5} />
                <span className="relative z-10 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4" />
                  <span>Yeniden Dene</span>
                </span>
              </button>

              <Link
                href="/"
                className="relative w-full sm:w-auto py-3 px-6 text-ink font-bold text-xs active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <WobblyButtonFrame fill="#FFF" stroke="#33302B" strokeWidth={1.5} />
                <span className="relative z-10 flex items-center gap-1.5">
                  <Home className="w-4 h-4" />
                  <span>Ana Sayfa</span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-5xl text-center text-[11.5px] text-ink-soft pt-4">
        © {new Date().getFullYear()} KayıpQR. Tüm hakları saklıdır.
      </footer>
    </main>
  );
}
