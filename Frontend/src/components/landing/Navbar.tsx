"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { QrCode, ArrowRight } from "lucide-react";
import { WobblyNavFrame, WobblyButtonFrame, WobblyBoxFrame } from "@/components/ui/SketchBorders";

export const Navbar = () => {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [logoBounced, setLogoBounced] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem("kayipqr_token")));
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogoClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      setLogoBounced(true);
      setTimeout(() => setLogoBounced(false), 600);
    }
  };

  return (
    <>
      {/* ================= MOBILE HEADER (< md) - CLEAN DOCKED STICKY HEADER ================= */}
      <header className="md:hidden sticky top-0 z-40 bg-[#FAF6EE]/95 backdrop-blur-md px-3.5 py-2.5 border-b border-ink/15 flex items-center justify-between shadow-2xs">
        <Link
          href="/"
          onClick={handleLogoClick}
          className="inline-flex items-center gap-1.5"
        >
          <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center text-ink shadow-[0_1.5px_0px_#33302B] -rotate-2 relative">
            <WobblyBoxFrame stroke="#33302B" strokeWidth={1.3} />
            <QrCode className="w-3.5 h-3.5 relative z-10" />
          </div>
          <span className="font-bold text-base tracking-tight text-ink">
            kayıp<span className="text-gold-dark">qr</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={isLoggedIn ? "/dashboard" : "/login"}
            className="text-xs font-bold text-ink px-2 py-1 rounded-lg hover:bg-paper-hover"
          >
            {isLoggedIn ? "Eşyalarım" : "Giriş yap"}
          </Link>

          <Link
            href={isLoggedIn ? "/studio" : "/register"}
            className="relative inline-flex items-center gap-1 text-ink font-extrabold text-[11.5px] px-3 py-1.5 rounded-lg bg-gold active:scale-95 transition-transform shadow-xs"
          >
            <WobblyButtonFrame stroke="#33302B" strokeWidth={1.4} />
            <span className="relative z-10">QR oluştur</span>
            <ArrowRight className="w-3 h-3 relative z-10" />
          </Link>
        </div>
      </header>

      {/* ================= DESKTOP FLOATING NAVBAR (md:flex) ================= */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="hidden md:flex fixed top-4 sm:top-5 left-0 right-0 z-50 justify-center px-4 pointer-events-none"
      >
        <nav
          className={`pointer-events-auto relative w-full max-w-[820px] px-4 sm:px-6 py-2.5 flex items-center justify-between transition-all duration-300 ${
            scrolled
              ? "drop-shadow-[0_12px_32px_rgba(51,48,43,0.18)]"
              : "drop-shadow-[0_8px_24px_rgba(51,48,43,0.12)]"
          }`}
        >
          <WobblyNavFrame fill="#FFFDF7" stroke="#33302B" strokeWidth={1.7} />

          {/* Brand Logo */}
          <Link
            href="/"
            onClick={handleLogoClick}
            className="inline-flex items-center gap-2 group relative z-10 cursor-pointer"
          >
            <motion.div
              animate={
                logoBounced
                  ? { scale: [1, 1.25, 0.9, 1.1, 1], rotate: [0, -12, 12, -4, 0] }
                  : {}
              }
              whileHover={{ scale: 1.08, rotate: -4 }}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.4 }}
              className="w-8 h-8 flex items-center justify-center text-ink -rotate-2 group-hover:rotate-0 transition-transform relative"
            >
              <WobblyBoxFrame fill="#F2B63C" stroke="#33302B" strokeWidth={1.3} />
              <QrCode className="w-4 h-4 relative z-10" />
            </motion.div>
            <span className="font-bold text-[19px] sm:text-[20px] tracking-tight text-ink">
              kayıp<span className="text-gold-dark">qr</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-4 sm:gap-6 text-[13.5px] sm:text-[14px] font-semibold text-ink/85 relative z-10">
            <a
              href="#nasil-calisir"
              className="hidden md:inline-block hover:text-ink hover:underline hover:decoration-gold hover:decoration-2 hover:underline-offset-4 transition-colors"
            >
              Nasıl Çalışır?
            </a>
            <a
              href="#ozellikler"
              className="hidden md:inline-block hover:text-ink hover:underline hover:decoration-gold hover:decoration-2 hover:underline-offset-4 transition-colors"
            >
              Özellikler
            </a>
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="hover:text-ink hover:underline hover:decoration-gold hover:decoration-2 hover:underline-offset-4 transition-colors"
            >
              {isLoggedIn ? "Eşyalarım" : "Giriş yap"}
            </Link>

            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Link
                href={isLoggedIn ? "/studio" : "/register"}
                className="relative inline-flex items-center gap-1.5 text-ink font-bold text-xs sm:text-sm px-3.5 py-1.5 sm:px-4 sm:py-2 active:translate-y-[1.5px] transition-all"
              >
                <WobblyButtonFrame fill="#F2B63C" stroke="#33302B" strokeWidth={1.5} />
                <span className="relative z-10">QR oluştur</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10" />
              </Link>
            </motion.div>
          </div>
        </nav>
      </motion.header>
    </>
  );
};
