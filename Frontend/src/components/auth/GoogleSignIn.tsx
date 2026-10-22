"use client";
import { useEffect, useId, useState } from "react";
import { googleAuthApi } from "@/lib/api";

export function GoogleSignIn({ redirect = "/dashboard", disabled = false, disabledReason }: { redirect?: string; disabled?: boolean; disabledReason?: string }) {
  const reasonId = useId();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => { googleAuthApi.config().then(result => setEnabled(result.enabled)).catch(() => {}); }, []);
  if (!enabled) return null;
  return <div className="relative z-10 mb-5">
    <button type="button" disabled={disabled} aria-describedby={disabledReason ? reasonId : undefined} onClick={() => { window.location.assign(googleAuthApi.startUrl(redirect)); }}
      className="w-full flex items-center justify-center gap-3 rounded-xl border border-ink/25 bg-white px-4 py-3 font-semibold text-sm hover:bg-paper-hover disabled:opacity-50">
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.97-3.38.97-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.93A6 6 0 0 1 6.1 12c0-.67.11-1.32.31-1.93V7.48H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.52l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.48l3.34 2.59C7.2 7.71 9.4 5.95 12 5.95Z"/></svg>
      Google ile devam et
    </button>
    {disabledReason && <p id={reasonId} className="text-center text-xs text-ink-soft mt-2">{disabledReason}</p>}
    <p className="text-center text-xs text-ink-soft mt-3">Devam ederek <a className="underline" href="/terms" target="_blank" rel="noreferrer">kullanım koşullarını</a> kabul eder ve <a className="underline" href="/privacy" target="_blank" rel="noreferrer">gizlilik politikasını</a> okuduğunu belirtirsin.</p>
    <p className="text-center text-xs text-ink-soft mt-4">veya e-posta adresinle devam et</p>
  </div>;
}
