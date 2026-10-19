"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  ArrowRight,
  Mail,
  CheckCircle2,
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
import { authApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    try {
      await authApi.forgotPassword(email.trim());
      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "İstek gönderilirken bir hata oluştu.");
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
            className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center text-ink shadow-[0_1.5px_0px_#33302B] -rotate-2 group-hover:rotate-0 transition-transform relative"
          >
            <WobblyBoxFrame stroke="#33302B" strokeWidth={1.3} />
            <QrCode className="w-4 h-4 relative z-10" />
          </motion.div>
          <span className="font-bold text-[20px] tracking-tight text-ink">
            kayıp<span className="text-gold-dark">qr</span>
          </span>
        </Link>

        <Link
          href="/login"
          className="text-xs sm:text-sm font-medium text-ink-soft hover:text-ink hover:underline transition-colors"
        >
          ← Giriş Ekranına Dön
        </Link>
      </motion.header>

      {/* Center Card */}
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
            {/* Title */}
            <motion.div variants={fadeInUp} className="text-center pb-5 mb-5 border-b border-ink/10 relative z-10">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-gold/40 px-2.5 py-0.5 rounded-full border border-ink/20 mb-2">
                <Sparkles className="w-3 h-3" />
                <span>Hesap Kurtarma</span>
              </span>
              <h1 className="text-2xl font-extrabold text-ink tracking-tight">
                Şifreni mi Unuttun?
              </h1>
              <p className="text-xs text-ink-soft mt-1">
                Kayıtlı e-posta adresini gir, sana sıfırlama bağlantısı gönderelim.
              </p>
            </motion.div>

            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  key="error"
                  variants={shakeAnimation}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-900 relative z-10 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
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
                          <span>Gönderiliyor...</span>
                        </>
                      ) : (
                        <>
                          <span>Sıfırlama Bağlantısı Gönder</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </span>
                  </motion.button>
                </motion.div>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4 space-y-3 relative z-10"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-ink">E-posta Gönderildi!</h3>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Eğer <strong>{email}</strong> adresi sistemimizde kayıtlıysa, şifre sıfırlama bağlantısını e-postanıza ilettik.
                </p>
                <p className="text-[11.5px] text-ink-soft bg-paper-hover p-3 rounded-lg border border-ink/10">
                  💡 Lütfen gelen kutunuzu ve spam (gereksiz) klasörünüzü kontrol edin. Bağlantı 30 dakika boyunca geçerlidir.
                </p>

                <div className="pt-2">
                  <Link
                    href="/login"
                    className="relative inline-flex items-center justify-center py-2.5 px-5 rounded-[8px] bg-gold hover:bg-gold-dark text-ink font-bold text-xs shadow-xs"
                  >
                    <WobblyButtonFrame stroke="#33302B" strokeWidth={1.4} />
                    <span className="relative z-10">Giriş Yapmaya Dön</span>
                  </Link>
                </div>
              </motion.div>
            )}

            <motion.div variants={fadeInUp} className="mt-6 pt-5 border-t border-ink/10 text-center text-xs text-ink-soft relative z-10">
              <Link
                href="/login"
                className="font-bold text-ink underline decoration-gold decoration-2 hover:text-gold-dark transition-colors"
              >
                ← Giriş Ekranına Geri Dön
              </Link>
            </motion.div>
          </motion.div>

        </div>

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
