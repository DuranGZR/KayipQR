"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { googleAuthApi, setAuthSession } from "@/lib/api";
import { AccountSketchStyles } from "@/components/dashboard/AccountSketchStyles";

export default function GoogleCallback() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    window.history.replaceState(null, "", window.location.pathname);
    const ticket = params.get("ticket");
    if (!ticket) { setError(params.get("error") === "use_password" ? "Bu adres için mevcut hesabına e-posta ve şifrenle giriş yap. Google hesap eşleştirmesi tamamlanamadı." : "Google ile giriş tamamlanamadı veya iptal edildi. Yeniden deneyebilirsin."); return; }
    googleAuthApi.exchange(ticket).then(result => {
      setAuthSession(result.access_token, result.user, true);
      const redirect = params.get("redirect") || "/dashboard";
      router.replace(["/dashboard", "/studio", "/messages", "/settings"].includes(redirect.split("?")[0]) && !redirect.includes("\\") ? redirect : "/dashboard");
    }).catch(cause => setError((cause as Error).message));
  }, [router]);
  return <main className="min-h-screen dot-grid-pattern flex items-center justify-center p-6"><AccountSketchStyles /><section className="app-card max-w-md w-full text-center"><h1 className="font-extrabold text-2xl mb-4">Google ile giriş</h1>{error ? <><p role="alert" className="app-error mb-5">{error}</p><Link href="/login" className="app-button">Giriş sayfasına dön</Link></> : <p role="status">Hesabına giriş yapılıyor…</p>}</section></main>;
}
