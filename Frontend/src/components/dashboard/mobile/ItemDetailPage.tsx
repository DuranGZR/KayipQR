"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MoreHorizontal, Package, Download, MessageCircle, Pencil, ArrowUpRight, ScanLine, Clock, MapPin, Pause, Play, Trash2, Flag } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Sheet } from "@/components/ui/Sheet";
import { DynamicQrRenderer } from "@/components/ui/DynamicQrRenderer";
import { QrExportPanel } from "@/components/dashboard/QrExportPanel";
import { ItemStatus, itemStates } from "@/components/dashboard/ItemStatus";
import { useToast } from "@/components/ui/ToastProvider";
import { itemsApi, scansApi, ItemData, QRScanData, getAuthToken, getMediaUrl, getPublicAppUrl } from "@/lib/api";
import { decodeHtmlEntities } from "@/lib/utils";

export default function ItemDetail() {
  const params = useParams(); const router = useRouter(); const toast = useToast();
  const id = String(params.id);
  const [item, setItem] = useState<ItemData | null>(null);
  const [scans, setScans] = useState<QRScanData[]>([]);
  const [error, setError] = useState("");
  const [scanError, setScanError] = useState("");
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!getAuthToken()) { router.replace("/login"); return; }
    setLoading(true); setError("");
    try { setItem(await itemsApi.get(id)); }
    catch (cause) { setError((cause as Error).message); }
    finally { setLoading(false); }
    try { setScans(await scansApi.getItemScans(id)); setScanError(""); }
    catch { setScanError("Tarama geçmişi yüklenemedi."); }
  }, [id, router]);
  useEffect(() => { load(); if (new URLSearchParams(window.location.search).get("delete")) setDeleteOpen(true); }, [load]);
  const update = async (task: () => Promise<ItemData>) => {
    if (busy) return; setBusy(true);
    try { setItem(await task()); setStatusOpen(false); setMenu(false); toast.success("Eşyan güncellendi."); }
    catch (cause) { toast.error((cause as Error).message); }
    finally { setBusy(false); }
  };
  const qr = item?.qr_code;
  const toggleActive = async () => {
    if (!item || busy) return;
    const previous = item;
    setItem({ ...item, is_active: !item.is_active }); setBusy(true);
    try { setItem(await itemsApi.toggleActive(item.id)); toast.success(previous.is_active ? "QR yayını duraklatıldı." : "QR yayını aktif."); }
    catch (cause) { setItem(previous); toast.error((cause as Error).message); }
    finally { setBusy(false); }
  };
  const exportPanel = item && qr && <QrExportPanel config={{ itemName: item.name, uniqueCode: qr.unique_code, designId: qr.frame_type, dotColor: qr.color_dark, bgColor: qr.color_light, frameText: qr.frame_text }} />;
  return <div className="app-shell min-h-screen flex flex-col md:flex-row">
    <Sidebar />
    <main className="app-main">
      <header className="flex items-center gap-3 mb-6"><Link href="/dashboard" className="app-icon-button bg-paper-card border border-ink/10" aria-label="Eşyalarıma dön"><ArrowLeft size={21} /></Link><span className="text-sm font-bold flex-1">Eşya detayları</span><button className="app-icon-button" aria-label="Eşya işlemleri" onClick={() => setMenu(true)} disabled={!item}><MoreHorizontal size={23} /></button></header>
      {loading ? <div className="app-card h-72 skeleton-shimmer" role="status" aria-label="Eşya yükleniyor" /> : error ? <div className="app-card text-center"><p className="app-error" role="alert">{error}</p><button onClick={load} className="app-button mt-4">Yeniden dene</button></div> : item && <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-6 items-start">
        <div className="space-y-5">
          <section className="app-card">
            <div className="flex justify-between items-start gap-3"><span className="w-[76px] h-[76px] rounded-[22px] bg-[#eae5d9] flex items-center justify-center overflow-hidden">{item.image_url ? <img src={getMediaUrl(item.image_url)} alt={item.name} className="w-full h-full object-cover" /> : <Package size={35} className="text-[#847660]" />}</span><ItemStatus status={item.status} /></div>
            <h1 className="text-[28px] font-extrabold leading-tight break-words mt-5">{decodeHtmlEntities(item.name)}</h1><p className="text-sm text-ink-soft mt-2">{item.category}</p>
            <div className="grid grid-cols-2 gap-3 mt-6"><button className="app-button app-button-primary !px-2" onClick={() => setExportOpen(true)}><Download size={18} />QR’ı indir</button><Link href="/messages" className="app-button !px-2"><MessageCircle size={18} />Mesajlar</Link></div>
            <button className="flex items-center justify-between w-full text-sm pt-5 mt-5 border-t border-ink/10 min-h-12" onClick={() => setStatusOpen(true)}><span className="flex gap-2 items-center font-bold"><Flag size={17} />Durumunu değiştir</span><ArrowUpRight size={18} /></button>
          </section>
          <section className="app-card space-y-4"><div className="flex justify-between items-center"><h2 className="font-extrabold text-lg">Eşya bilgileri</h2><Link className="app-icon-button" href={`/studio?edit=${item.id}`} aria-label="Eşya bilgilerini düzenle"><Pencil size={18} /></Link></div>
            <div><p className="text-xs text-ink-soft mb-1">Görünen sahip adı</p><p className="text-[15px] font-semibold">{decodeHtmlEntities(item.owner_display_name) || "Eşya Sahibi"}</p></div>
            <div><p className="text-xs text-ink-soft mb-1">Bulan kişiye notun</p><p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{decodeHtmlEntities(item.description) || "Henüz not eklemedin."}</p>{item.show_desc_to_finder === false && <span className="text-xs text-ink-soft">Bu not bulan kişiye gizli.</span>}</div>
            <div className="flex items-center justify-between border-t border-ink/10 pt-4"><div><p className="font-bold text-sm">QR yayını</p><p className="text-xs text-ink-soft mt-1">{item.is_active ? "Aktif · Bulan kişiler sana ulaşabilir." : "Duraklatıldı · Yeni mesaj alınmaz."}</p></div><input type="checkbox" className="app-switch" checked={item.is_active} disabled={busy} aria-label="QR yayını aktif" onChange={toggleActive} /></div>
          </section>
          <section className="app-card"><div className="flex justify-between items-center mb-5"><h2 className="text-lg font-extrabold">Tarama geçmişi</h2><span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ink/5">{item.total_scans || 0} tarama</span></div>
            {scanError ? <p role="alert" className="app-error">{scanError}<button className="underline block mt-2" onClick={load}>Yeniden dene</button></p> : scans.length ? <ol>{scans.map(scan => <li key={scan.id} className="flex gap-3 py-4 border-b last:border-0 border-ink/10"><span className="w-9 h-9 shrink-0 rounded-xl bg-[#e8eee2] text-[#47623b] flex items-center justify-center"><ScanLine size={17} /></span><div className="flex-1 min-w-0"><p className="font-bold text-sm">{scan.device_type || "Bilinmeyen cihaz"}</p><time className="text-xs text-ink-soft block mt-1">{new Date(scan.scanned_at).toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</time><p className="text-xs text-ink-soft mt-1">{scan.approximate_city || "Bölge bilgisi paylaşılmadı"}</p>{scan.latitude != null && scan.longitude != null && <a className="inline-flex gap-1 items-center text-sm font-bold text-[#1E7E75] mt-2 min-h-10" href={`https://maps.google.com/?q=${scan.latitude},${scan.longitude}`} target="_blank" rel="noreferrer"><MapPin size={15} />Paylaşılan konumu aç</a>}</div></li>)}</ol> : <div className="text-center py-6"><ScanLine className="mx-auto text-ink/25 mb-3" size={30} /><p className="text-sm text-ink-soft leading-relaxed">QR’ın ilk kez okutulduğunda<br />tarama bilgileri burada görünecek.</p></div>}
            {scans.length >= 50 && <p className="text-xs text-ink-soft mt-4">Son 50 tarama gösteriliyor.</p>}
          </section>
        </div>
        <aside className="app-card text-center lg:sticky lg:top-6"><p className="app-eyebrow mb-5">EŞYANIN EVE DÖNÜŞ BİLETİ</p>{qr && <div className="flex justify-center"><DynamicQrRenderer data={qr.public_url || `${getPublicAppUrl()}/q/${qr.unique_code}`} size={240} designId={qr.frame_type} dotColor={qr.color_dark} bgColor={qr.color_light} labelText={qr.frame_text} /></div>}<p className="font-mono text-xs text-ink-soft mt-5">{qr?.unique_code}</p><button className="app-button w-full mt-5" onClick={() => setExportOpen(true)}><Download size={18} />İndir ve kullan</button>{qr && <Link href={`/q/${qr.unique_code}`} target="_blank" className="flex justify-center gap-1.5 items-center text-sm font-bold text-[#1E7E75] min-h-12 mt-2">Bulan kişi ekranını aç<ArrowUpRight size={16} /></Link>}</aside>
      </div>}
    </main>
    <Sheet open={menu} onClose={() => setMenu(false)} title="Eşya işlemleri">{item && <div className="space-y-2"><Link className="app-button w-full" href={`/studio?edit=${item.id}`}><Pencil size={18} />Bilgileri ve tasarımı düzenle</Link><button className="app-button w-full" disabled={busy} onClick={() => update(() => itemsApi.toggleActive(item.id))}>{item.is_active ? <Pause size={18} /> : <Play size={18} />}{item.is_active ? "QR yayınını duraklat" : "QR yayınını aktifleştir"}</button><button className="app-button w-full text-rose-700 !mt-6" onClick={() => { setMenu(false); setDeleteOpen(true); }}><Trash2 size={18} />Eşyayı sil</button></div>}</Sheet>
    <Sheet open={statusOpen} onClose={() => setStatusOpen(false)} title="Eşyanın durumu"><div className="space-y-3">{(Object.keys(itemStates) as ItemData["status"][]).map(key => { const state = itemStates[key]; return <button key={key} disabled={busy} className="app-button w-full justify-start !p-4" onClick={() => item && update(() => itemsApi.updateStatus(item.id, key))}><state.Icon size={22} /><span className="flex-1 text-left"><span className="block">{state.label}</span><span className="block text-xs font-normal text-ink-soft mt-1">{state.hint}</span></span>{item?.status === key && <span>✓</span>}</button>; })}</div></Sheet>
    <Sheet open={exportOpen} onClose={() => setExportOpen(false)} title="Etiketini kullan">{exportPanel}</Sheet>
    <Sheet open={deleteOpen && !!item} onClose={() => setDeleteOpen(false)} title="Bu eşyayı sil?"><p className="text-sm text-ink-soft leading-relaxed mb-5">Eşyan, QR kodun, tarama geçmişin ve ilgili konuşmalar kalıcı olarak silinir. Basılı etiket artık çalışmaz.</p><button className="app-button app-button-danger w-full text-white" disabled={busy} onClick={async () => { if (!item || busy) return; setBusy(true); try { await itemsApi.delete(item.id); router.replace("/dashboard"); } catch (cause) { toast.error((cause as Error).message); setBusy(false); } }}>{busy ? "Siliniyor…" : "Evet, eşyayı sil"}</button><button className="app-button w-full mt-3" onClick={() => setDeleteOpen(false)}>Vazgeç</button></Sheet>
  </div>;
}
