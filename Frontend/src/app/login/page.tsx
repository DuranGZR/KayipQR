"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
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
import { authApi, setAuthSession } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [redirectParam, setRedirectParam] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const r = params.get("redirect");
      if (r && r.startsWith("/") && !r.startsWith("//")) {
        setRedirectParam(r);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await authApi.login({
        email,
        password,
      });

      // Save token and user info honoring rememberMe
      setAuthSession(response.access_token, response.user, rememberMe);

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      router.push(redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard");
    } catch (err: any) {
      setErrorMessage(err.message || "E-posta veya şifre hatalı. Lütfen tekrar deneyin.");
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
        className="w-full max-w-[420px] mx-auto my-8 relative"
      >
        {/* Top Washi Masking Tape */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 w-28 h-5.5 bg-gold/90 -rotate-2 rounded-[2px] border border-ink/25 shadow-xs pointer-events-none overflow-hidden">
          <svg className="w-full h-full opacity-35" viewBox="0 0 80 16">
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
            variants={staggerContainer(0.08, 0.1)}
            initial="hidden"
            animate="visible"
          >
            {/* Card Title */}
            <motion.div variants={fadeInUp} className="text-center pb-5 mb-5 border-b border-ink/10 relative z-10">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-gold/40 px-2.5 py-0.5 rounded-full border border-ink/20 mb-2">
                <Sparkles className="w-3 h-3" />
                <span>Güvenli Oturum</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
                Tekrar Hoş Geldin
              </h1>
              <p className="text-xs sm:text-[13px] text-ink-soft mt-1">
                Eşyalarını ve mesajlarını yönetmek için giriş yap.
              </p>
            </motion.div>

            {/* Error Message Box with Shake */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  key="error"
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
              
              {/* Email Field */}
              <motion.div variants={fadeInUp}>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> E-posta Adresi
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@kayipqr.com"
                    className="w-full px-3.5 py-3 bg-white rounded-[10px] border-[1.5px] border-ink text-ink font-medium text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-gold transition-all"
                  />
                </div>
              </motion.div>

              {/* Password Field */}
              <motion.div variants={fadeInUp}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Şifre
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-ink-soft hover:text-ink hover:underline transition-colors"
                  >
                    Şifremi unuttum
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-3.5 pr-10 py-3 bg-white rounded-[10px] border-[1.5px] border-ink text-ink font-medium text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-gold transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink transition-colors p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Remember Me */}
              <motion.div variants={fadeInUp} className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-ink text-gold focus:ring-gold accent-gold cursor-pointer"
                />
                <label htmlFor="remember" className="text-xs font-medium text-ink-soft cursor-pointer">
                  Beni bu cihazda hatırla
                </label>
              </motion.div>

              {/* Submit Button */}
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
                        <span>Giriş yapılıyor...</span>
                      </>
                    ) : (
                      <>
                        <span>Giriş Yap</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </span>
                </motion.button>
              </motion.div>

            </form>

            {/* Bottom Switch to Register */}
            <motion.div variants={fadeInUp} className="mt-6 pt-5 border-t border-ink/10 text-center text-xs text-ink-soft relative z-10">
              <span>Henüz bir hesabın yok mu? </span>
              <Link
                href={redirectParam ? `/register?redirect=${encodeURIComponent(redirectParam)}` : "/register"}
                className="font-bold text-ink underline decoration-gold decoration-2 hover:text-gold-dark transition-colors"
              >
                Ücretsiz Kayıt Ol
              </Link>
            </motion.div>
          </motion.div>

        </div>

        {/* Micro Security Footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-4 text-center text-[11.5px] text-ink-soft flex items-center justify-center gap-1.5"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>KVKK Uyumlu · Bilgileriniz asla 3. şahıslara açılmaz</span>
        </motion.p>

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
