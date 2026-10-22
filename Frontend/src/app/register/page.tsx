"use client";
import { safeReturnPath } from "@/lib/navigation";
import { GoogleSignIn } from "@/components/auth/GoogleSignIn";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  ArrowRight,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  WobblyCardFrame,
  WobblyBoxFrame,
  WobblyButtonFrame,
} from "@/components/ui/SketchBorders";
import {
  staggerContainer,
  fadeInUp,
  fadeInScale,
  shakeAnimation,
} from "@/lib/animations";
import { authApi } from "@/lib/api";
import { haptic } from "@/lib/haptics";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [redirectParam, setRedirectParam] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const r = params.get("redirect");
      if (r) {
        setRedirectParam(safeReturnPath(r, "/studio"));
      }
    }
  }, []);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: "", color: "bg-neutral-200", width: "w-0" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass) && pass.length >= 8) score += 1;

    if (score <= 1) return { score: 1, text: "Zayıf", color: "bg-rose-500", width: "w-1/4" };
    if (score === 2) return { score: 2, text: "Orta", color: "bg-amber-500", width: "w-2/4" };
    if (score === 3) return { score: 3, text: "İyi", color: "bg-emerald-500", width: "w-3/4" };
    return { score: 4, text: "Çok Güçlü ✓", color: "bg-emerald-600", width: "w-full" };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!agreeTerms) {
      haptic.error();
      setErrorMessage("Kayıt olmak için Kullanım Koşulları ve KVKK Aydınlatma Metni'ni onaylamalısınız.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.register({
        email,
        password,
        full_name: fullName,
        redirect_path: safeReturnPath(redirectParam, "/studio"),
      });

      router.push(`/verify-email?email=${encodeURIComponent(response.email)}&redirect=${encodeURIComponent(safeReturnPath(redirectParam, "/studio"))}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen dot-grid-pattern text-ink flex flex-col justify-between p-6 sm:p-8 selection:bg-gold selection:text-ink">
      {/* Top Header Logo */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-5xl flex items-center justify-between"
      >
        <Link href="/" className="inline-flex items-center gap-2 group">
          <motion.div
            whileHover={{ scale: 1.08, rotate: -4 }}
            whileTap={{ scale: 0.92 }}
            className="w-8 h-8 flex items-center justify-center text-ink -rotate-2 group-hover:rotate-0 transition-transform relative"
          >
            <WobblyBoxFrame fill="#F2B63C" stroke="#33302B" strokeWidth={1.3} />
            <QrCode className="w-4 h-4 relative z-10" />
          </motion.div>
          <span className="font-bold text-[20px] tracking-tight text-ink">
            kayıp<span className="text-gold-dark">qr</span>
          </span>
        </Link>

        <Link
          href="/"
          className="text-xs sm:text-sm font-medium text-ink-soft hover:text-ink hover:underline transition-colors"
        >
          ← Ana Sayfaya Dön
        </Link>
      </motion.header>

      {/* Center Auth Card with Staggered Entrance */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInScale}
        className="w-full max-w-[440px] mx-auto my-8 relative"
      >
        {/* Top Washi Masking Tape */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 w-32 h-5.5 bg-gold/90 -rotate-1 rounded-[2px] border border-ink/25 shadow-xs pointer-events-none overflow-hidden">
          <svg className="w-full h-full opacity-35" viewBox="0 0 90 16">
            <line x1="5" y1="0" x2="20" y2="16" stroke="#5C3E08" strokeWidth="1.5" />
            <line x1="25" y1="0" x2="40" y2="16" stroke="#5C3E08" strokeWidth="1.5" />
            <line x1="45" y1="0" x2="60" y2="16" stroke="#5C3E08" strokeWidth="1.5" />
            <line x1="65" y1="0" x2="80" y2="16" stroke="#5C3E08" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Main Card Container */}
        <div className="relative p-7 sm:p-9 text-ink">
          <WobblyCardFrame fill="#FFFDF7" stroke="#33302B" strokeWidth={1.8} className="drop-shadow-[0_8px_24px_rgba(51,48,43,0.1)]" />

          <motion.div
            variants={staggerContainer(0.07, 0.1)}
            initial="hidden"
            animate="visible"
          >
            {/* Card Title */}
            <motion.div variants={fadeInUp} className="text-center pb-5 mb-5 border-b border-ink/10 relative z-10">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-gold/40 px-2.5 py-0.5 rounded-full border border-ink/20 mb-2">
                <Sparkles className="w-3 h-3" />
                <span>1 Dakikada Hazır</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                Ücretsiz Hesap Aç
              </h1>
              <p className="text-xs sm:text-[13px] text-ink-soft mt-1">
                İlk KayıpQR etiketini oluşturmak için hemen başla.
              </p>
            </motion.div>

            {/* Error Message Box with Shake */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  key="error" role="alert" id="auth-form-error"
                  variants={shakeAnimation}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 relative z-10"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              
              {/* Full Name Field */}
              <motion.div variants={fadeInUp}>
                <label htmlFor="register-name" className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Adın Soyadın
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    id="register-name" name="name" autoComplete="name" maxLength={255} value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Örn: Duran Kaya"
                    className="w-full px-3.5 py-3 bg-white rounded-[10px] border-[1.5px] border-ink text-ink font-medium text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-gold transition-all"
                  />
                </div>
              </motion.div>

              {/* Email Field */}
              <motion.div variants={fadeInUp}>
                <label htmlFor="register-email" className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> E-posta Adresi
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    id="register-email" name="email" aria-describedby={errorMessage ? "auth-form-error" : undefined} autoComplete="email" maxLength={255} value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@kayipqr.com"
                    className="w-full px-3.5 py-3 bg-white rounded-[10px] border-[1.5px] border-ink text-ink font-medium text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-gold transition-all"
                  />
                </div>
              </motion.div>

              {/* Password Field */}
              <motion.div variants={fadeInUp}>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="register-password" className="block text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Şifre
                  </label>
                  {password && (
                    <span className={`text-[10px] font-bold ${
                      strength.score <= 1 ? "text-rose-600" : strength.score === 2 ? "text-amber-600" : "text-emerald-700"
                    }`}>
                      {strength.text}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    id="register-password" name="password" aria-describedby={errorMessage ? "auth-form-error" : undefined} autoComplete="new-password" maxLength={128} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                    className="w-full pl-3.5 pr-10 py-3 bg-white rounded-[10px] border-[1.5px] border-ink text-ink font-medium text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-gold transition-all"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink transition-colors p-2 min-w-10 min-h-10"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Password Strength Dynamic Meter */}
                {password && (
                  <div className="mt-1.5 h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                  </div>
                )}
              </motion.div>

              {/* Terms Checkbox */}
              <motion.div variants={fadeInUp} className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-ink text-gold focus:ring-gold accent-gold cursor-pointer"
                />
                <label htmlFor="terms" className="text-[12px] text-ink-soft leading-snug cursor-pointer">
                  <Link href="/terms" target="_blank" className="text-ink font-semibold underline hover:text-gold-dark">
                    Kullanım Koşulları
                  </Link>{" "}
                  ve{" "}
                  <Link href="/kvkk" target="_blank" className="text-ink font-semibold underline hover:text-gold-dark">
                    KVKK Aydınlatma Metni
                  </Link>
                  'ni okudum, kabul ediyorum.
                </label>
              </motion.div>

              {/* Submit Button */}
              <GoogleSignIn redirect={safeReturnPath(redirectParam, "/studio")} disabled={!agreeTerms || isLoading} disabledReason={!agreeTerms ? "Google ile devam etmek için önce yukarıdaki koşul kutusunu onayla." : undefined} />
              <motion.div variants={fadeInUp} className="pt-2">
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full py-3.5 px-6 text-ink font-bold text-sm active:translate-y-[1.5px] transition-all flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer"
                >
                  <WobblyButtonFrame fill="#F2B63C" stroke="#33302B" strokeWidth={1.75} />
                  <span className="relative z-10 flex items-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Hesap oluşturuluyor...</span>
                      </>
                    ) : (
                      <>
                        <span>Kayıt Ol & E-postanı Doğrula</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </span>
                </motion.button>
              </motion.div>

            </form>

            {/* Bottom Switch to Login */}
            <motion.div variants={fadeInUp} className="mt-6 pt-5 border-t border-ink/10 text-center text-xs text-ink-soft relative z-10">
              <span>Zaten bir hesabın var mı? </span>
              <Link
                href={redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : "/login"}
                className="font-bold text-ink underline decoration-gold decoration-2 hover:text-gold-dark transition-colors"
              >
                Giriş Yap
              </Link>
            </motion.div>
          </motion.div>

        </div>

        {/* Value Highlights Under Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-ink-soft"
        >
          <span className="flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-700" /> Kredi kartı gerekmez
          </span>
          <span>·</span>
          <span>Dijital etiket</span>
          <span>·</span>
          <span>Baskı sana ait</span>
        </motion.div>

      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mx-auto w-full max-w-5xl text-center text-[11.5px] text-ink-soft pt-4"
      >
        © {new Date().getFullYear()} KayıpQR. Tüm hakları saklıdır.
      </motion.footer>
    </main>
  );
}
