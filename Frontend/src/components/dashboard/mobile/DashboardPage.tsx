"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, ArrowUpRight, MoreHorizontal, Package, MessageCircle, Download, Pencil, Flag, Bell, X, ChevronRight, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ItemStatus, itemStates } from "@/components/dashboard/ItemStatus";
import { Sheet } from "@/components/ui/Sheet";
import { DynamicQrRenderer } from "@/components/ui/DynamicQrRenderer";
import { QrExportPanel } from "@/components/dashboard/QrExportPanel";
import { useToast } from "@/components/ui/ToastProvider";
import { itemsApi, ItemData, DashboardStats, getAuthToken, getPublicAppUrl } from "@/lib/api";
import { decodeHtmlEntities } from "@/lib/utils";

function Dashboard() {
  const router = useRouter(); const search = useSearchParams(); const toast = useToast();
  const [items, setItems] = useState<ItemData[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { setShowAll(false); }, [filter, query]);
  const [menu, setMenu] = useState<ItemData | null>(null);
  const [statusItem, setStatusItem] = useState<ItemData | null>(null);
  const [exportItem, setExportItem] = useState<ItemData | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPermission, setShowPermission] = useState(false);
  const load = useCallback(async () => {
    if (!getAuthToken()) { router.replace("/login"); return; }
    setLoading(true); setError("");
    try { const [next, summary] = await Promise.all([itemsApi.list(), itemsApi.getStats().catch(() => null)]); setItems(next); setStats(summary); }
    catch (cause) { setError((cause as Error).message); if (!getAuthToken()) router.replace("/login"); }
    finally { setLoading(false); }
  }, [router]);
  useEffect(() => { load(); setShowPermission("Notification" in window && Notification.permission === "default" && sessionStorage.getItem("kq_notification_dismissed") !== "yes"); }, [load]);
  useEffect(() => { const itemId = search.get("item"); if (itemId) router.replace(`/dashboard/${encodeURIComponent(itemId)}`); }, [search, router]);
  const matches = items.filter(item => (filter === "all" || item.status === filter) && [item.name, item.category, item.qr_code?.unique_code].some(value => decodeHtmlEntities(value).toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR"))));
  const visibleItems = showAll ? matches : matches.slice(0, 6);
  const lost = items.filter(item => item.status === "lost").length;
  const changeStatus = async (status: ItemData["status"]) => {
    if (!statusItem || busy) return; setBusy(true);
    try { const updated = await itemsApi.updateStatus(statusItem.id, status); setItems(previous => previous.map(item => item.id === updated.id ? updated : item)); setStatusItem(null); toast.success("Eşya durumu güncellendi."); }
    catch (cause) { toast.error((cause as Error).message); } finally { setBusy(false); }
  };
  return <div className="app-shell min-h-screen flex flex-col md:flex-row">
    <Sidebar itemsCount={items.length} unreadCount={stats?.unread_messages || 0} />
    <main className="app-main">
      <header className="flex items-center justify-between gap-3 mb-6"><div><p className="app-eyebrow mb-2">HER ŞEY YERLİ YERİNDE</p><h1 className="text-[29px] md:text-3xl font-extrabold tracking-tight">Eşyalarım<span className="text-[#1E7E75]">.</span></h1></div><Link className="app-button app-button-primary !px-4" href="/studio"><Plus size={19} /><span>Ekle</span></Link></header>
      <div className="app-card !px-5 !py-5 flex items-center gap-4 text-sm mb-6"><span className="flex gap-2 items-center font-bold"><Package size={18} />{items.length} eşya</span><span className="w-px h-5 bg-ink/15" /><span className={lost ? "text-[#a24a23] font-bold" : "text-ink-soft"}>{lost} kayıp</span><Link href="/messages" className="ml-auto text-[#1E7E75] font-bold flex items-center gap-1">{stats?.unread_messages ? `${stats.unread_messages} yeni` : "Mesajlar"}<ChevronRight size={16} /></Link></div>
      <div className="flex flex-col lg:flex-row gap-3 mb-5"><div className="relative flex-1"><Search size={20} className="absolute left-4 top-4 text-ink/40" /><input className="app-input !pl-12 bg-paper-card" aria-label="Eşyalarında ara" placeholder="Eşyalarında ara…" value={query} onChange={event => setQuery(event.target.value)} /></div><div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">{[["all", "Tümü"], ["safe", "Güvende"], ["lost", "Kayıp"], ["resolved", "Teslim alındı"]].map(([key, label]) => <button key={key} className="app-chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div></div>
      {error ? <div className="app-card text-center py-10"><p role="alert" className="text-rose-700 mb-5">{error}</p><button className="app-button" onClick={load}>Yeniden dene</button></div> : loading ? <div className="grid grid-cols-2 gap-3" role="status" aria-label="Eşyalar yükleniyor">{[0, 1, 2].map(index => <div key={index} className="app-card h-52 skeleton-shimmer" />)}</div> : items.length === 0 ? <div className="app-card text-center py-12 max-w-lg mx-auto"><div className="w-20 h-20 rounded-[24px] bg-gold/30 flex items-center justify-center mx-auto mb-6 -rotate-6"><Package size={36} /></div><h2 className="text-2xl font-extrabold">İlk eşyanla başlayalım.</h2><p className="text-[15px] leading-relaxed text-ink-soft my-4">Çantan, anahtarın veya pati dostun…<br />Bir QR, eve dönüş için bir yol olsun.</p><Link href="/studio" className="app-button app-button-primary mt-3"><Plus size={19} />İlk QR etiketini oluştur</Link><p className="text-xs text-ink-soft mt-5">Ücretsiz · Birkaç adımda hazır</p></div> : matches.length === 0 ? <div className="app-card text-center py-12"><Search className="mx-auto text-ink/30 mb-4" size={30} /><h2 className="font-bold text-lg">Burada bir eşya bulamadık.</h2><p className="text-sm text-ink-soft mt-2">Başka bir isim veya filtre deneyebilirsin.</p><button className="app-button mt-5" onClick={() => { setQuery(""); setFilter("all"); }}>Filtreleri temizle</button></div> : <div className="grid grid-cols-2 gap-3">
        {visibleItems.map(item => <article key={item.id} className="app-card relative min-w-0 !p-0 overflow-hidden">
          <Link href={`/dashboard/${item.id}`} className="block px-3 pt-4 pb-3 focus-visible:!outline-offset-[-4px]" aria-label={`${decodeHtmlEntities(item.name)} detayları`}>
            <h2 className="text-sm font-extrabold truncate pr-7">{decodeHtmlEntities(item.name)}</h2>
            <p className="text-[11px] text-ink-soft mt-1 truncate">{item.category}</p>
            <div className="flex items-center justify-center h-28 my-2" role="img" aria-label={`${decodeHtmlEntities(item.name)} QR kodu`}>
              {item.qr_code ? <DynamicQrRenderer data={item.qr_code.public_url || `${getPublicAppUrl()}/q/${item.qr_code.unique_code}`} size={104} designId={item.qr_code.frame_type} dotColor={item.qr_code.color_dark} bgColor={item.qr_code.color_light} labelText={item.qr_code.frame_text} className="max-w-full [&>svg]:max-w-full [&>svg]:h-auto" /> : <span className="text-xs text-ink-soft">QR bulunamadı</span>}
            </div>
            <ItemStatus status={item.status} />
            {!item.is_active && <p className="text-[10px] text-rose-700 mt-1">QR duraklatıldı</p>}
            <div className="flex items-center justify-between gap-1 mt-3 pt-2 border-t border-ink/10 text-[11px] text-ink-soft"><span>{item.total_scans || 0} tarama</span>{!!item.unread_messages_count ? <span className="flex gap-1 items-center text-[#1E7E75] font-bold" aria-label={`${item.unread_messages_count} yeni mesaj`}><MessageCircle size={13} />{item.unread_messages_count}</span> : <ArrowUpRight size={14} />}</div>
          </Link>
          <button className="app-icon-button absolute right-0 top-1" aria-label={`${decodeHtmlEntities(item.name)} işlemleri`} onClick={() => setMenu(item)}><MoreHorizontal size={19} /></button>
        </article>)}
      </div>}
      {!loading && !error && !showAll && matches.length > 6 && <button className="app-button w-full mt-5" onClick={() => setShowAll(true)} aria-expanded={false}>Hepsini göster ({matches.length})</button>}
      {items.length > 0 && !loading && !error && showPermission && <div className="app-card mt-6 flex gap-3 items-start"><Bell size={20} className="text-[#a7791c] shrink-0 mt-1" /><div className="flex-1"><p className="text-sm font-bold">Mesajlardan haberin olsun.</p><p className="text-xs leading-relaxed text-ink-soft mt-1">Site açıkken yeni mesaj ve tarama uyarılarını al.</p><button className="text-sm font-bold text-[#1E7E75] min-h-11" onClick={async () => { try { const result = await Notification.requestPermission(); if (result !== "default") setShowPermission(false); if (result === "granted") toast.success("Tarayıcı bildirimleri açıldı."); } catch { toast.error("Bildirim izni alınamadı."); } }}>Bildirimleri aç</button></div><button className="app-icon-button -mr-2 -mt-2" aria-label="Şimdilik kapat" onClick={() => { setShowPermission(false); sessionStorage.setItem("kq_notification_dismissed", "yes"); }}><X size={18} /></button></div>}
      {items.length > 0 && <p className="text-xs text-ink-soft flex gap-2 justify-center mt-8"><CheckMark />Eşya bilgilerin değişse de basılı QR’ın aynı kalır.</p>}
    </main>
    <Sheet open={!!menu} onClose={() => setMenu(null)} title={decodeHtmlEntities(menu?.name) || "Eşya işlemleri"}>{menu && <div className="space-y-2"><Link className="app-button w-full justify-start" href={`/dashboard/${menu.id}`}><Package size={19} />Eşya detayları</Link><Link className="app-button w-full justify-start" href={`/studio?edit=${menu.id}`}><Pencil size={19} />Bilgileri ve tasarımı düzenle</Link><button className="app-button w-full justify-start" onClick={() => { setExportItem(menu); setMenu(null); }}><Download size={19} />QR’ı indir / yazdır</button><button className="app-button w-full justify-start" onClick={() => { setStatusItem(menu); setMenu(null); }}><Flag size={19} />Eşya durumunu değiştir</button><Link className="app-button w-full justify-start" href={`/dashboard/${menu.id}?delete=1`}>Silme ve diğer işlemler</Link></div>}</Sheet>
    <Sheet open={!!statusItem} onClose={() => setStatusItem(null)} title="Eşyanın durumu">{statusItem && <div className="space-y-3">{(Object.entries(itemStates) as [ItemData["status"], typeof itemStates.safe][]).map(([key, state]) => <button key={key} className="app-button w-full !justify-start !p-4" disabled={busy} onClick={() => changeStatus(key)}><state.Icon size={23} /><span className="text-left flex-1"><span className="block font-bold">{state.label}</span><span className="block text-xs text-ink-soft mt-1 font-normal">{state.hint}</span></span>{statusItem.status === key && <span className="text-[#1E7E75]">✓</span>}</button>)}</div>}</Sheet>
    <Sheet open={!!exportItem} onClose={() => setExportItem(null)} title="Etiketini kullan">{exportItem?.qr_code && <QrExportPanel config={{ itemName: exportItem.name, uniqueCode: exportItem.qr_code.unique_code, designId: exportItem.qr_code.frame_type, dotColor: exportItem.qr_code.color_dark, bgColor: exportItem.qr_code.color_light, frameText: exportItem.qr_code.frame_text }} />}</Sheet>
  </div>;
}
function CheckMark() { return <span className="text-[#1E7E75]" aria-hidden="true">✓</span>; }
export default function DashboardPage() { return <Suspense fallback={<p className="p-10">Yükleniyor…</p>}><Dashboard /></Suspense>; }

