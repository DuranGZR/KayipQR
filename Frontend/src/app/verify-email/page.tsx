"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, setAuthSession } from "@/lib/api";
import { AccountSketchStyles } from "@/components/dashboard/AccountSketchStyles";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || ""); setEmail(params.get("email") || "");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  useEffect(() => { if (!remaining) return; const timer = setTimeout(() => setRemaining(value => Math.max(0, value - 1)), 1000); return () => clearTimeout(timer); }, [remaining]);
  const verify = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try { const result = await authApi.verifyEmail(token); setAuthSession(result.access_token, result.user, true); router.replace("/dashboard"); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen dot-grid-pattern flex items-center justify-center p-6"><AccountSketchStyles /><section className="app-card max-w-md w-full space-y-5">
    <Link href="/" className="font-bold">kayıpqr</Link><h1 className="font-extrabold text-2xl">E-posta adresini doğrula</h1>
    <p className="text-sm text-ink-soft leading-relaxed">{token ? "Hesabını sen oluşturduysan aşağıdaki düğmeyle adresini doğrula ve hesabına giriş yap." : "Kayıt sırasında gönderdiğimiz bağlantıyı e-postandan aç. Mesaj gelmediyse veya bağlantının süresi dolduysa yeniden isteyebilirsin."}</p>
    {error && <p role="alert" className="app-error">{error}</p>}{message && <p role="status" className="text-sm text-[#1E7E75]">{message}</p>}
    {token && <button className="app-button app-button-primary w-full" disabled={busy} onClick={verify}>{busy ? "Doğrulanıyor…" : "Adresimi doğrula ve giriş yap"}</button>}
    <form className="space-y-4 border-t border-ink/10 pt-5" onSubmit={async event => {
      event.preventDefault(); if (busy || remaining) return; setBusy(true); setError("");
      try { const result = await authApi.resendVerification(email.trim()); setMessage(result.message); setRemaining(result.retry_after); }
      catch (cause) { const failure = cause as Error & {retryAfter?: number}; setError(failure.message); setRemaining(failure.retryAfter || 0); }
      finally { setBusy(false); }
    }}><label className="app-label" htmlFor="verify-email">E-posta adresin</label><input className="app-input" id="verify-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /><button className="app-button w-full" disabled={busy || remaining > 0}>{remaining ? `${remaining} saniye sonra yeniden iste` : "Doğrulama e-postasını yeniden gönder"}</button></form>
    <Link href="/login" className="block underline text-sm">Giriş sayfasına dön</Link>
  </section></main>;
}
