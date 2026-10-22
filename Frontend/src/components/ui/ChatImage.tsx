"use client";
import { ImgHTMLAttributes, useRef, useState } from "react";

// An off-screen image may first load after its signed URL expires. Renew just
// that message once, rather than downloading the whole conversation again.
export function ChatImage({ refresh, alt, ...props }: ImgHTMLAttributes<HTMLImageElement> & { refresh: () => Promise<void> }) {
  const attempted = useRef(false);
  const [unavailable, setUnavailable] = useState(false);
  if (unavailable) return <span className="block p-3 text-xs text-ink-soft" role="status">Fotoğraf yüklenemedi.</span>;
  return <img {...props} alt={alt} loading="lazy" onError={async () => {
    if (attempted.current) { setUnavailable(true); return; }
    attempted.current = true;
    try { await refresh(); } catch { setUnavailable(true); }
  }} />;
}
