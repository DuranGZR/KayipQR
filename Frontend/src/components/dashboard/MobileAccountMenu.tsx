"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, MessageCircle, Package, QrCode, Settings, X } from "lucide-react";

export function MobileAccountMenu({ itemsCount, unreadCount = 0 }: { itemsCount?: number; unreadCount?: number }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const links = [
    { href: "/dashboard", label: "Eşyalarım", icon: Package, count: itemsCount },
    { href: "/studio", label: "QR Tasarım Stüdyosu", icon: QrCode },
    { href: "/messages", label: "Gelen Mesajlar", icon: MessageCircle, count: unreadCount || undefined },
    { href: "/settings", label: "Hesabım ve Ayarlar", icon: Settings },
  ];

  return <div ref={root} className="relative shrink-0" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <button ref={trigger} type="button" aria-label={open ? "Menüyü kapat" : "Menüyü aç"} aria-expanded={open} aria-controls={id}
      className="app-button !min-h-11 !p-2.5 !gap-1.5" onClick={() => setOpen(value => !value)}>
      {open ? <X size={21} /> : <Menu size={21} />}<span className="text-xs">Menü</span>
      {!open && unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-600" aria-label={`${unreadCount} okunmamış mesaj`} />}
    </button>
    {open && <nav id={id} aria-label="Hesap gezinmesi" className="app-card absolute right-0 top-[calc(100%+12px)] w-[min(300px,calc(100vw-36px))] !p-5 z-50 account-menu-panel max-h-[calc(100dvh-84px)] overflow-y-auto">
      <p className="app-eyebrow px-2 mb-3">KAYIPQR · SANA AİT ALAN</p>
      {links.map(({ href, label, icon: Icon, count }) => <Link key={href} href={href}
        aria-current={pathname.startsWith(href) ? "page" : undefined}
        onClick={() => setOpen(false)}
        className={`flex min-h-12 items-center gap-3 px-3 py-3 text-sm font-bold ${pathname.startsWith(href) ? "app-button w-full !justify-start !px-3 !py-3 !gap-3 app-menu-current" : "hover:bg-gold/10"}`}>
        <Icon size={19} /><span className="flex-1">{label}</span>
        {count !== undefined && <span className="text-xs bg-gold/60 px-2 py-0.5 rounded-full">{count}</span>}
      </Link>)}
      <Link href="/" onClick={() => setOpen(false)} className="flex items-center justify-between gap-3 min-h-12 mx-3 mt-3 pt-3 border-t border-ink/15 text-xs text-ink-soft">Ana sayfaya git<ArrowUpRight size={16} /></Link>
    </nav>}
  </div>;
}
