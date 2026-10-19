"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  QrCode,
  Plus,
  Package,
  MessageCircle,
  ShieldCheck,
  LogOut,
  Settings,
} from "lucide-react";
import {
  WobblyBoxFrame,
  WobblyButtonFrame,
} from "@/components/ui/SketchBorders";
import { authApi, getAuthToken, getStoredUser, clearAuthTokens, User } from "@/lib/api";
import { NotificationDropdown } from "./NotificationDropdown";

interface SidebarProps {
  itemsCount?: number;
  unreadCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  itemsCount,
  unreadCount = 0,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setCurrentUser(storedUser);
    }

    const token = getAuthToken();
    if (token) {
      authApi.getMe(token).then((user) => {
        setCurrentUser(user);
        try {
          if (localStorage.getItem("kayipqr_token")) {
            localStorage.setItem("kayipqr_user", JSON.stringify(user));
          }
          sessionStorage.setItem("kayipqr_user", JSON.stringify(user));
        } catch {}
      }).catch(() => {});
    }
  }, []);

  const handleLogout = () => {
    clearAuthTokens();
    router.push("/login");
  };

  const navItems = [
    {
      href: "/dashboard",
      label: "Eşyalarım",
      mobileLabel: "Eşyalar",
      icon: Package,
      badge: itemsCount !== undefined ? itemsCount : null,
      isActive: pathname === "/dashboard",
    },
    {
      href: "/studio",
      label: "QR Tasarım Stüdyosu",
      mobileLabel: "QR Studio",
      icon: QrCode,
      badge: null,
      isActive: pathname === "/studio",
    },
    {
      href: "/messages",
      label: "Gelen Mesajlar",
      mobileLabel: "Mesajlar",
      icon: MessageCircle,
      badge: unreadCount > 0 ? "!" : null,
      isActive: pathname === "/messages",
    },
    {
      href: "/settings",
      label: "Ayarlar",
      mobileLabel: "Ayarlar",
      icon: Settings,
      badge: null,
      isActive: pathname === "/settings",
    },
  ];

  return (
    <>
      {/* ================= MOBILE TOP HEADER (md:hidden) ================= */}
      <header className="md:hidden sticky top-0 z-30 w-full bg-paper-card/95 backdrop-blur-md border-b border-ink/15 px-4 py-2.5 flex items-center justify-between select-none">
        <Link href="/dashboard" className="inline-flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center text-ink shadow-[0_1.5px_0px_#33302B] -rotate-2 relative">
            <WobblyBoxFrame stroke="#33302B" strokeWidth={1.3} />
            <QrCode className="w-3.5 h-3.5 relative z-10" />
          </div>
          <span className="font-bold text-base tracking-tight text-ink">
            kayıp<span className="text-gold-dark">qr</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <NotificationDropdown />
          <Link
            href="/settings"
            className="w-8 h-8 rounded-full bg-gold border border-ink/30 flex items-center justify-center font-bold text-xs text-ink shrink-0"
            title="Hesap Ayarları"
          >
            <span suppressHydrationWarning>
              {currentUser?.full_name ? currentUser.full_name.slice(0, 2).toUpperCase() : "QR"}
            </span>
          </Link>
        </div>
      </header>

      {/* ================= DESKTOP SIDEBAR (md:flex) - UNTOUCHED DESKTOP VIEW ================= */}
      <aside
        className="hidden md:flex w-64 lg:w-72 shrink-0 min-h-screen bg-paper-card border-r border-ink/15 flex-col justify-between p-6 sticky top-0 h-screen z-30 select-none"
      >
        <div className="space-y-6">
          {/* Brand Logo & Notification Bell */}
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="inline-flex items-center gap-2.5 group">
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

            <NotificationDropdown />
          </div>

          {/* New Item CTA in Sidebar */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/studio"
              className="relative w-full py-3 px-4 rounded-[10px] bg-gold hover:bg-gold-dark text-ink font-bold text-xs shadow-[0_2px_0px_#33302B] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <WobblyButtonFrame stroke="#33302B" strokeWidth={1.5} />
              <Plus className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Yeni QR Etiketi Oluştur</span>
            </Link>
          </motion.div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.href}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href={item.href}
                    className={`relative flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors ${
                      item.isActive
                        ? "text-ink font-bold"
                        : "text-ink-soft hover:text-ink hover:bg-paper-hover"
                    }`}
                  >
                    {item.isActive && (
                      <motion.div
                        layoutId="activeSidebarPill"
                        className="absolute inset-0 bg-gold/40 border border-ink/30 rounded-xl shadow-xs"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    
                    <div className="relative z-10 flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-ink" />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== null && (
                      <span
                        className={`relative z-10 px-2 py-0.5 rounded-md text-[10.5px] ${
                          item.badge === "!"
                            ? "bg-rose-500 text-white font-black animate-pulse"
                            : "bg-gold text-ink font-bold"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: User profile & secure logout */}
        <div className="pt-4 border-t border-ink/10 space-y-3">
          <div className="p-3 bg-white rounded-xl border border-ink/15 shadow-xs flex items-center justify-between">
            <Link
              href="/settings"
              className="flex items-center gap-2.5 min-w-0 flex-1 group cursor-pointer hover:opacity-80 transition-opacity"
              title="Hesap Ayarlarına Git"
            >
              <div suppressHydrationWarning className="w-8 h-8 rounded-full bg-gold border border-ink/30 flex items-center justify-center font-bold text-xs text-ink shrink-0 group-hover:scale-105 transition-transform">
                {currentUser?.full_name ? currentUser.full_name.slice(0, 2).toUpperCase() : "QR"}
              </div>
              <div className="min-w-0 flex-1">
                <div suppressHydrationWarning className="font-bold text-xs text-ink truncate group-hover:text-gold-dark transition-colors">
                  {currentUser?.full_name || "Kullanıcı"}
                </div>
                <div suppressHydrationWarning className="text-[10.5px] text-ink-soft truncate">
                  {currentUser?.email || ""}
                </div>
              </div>
            </Link>

            <motion.button
              whileHover={{ scale: 1.15, rotate: 6 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLogout}
              title="Çıkış Yap"
              className="w-7 h-7 rounded-lg hover:bg-rose-50 text-ink-soft hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          </div>

          <div className="text-[10.5px] text-center text-ink-soft flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-700" />
            <span>KayıpQR Güvenli Oturum</span>
          </div>
        </div>

      </aside>

      {/* ================= MOBILE BOTTOM NAVIGATION (md:hidden) ================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-ink/15 px-2 py-1.5 flex items-center justify-around shadow-[0_-3px_12px_rgba(0,0,0,0.06)] pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
                item.isActive ? "text-ink font-bold" : "text-ink-soft hover:text-ink"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all relative ${
                  item.isActive ? "bg-gold text-ink shadow-2xs scale-105" : "text-ink-soft"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.badge !== null && (
                  <span
                    className={`absolute -top-1 -right-1.5 px-1 py-0.2 rounded-full text-[9px] font-black ${
                      item.badge === "!"
                        ? "bg-rose-500 text-white animate-pulse"
                        : "bg-ink text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${item.isActive ? "font-bold text-ink" : "font-medium text-ink-soft"}`}>
                {item.mobileLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
};
