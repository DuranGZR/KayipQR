"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";

export function useUnsavedChanges(dirty: boolean) {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);
  const allow = useRef(false);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { if (!allow.current) event.preventDefault(); };
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || anchor.origin !== location.origin || anchor.href === location.href) return;
      event.preventDefault(); event.stopPropagation(); setTarget(anchor.pathname + anchor.search + anchor.hash);
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", click, true); };
  }, [dirty]);
  return <Sheet open={!!target} onClose={() => setTarget(null)} title="Kaydetmeden çıkmak istiyor musun?">
    <p className="text-sm mb-5">Değişikliklerin henüz kaydedilmedi.</p>
    <button className="app-button w-full mb-3" onClick={() => setTarget(null)}>Düzenlemeye devam et</button>
    <button className="app-button w-full" onClick={() => { if (target) { allow.current = true; router.push(target); setTarget(null); } }}>Kaydetmeden çık</button>
  </Sheet>;
}
