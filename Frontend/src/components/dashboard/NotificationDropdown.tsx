"use client";
import { useNotifications } from "@/lib/useNotifications";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, QrCode, MessageCircle, ArrowUpRight } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { NotificationData } from "@/lib/api";
import { decodeHtmlEntities } from "@/lib/utils";

export function NotificationDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const feed = useNotifications();
  const { items, error, busy, reload: load } = feed;
  const unread = items.filter(item => !item.is_read);
  const read = items.filter(item => item.is_read);
  const select = async (item: NotificationData) => {
    if (!item.is_read && !await feed.mark(item.id)) return;
    setOpen(false);
    if (item.link?.startsWith("/") && !item.link.startsWith("//")) router.push(item.link);
  };
  const groups = [{ label: "Yeni", items: unread }, { label: "Öncekiler", items: read }];
  return <>
    <button className="app-icon-button relative" aria-label={feed.unreadCount ? `Bildirimler, ${feed.unreadCount} okunmamış` : "Bildirimler"} onClick={() => { setOpen(true); load(); }}>
      <Bell size={21} />{(feed.unreadCount ?? 0) > 0 && <span className="absolute top-1 right-0 min-w-4 h-4 rounded-full bg-[#1E7E75] text-white text-[10px] font-bold px-1">{(feed.unreadCount ?? 0) > 9 ? "9+" : feed.unreadCount}</span>}
    </button>
    <Sheet open={open} onClose={() => setOpen(false)} title="Bildirimlerin">
      {error && <div className="app-error mb-4" role="alert">{error}<button onClick={load} className="block underline py-2 font-bold">Yeniden dene</button></div>}
      {(feed.unreadCount ?? 0) > 0 && <button className="app-button w-full mb-5" disabled={busy} onClick={() => feed.mark()}><CheckCheck size={18} />{busy ? "Güncelleniyor…" : "Tümünü okundu işaretle"}</button>}
      <button className="app-button mb-4" aria-pressed={feed.unreadOnly} onClick={() => feed.setUnreadOnly(!feed.unreadOnly)}>{feed.unreadOnly ? "Tüm bildirimleri göster" : "Yalnızca okunmamışlar"}</button>
      {feed.loading && <p role="status">Bildirimler yükleniyor…</p>}
      {!items.length && !error && !feed.loading && <div className="text-center py-12"><Bell size={36} className="mx-auto text-ink/25 mb-4" /><p className="font-bold">Şimdilik her şey sakin.</p><p className="text-sm text-ink-soft mt-2">Yeni mesajlar ve QR taramaları burada görünecek.</p></div>}
      {groups.map(group => group.items.length > 0 && <section key={group.label} className="mb-5">
        <h3 className="app-eyebrow mb-3">{group.label}</h3>
        <div className="space-y-2">{group.items.map(item => <button key={item.id} disabled={feed.busy} data-unread={!item.is_read} onClick={() => select(item)} className={`app-card app-notification w-full flex gap-3 text-left !p-5 ${item.is_read ? "bg-white border-ink/10" : "bg-gold/10 border-gold/40"}`}>
          <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${item.type === "new_message" ? "bg-[#e2eee8] text-[#1E7E75]" : "bg-gold/25 text-ink"}`}>{item.type === "new_message" ? <MessageCircle size={19} /> : <QrCode size={19} />}</span>
          <span className="min-w-0 flex-1"><span className="block font-bold text-sm">{decodeHtmlEntities(item.title)}</span><span className="block text-sm text-ink-soft mt-1 leading-relaxed break-words">{decodeHtmlEntities(item.body)}</span><time className="block text-xs text-ink-soft mt-2">{new Date(item.created_at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time></span>
          {!item.is_read ? <span className="w-2 h-2 rounded-full bg-[#1E7E75] mt-1" /> : <ArrowUpRight size={16} className="text-ink/30" />}
        </button>)}</div>
      </section>)}
      {feed.hasMore && <button className="app-button w-full" disabled={feed.loadingMore || feed.loading} onClick={feed.loadMore}>Daha fazla bildirim</button>}
    </Sheet>
  </>;
}

