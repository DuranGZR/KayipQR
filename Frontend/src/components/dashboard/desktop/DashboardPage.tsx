"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { usePagedList } from "@/lib/usePagedList";
import { qrColorError } from "@/lib/qrPolicy";
import { useDialog } from "@/lib/useDialog";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  Plus,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Download,
  Search,
  Laptop,
  Luggage,
  KeyRound,
  Heart,
  Bike,
  Camera,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  MapPin,
  X,
  Trash2,
  Edit3,
  History,
  Clock,
  Smartphone,
  Loader2,
  PartyPopper,
  BellRing,
} from "lucide-react";
import {
  WobblyCardFrame,
  WobblyBoxFrame,
  WobblyButtonFrame,
} from "@/components/ui/SketchBorders";
import { Sidebar } from "./Sidebar";
import { DynamicQrRenderer, CUSTOM_QR_DESIGNS } from "@/components/ui/DynamicQrRenderer";
import { useToast } from "@/components/ui/ToastProvider";
import { ItemCardSkeleton } from "@/components/ui/Skeleton";
import { haptic } from "@/lib/haptics";
import { decodeHtmlEntities } from "@/lib/utils";
import {
  itemsApi,
  scansApi,
  getPublicAppUrl,
  getAuthToken,
  clearAuthTokens,
  ItemData,
  DashboardStats,
  QRScanData,
} from "@/lib/api";
import { downloadSinglePng, downloadSingleSvg, downloadFullCardPng, printA4Sheet, downloadA4SheetPng } from "@/lib/printEngine";
import {
  staggerContainer,
  fadeInUp,
  fadeInScale,
} from "@/lib/animations";

const CATEGORY_ICONS: Record<string, any> = {
  "laptop": Laptop,
  "Elektronik": Laptop,
  "Laptop & Tablet": Laptop,
  "luggage": Luggage,
  "Seyahat & Valiz": Luggage,
  "Bavul & Çanta": Luggage,
  "keys": KeyRound,
  "Günlük Yaşam": KeyRound,
  "Anahtarlık & Cüzdan": KeyRound,
  "pets": Heart,
  "Evcil Hayvan": Heart,
  "bike": Bike,
  "Bisiklet & Scooter": Bike,
  "camera": Camera,
  "Fotoğraf & Ekipman": Camera,
};

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryItemId = searchParams?.get("item");
  const toast = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [filter, setFilter] = useState<"all" | "safe" | "lost" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const page = usePagedList(`${filter}:${searchQuery}`, offset => itemsApi.list(filter, searchQuery, offset));
  const { items, setItems, loading: isLoading, error } = page;
  const [selectedDownloadItem, setSelectedDownloadItem] = useState<ItemData | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<ItemData | null>(null);
  const [celebrationItem, setCelebrationItem] = useState<ItemData | null>(null);
  const [downloadPreset, setDownloadPreset] = useState<"mix" | "standard" | "nano" | "luggage" | "round">("mix");
  const [showModalA4Options, setShowModalA4Options] = useState(false);
  const [isDownloadingA4, setIsDownloadingA4] = useState(false);
  const [permissionDismissed, setPermissionDismissed] = useState(true);
  const [pushPermission, setPushPermission] = useState<string>("default");
  const [itemScans, setItemScans] = useState<QRScanData[]>([]);
  const [scansError, setScansError] = useState("");
  const [isLoadingScans, setIsLoadingScans] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isTogglingActive, setIsTogglingActive] = useState(false);

  const detailDialog = useDialog(!!selectedDetailItem, () => setSelectedDetailItem(null));
  const exportDialog = useDialog(!!selectedDownloadItem, () => setSelectedDownloadItem(null));
  const celebrationDialog = useDialog(!!celebrationItem, () => setCelebrationItem(null));
  const modalQrRef = useRef<any>(null);
  const modalStickerCardRef = useRef<HTMLDivElement>(null);

  const loadData = async () => { await page.refresh(); try { setStats(await itemsApi.getStats()); } catch { setStats(null); } };
  useEffect(() => { if (!getAuthToken()) { router.replace("/login"); return; } itemsApi.getStats().then(setStats).catch(() => setStats(null)); if ("Notification" in window) { setPushPermission(Notification.permission); setPermissionDismissed(sessionStorage.getItem("kq_notification_dismissed") === "yes"); } }, [router]);

  // Reactively open detail modal when ?item=<id> changes
  useEffect(() => {
    if (queryItemId && items.length > 0) {
      const matchedItem = items.find((i) => i.id === queryItemId);
      if (matchedItem && selectedDetailItem?.id !== matchedItem.id) {
        handleOpenDetailModal(matchedItem);
      }
    }
  }, [queryItemId, items]);

  const requestPushPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Tarayıcınız bildirim desteği sağlamıyor.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission === "granted") {
        toast.success("Tarayıcı bildirimleri aktifleştirildi! Site açık ve görünürken bildirimler yaklaşık dakikada bir kontrol edilir.");
        try {
          new Notification("KayıpQR Bildirimleri Aktif 🔔", {
            body: "Site açık ve görünürken yeni bildirimleri yaklaşık dakikada bir kontrol ederiz.",
          });
        } catch (e) {
          // ignore notification trigger errors
        }
      } else if (permission === "denied") {
        toast.warning("Bildirim izni reddedildi. Tarayıcı kilit simgesinden açabilirsiniz.");
      }
    } catch (e) {
      toast.error("Bildirim izni istenirken bir sorun oluştu.");
    }
  };

  // Load scan logs when detail item is selected
  const handleOpenDetailModal = async (item: ItemData) => {
    setSelectedDetailItem(item);
    setIsLoadingScans(true); setScansError("");
    try {
      const scans = await scansApi.getItemScans(item.id);
      setItemScans(scans);
    } catch (err) {
      setScansError((err as Error).message);
      setItemScans([]);
    } finally {
      setIsLoadingScans(false);
    }
  };

  const handleToggleActive = async (item: ItemData) => {
    setIsTogglingActive(true);
    try {
      const updated = await itemsApi.toggleActive(item.id);
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      setSelectedDetailItem(updated);
      toast.success(updated.is_active ? "✓ QR kodu yayını aktif edildi." : "⏸ QR kodu yayını durduruldu (pasife alındı).");
    } catch (err: any) {
      toast.error(err.message || "Aktiflik durumu değiştirilemedi.");
    } finally {
      setIsTogglingActive(false);
    }
  };

  const handleSetStatus = async (item: ItemData, nextStatus: "safe" | "lost" | "resolved") => {
    try {
      if (nextStatus === "lost") {
        haptic.warning();
      } else {
        haptic.success();
      }
      const updated = await itemsApi.updateStatus(item.id, nextStatus);
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      if (selectedDetailItem?.id === item.id) {
        setSelectedDetailItem(updated);
      }
      const cleanName = decodeHtmlEntities(item.name);
      if (nextStatus === "resolved") {
        setSelectedDetailItem(null);
        setCelebrationItem(updated);
        toast.success(`🎉 ${cleanName} eşyası teslim alındı olarak işaretlendi!`);
      } else if (nextStatus === "lost") {
        toast.warning(`🚨 ${cleanName} kayıp olarak işaretlendi!`);
      } else {
        toast.success(`✓ ${cleanName} güvende olarak güncellendi.`);
      }
      const newStats = await itemsApi.getStats();
      setStats(newStats);
    } catch (err: any) {
      haptic.error();
      toast.error(err.message || "Durum güncellenirken hata oluştu.");
    }
  };

  const toggleItemStatus = async (item: ItemData) => {
    const nextStatus = item.status === "lost" ? "resolved" : item.status === "safe" ? "lost" : "safe";
    await handleSetStatus(item, nextStatus);
  };

  const handleDeleteItem = async (itemId: string) => {
    haptic.warning();
    if (!confirm("Bu eşyayı ve QR kodunu silmek istediğine emin misin?")) return;
    setIsDeletingId(itemId);
    try {
      await itemsApi.delete(itemId);
      haptic.success();
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      if (selectedDetailItem?.id === itemId) setSelectedDetailItem(null);
      const newStats = await itemsApi.getStats();
      setStats(newStats);
      toast.success("Eşya ve QR kodu başarıyla silindi.");
    } catch (err: any) {
      haptic.error();
      toast.error(err.message || "Eşya silinemedi.");
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredItems = items;

  const totalItems = stats?.total_items ?? items.length;
  const safeCount = stats?.safe_items ?? "—";
  const lostCount = stats?.lost_items ?? "—";
  const resolvedCount = stats?.resolved_items ?? "—";

  return (
    <div className="min-h-screen dot-grid-pattern text-ink flex flex-col md:flex-row selection:bg-gold selection:text-ink pb-20 md:pb-0">
      
      {/* Shared Left Sidebar */}
      <Sidebar
        itemsCount={totalItems}
        unreadCount={stats?.unread_messages || 0}
      />

      {/* Main Content Area */}
      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 min-w-0 p-3.5 sm:p-8 lg:p-12 overflow-y-auto"
      >
        
        {/* Push Notification Permission Bar */}
        {pushPermission === "default" && !permissionDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2.5 text-amber-950 font-medium">
              <div className="w-8 h-8 rounded-lg bg-amber-200/60 flex items-center justify-center text-amber-900 shrink-0">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <strong className="font-bold block text-ink">Tarayıcı Bildirimlerini Açın</strong>
                <span>Site açık ve görünürken bildirimleri yaklaşık dakikada bir kontrol ederiz. Site kapalıyken ilk mesaj e-postası tercihiniz geçerlidir.</span>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={requestPushPermission}
              className="px-4 py-2 bg-gold hover:bg-gold-dark text-ink font-bold rounded-xl border border-ink/30 shadow-xs shrink-0 self-end sm:self-auto transition-colors cursor-pointer"
            >
              Bildirimleri Aç 🔔
            </motion.button>
            <button className="app-icon-button" aria-label="Şimdilik kapat" onClick={() => { setPermissionDismissed(true); sessionStorage.setItem("kq_notification_dismissed", "yes"); }}><X size={18} /></button>
          </motion.div>
        )}

        {/* Top Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Eşyalarım & Etiketlerim
            </h1>
            <p className="text-xs sm:text-sm text-ink-soft mt-1">
              {items.length > 0
                ? "QR kodlarının kayıp/güvende durumunu tek tıkla değiştirebilir, tarama geçmişini görebilir ve yazdırabilirsin."
                : "Tüm kayıp eşya koruma etiketlerini buradan yönetebilirsin."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start lg:self-auto">
            {items.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedDownloadItem(items[0] || null)}
                className="relative inline-flex items-center gap-1.5 bg-white hover:bg-paper-hover text-ink font-bold text-xs rounded-[10px] px-3.5 py-2.5 border border-ink/20 shadow-xs transition-all cursor-pointer"
                title="Çoklu A4 Şablonu Yazdır"
              >
                <Printer className="w-3.5 h-3.5 text-ink" />
                <span>Çoklu A4 Baskı</span>
              </motion.button>
            )}

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/studio"
                className="relative inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-ink font-bold text-xs rounded-[10px] px-4 py-2.5 shadow-[0_2px_0px_#33302B] active:translate-y-[1px] transition-all cursor-pointer"
              >
                <WobblyButtonFrame stroke="#33302B" strokeWidth={1.4} />
                <Plus className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Yeni QR Etiketi</span>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Stats Tiles with Staggered Entrance */}
        <motion.div
          variants={staggerContainer(0.08, 0.05)}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8"
        >
          <motion.div
            variants={fadeInUp}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="relative bg-paper-card p-4 sm:p-5 rounded-2xl shadow-xs transition-shadow duration-200"
          >
            <WobblyBoxFrame stroke="#33302B" strokeWidth={1.4} />
            <div className="relative z-10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block mb-1">
                Toplam Eşya
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-ink">{stats ? totalItems : "—"}</span>
                <span className="text-xs text-ink-soft">Etiket</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="relative bg-paper-card p-4 sm:p-5 rounded-2xl shadow-xs transition-shadow duration-200"
          >
            <WobblyBoxFrame stroke="#33302B" strokeWidth={1.4} />
            <div className="relative z-10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                ✓ Güvende
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-900">{safeCount}</span>
                <span className="text-xs text-emerald-700">Adet</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="relative bg-paper-card p-4 sm:p-5 rounded-2xl shadow-xs transition-shadow duration-200"
          >
            <WobblyBoxFrame stroke="#33302B" strokeWidth={1.4} />
            <div className="relative z-10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block mb-1">
                🚨 Kayıp Bildirilen
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-950">{lostCount}</span>
                <span className="text-xs text-amber-800">Aramada</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="relative bg-paper-card p-4 sm:p-5 rounded-2xl shadow-xs transition-shadow duration-200"
          >
            <WobblyBoxFrame stroke="#33302B" strokeWidth={1.4} />
            <div className="relative z-10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 block mb-1">
                🎉 Bulunan & Teslim
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-purple-950">{resolvedCount}</span>
                <span className="text-xs text-purple-700">Başarılı</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Search & Filter Tabs */}
        {(
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  filter === "all"
                    ? "bg-gold text-ink border-ink shadow-xs font-extrabold"
                    : "bg-white text-ink-soft border-ink/20 hover:text-ink"
                }`}
              >
                Tümü ({totalItems})
              </button>
              <button
                onClick={() => setFilter("safe")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  filter === "safe"
                    ? "bg-emerald-100 text-emerald-900 border-emerald-400 shadow-xs font-extrabold"
                    : "bg-white text-ink-soft border-ink/20 hover:text-ink"
                }`}
              >
                ✓ Güvende ({safeCount})
              </button>
              <button
                onClick={() => setFilter("lost")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  filter === "lost"
                    ? "bg-amber-100 text-amber-950 border-amber-400 shadow-xs font-extrabold"
                    : "bg-white text-ink-soft border-ink/20 hover:text-ink"
                }`}
              >
                🚨 Kayıp ({lostCount})
              </button>
              <button
                onClick={() => setFilter("resolved")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  filter === "resolved"
                    ? "bg-purple-100 text-purple-950 border-purple-400 shadow-xs font-extrabold"
                    : "bg-white text-ink-soft border-ink/20 hover:text-ink"
                }`}
              >
                🎉 Teslim Alınan ({resolvedCount})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                maxLength={100} value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Eşya veya kod ara..."
                className="w-full pl-9 pr-4 py-2 bg-white rounded-lg border border-ink/20 text-xs font-medium text-ink shadow-xs focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
          </div>
        )}

        {/* Content Render */}
        {error && <div role="alert" className="app-error mb-4">{error} {items.length > 0 && "Son yüklenen kayıtlar gösteriliyor."}<button className="app-button" onClick={loadData}>Yeniden dene</button></div>}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-7">
            <ItemCardSkeleton />
            <ItemCardSkeleton />
            <ItemCardSkeleton />
          </div>
        ) : error && items.length === 0 ? null : items.length === 0 && (filter !== "all" || searchQuery) ? <div className="app-card text-center"><p>Aramana uygun eşya bulunamadı.</p><button className="app-button mt-4" onClick={() => { setFilter("all"); setSearchQuery(""); }}>Filtreleri temizle</button></div> : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl mx-auto my-8 relative text-center"
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 w-32 h-5.5 bg-gold/90 -rotate-2 rounded-[2px] border border-ink/25 shadow-xs pointer-events-none overflow-hidden">
              <svg className="w-full h-full opacity-35" viewBox="0 0 90 16">
                <line x1="5" y1="0" x2="20" y2="16" stroke="#5C3E08" strokeWidth="1.5" />
                <line x1="25" y1="0" x2="40" y2="16" stroke="#5C3E08" strokeWidth="1.5" />
                <line x1="45" y1="0" x2="60" y2="16" stroke="#5C3E08" strokeWidth="1.5" />
                <line x1="65" y1="0" x2="80" y2="16" stroke="#5C3E08" strokeWidth="1.5" />
              </svg>
            </div>

            <div className="relative bg-paper-card p-8 sm:p-12 rounded-[24px] shadow-[0_8px_24px_rgba(51,48,43,0.08)] text-ink">
              <WobblyCardFrame stroke="#33302B" strokeWidth={1.8} />

              <div className="relative z-10 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gold/35 border-[1.5px] border-ink flex items-center justify-center text-ink shadow-xs -rotate-2">
                  <QrCode className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-ink">
                    Henüz Kayıtlı Bir Eşyan Yok
                  </h3>
                  <p className="text-xs sm:text-[13.5px] text-ink-soft max-w-sm mx-auto mt-2 leading-relaxed">
                    Laptopun, bavulun, anahtarın veya evcil hayvanın için 1 dakikada kişisel QR etiketini tasarla ve anında bastır.
                  </p>
                </div>

                <div className="pt-3 flex items-center justify-center">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link
                      href="/studio"
                      className="relative inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-ink font-bold text-sm rounded-[10px] px-8 py-3.5 shadow-[0_2.5px_0px_#33302B] active:translate-y-[1.5px] transition-all cursor-pointer"
                    >
                      <WobblyButtonFrame stroke="#33302B" strokeWidth={1.6} />
                      <Plus className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">İlk QR Etiketini Oluştur</span>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : filteredItems.length > 0 ? (
          <motion.div
            variants={staggerContainer(0.06)}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-7"
          >
            {filteredItems.map((item) => {
              const Icon = CATEGORY_ICONS[item.category] || Laptop;
              const qr = item.qr_code;
              const designId = qr?.frame_type || qr?.pattern_style || "teal_liquid";
              const matchedPreset =
                CUSTOM_QR_DESIGNS.find((d) => d.id === designId) || CUSTOM_QR_DESIGNS[0];
              const colorDark = qr?.color_dark || matchedPreset.fgColor;
              const colorLight = qr?.color_light || matchedPreset.bgColor;
              const frameText =
                qr?.frame_text !== undefined && qr?.frame_text !== null
                  ? qr.frame_text
                  : matchedPreset.defaultText;
              const qrCodeStr = qr?.unique_code || "KQR-CODE";
              const qrTargetUrl = `${getPublicAppUrl()}/q/${qrCodeStr}`;

              return (
                <motion.div
                  key={item.id}
                  layout
                  variants={fadeInUp}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="relative bg-paper-card p-6 rounded-[20px] shadow-[0_4px_16px_rgba(51,48,43,0.06)] flex flex-col justify-between group transition-shadow duration-200"
                >
                  <WobblyCardFrame stroke="#33302B" strokeWidth={1.6} />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-white border border-ink/20 flex items-center justify-center text-ink shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[15px] text-ink leading-tight line-clamp-1">
                            {decodeHtmlEntities(item.name)}
                          </h3>
                          <div className="flex items-center gap-2 text-[11px] text-ink-soft mt-0.5">
                            {item.owner_display_name && (
                              <>
                                <span>{decodeHtmlEntities(item.owner_display_name)}</span>
                                <span>·</span>
                              </>
                            )}
                            <span className="font-mono font-bold text-ink">#{qrCodeStr}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            item.status === "lost"
                              ? "bg-amber-100 text-amber-950 border-amber-300 animate-pulse"
                              : item.status === "resolved"
                              ? "bg-purple-100 text-purple-950 border-purple-300"
                              : "bg-emerald-100 text-emerald-900 border-emerald-300"
                          }`}
                        >
                          {item.status === "lost"
                            ? "🚨 Kayıp"
                            : item.status === "resolved"
                            ? "🎉 Teslim Alındı"
                            : "✓ Güvende"}
                        </span>
                        {!item.is_active && (
                          <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            Pasif QR
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Real Dynamic QR Code Preview */}
                    <div className="bg-white p-3 rounded-xl border border-ink/20 shadow-xs flex items-center gap-3.5 my-3">
                      <div className="w-20 h-20 p-1 rounded-xl bg-[#EFEAE0]/60 border border-ink/15 flex items-center justify-center shrink-0 overflow-hidden">
                        <DynamicQrRenderer
                          data={qrTargetUrl}
                          size={72}
                          designId={matchedPreset.id}
                          dotColor={colorDark}
                          bgColor={colorLight}
                          accentColor={matchedPreset.accentColor}
                          labelText={frameText}
                        />
                      </div>

                      <div className="flex-1 min-w-0 text-xs space-y-1">
                        <div className="flex items-center justify-between text-ink-soft text-[11px]">
                          <span>QR Stili:</span>
                          <span className="font-bold text-ink truncate max-w-[120px]">
                            {matchedPreset.name.replace(/^\d+\.\s*/, "")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-ink-soft text-[11px]">
                          <span>Tarama Sayısı:</span>
                          <strong className="text-ink">{item.total_scans || 0} kez</strong>
                        </div>
                        <div className="pt-1 flex items-center gap-2.5">
                          <button
                            onClick={() => handleOpenDetailModal(item)}
                            className="text-[10.5px] font-bold text-ink hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <History className="w-3 h-3 text-gold-dark" />
                            <span>Geçmiş</span>
                          </button>
                          <span>·</span>
                          <Link
                            href={`/q/${qrCodeStr}`}
                            target="_blank"
                            className="text-[10.5px] font-bold text-ink-soft hover:text-ink hover:underline flex items-center gap-0.5"
                          >
                            <span>Bulan kişinin ekranı</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-ink/10 flex items-center justify-between gap-2 relative z-10">
                    <button
                      type="button"
                      onClick={() => {
                        if (item.status === "lost") {
                          handleSetStatus(item, "resolved");
                        } else if (item.status === "resolved") {
                          handleSetStatus(item, "safe");
                        } else {
                          handleSetStatus(item, "lost");
                        }
                      }}
                      className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        item.status === "lost"
                          ? "bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                          : item.status === "resolved"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          : "bg-paper-hover hover:bg-amber-100 text-ink border border-ink/20"
                      }`}
                    >
                      {item.status === "lost" ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Teslim Aldım & Çöz</span>
                        </>
                      ) : item.status === "resolved" ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Güvende Olarak Güncelle</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                          <span>Kayıp Bildir</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/studio?edit=${item.id}`}
                        className="w-8 h-8 rounded-lg bg-white border border-ink/25 flex items-center justify-center text-ink hover:bg-gold transition-colors shadow-xs"
                        title="QR & Bilgileri Düzenle"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => setSelectedDownloadItem(item)}
                        className="w-8 h-8 rounded-lg bg-white border border-ink/25 flex items-center justify-center text-ink hover:bg-gold transition-colors shadow-xs cursor-pointer"
                        title="QR Kodunu İndir / Yazdır"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={isDeletingId === item.id}
                        className="w-8 h-8 rounded-lg bg-white border border-ink/25 flex items-center justify-center text-ink-soft hover:text-rose-600 hover:bg-rose-50 transition-colors shadow-xs cursor-pointer"
                        title="Eşyayı Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="text-center py-12 bg-paper-card rounded-2xl border border-dashed border-ink/30 p-8">
            <h4 className="font-bold text-base text-ink">Filtreye uygun eşya bulunamadı</h4>
            <button
              onClick={() => {
                setFilter("all");
                setSearchQuery("");
              }}
              className="mt-3 px-3 py-1.5 bg-gold text-ink font-bold text-xs rounded-lg border border-ink cursor-pointer"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}

      {page.hasMore && <button className="app-button mx-auto my-5" disabled={page.loadingMore || isLoading} onClick={page.loadMore}>{page.loadingMore ? "Yükleniyor…" : "Daha fazla eşya göster"}</button>}
      </motion.main>

      {/* Item Detail & Scan Logs Modal with AnimatePresence & Mobile Bottom Sheet */}
      <AnimatePresence>
        {selectedDetailItem && (
          <div
            ref={detailDialog} role="dialog" aria-modal="true" aria-label="Eşya detayları" tabIndex={-1} className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSelectedDetailItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[540px] bg-paper-card p-5 sm:p-8 rounded-t-[28px] sm:rounded-[24px] shadow-2xl text-ink max-h-[88vh] sm:max-h-[90vh] flex flex-col justify-between border-t-2 sm:border-t-0 border-ink/20"
            >
              {/* Mobile Drawer Pull Indicator */}
              <div className="w-10 h-1.5 bg-ink/20 rounded-full mx-auto mb-3 sm:hidden" />
              <WobblyCardFrame stroke="#33302B" strokeWidth={1.8} className="hidden sm:block" />

              <div className="relative z-10 overflow-y-auto pr-1">
                
                {/* Modal Header */}
                <div className="flex items-start justify-between pb-4 border-b border-ink/10">
                  <div>
                    <h3 className="text-xl font-extrabold text-ink leading-tight">
                      {decodeHtmlEntities(selectedDetailItem.name)}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-ink-soft mt-1">
                      <span className="font-mono font-bold text-ink">#{selectedDetailItem.qr_code?.unique_code}</span>
                      {selectedDetailItem.owner_display_name && (
                        <>
                          <span>·</span>
                          <span>Sahip: <strong>{decodeHtmlEntities(selectedDetailItem.owner_display_name)}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedDetailItem(null)}
                    className="w-8 h-8 rounded-full bg-paper-hover border border-ink/20 flex items-center justify-center text-ink hover:bg-gold transition-colors shrink-0 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Status & QR Active Switch Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
                  <div className="p-3 bg-white rounded-xl border border-ink/20 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold uppercase text-ink-soft">Durum</div>
                      <span
                        className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded border ${
                          selectedDetailItem.status === "lost"
                            ? "bg-amber-100 text-amber-950 border-amber-300"
                            : selectedDetailItem.status === "resolved"
                            ? "bg-purple-100 text-purple-950 border-purple-300"
                            : "bg-emerald-100 text-emerald-900 border-emerald-300"
                        }`}
                      >
                        {selectedDetailItem.status === "lost"
                          ? "🚨 Kayıp Bildirildi"
                          : selectedDetailItem.status === "resolved"
                          ? "🎉 Teslim Alındı"
                          : "✓ Güvende"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSetStatus(selectedDetailItem, "safe")}
                        className={`py-1 px-1.5 text-[10px] font-bold rounded-md border transition-colors cursor-pointer ${
                          selectedDetailItem.status === "safe"
                            ? "bg-emerald-600 text-white border-emerald-700"
                            : "bg-paper-hover hover:bg-emerald-50 text-ink border-ink/15"
                        }`}
                      >
                        Güvende
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetStatus(selectedDetailItem, "lost")}
                        className={`py-1 px-1.5 text-[10px] font-bold rounded-md border transition-colors cursor-pointer ${
                          selectedDetailItem.status === "lost"
                            ? "bg-amber-500 text-ink border-amber-600"
                            : "bg-paper-hover hover:bg-amber-50 text-ink border-ink/15"
                        }`}
                      >
                        Kayıp
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetStatus(selectedDetailItem, "resolved")}
                        className={`py-1 px-1.5 text-[10px] font-bold rounded-md border transition-colors cursor-pointer ${
                          selectedDetailItem.status === "resolved"
                            ? "bg-purple-600 text-white border-purple-700"
                            : "bg-paper-hover hover:bg-purple-50 text-ink border-ink/15"
                        }`}
                      >
                        Teslim Alındı
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-ink/20 flex items-center justify-between shadow-xs">
                    <div>
                      <div className="text-[11px] font-bold uppercase text-ink-soft">QR Yayını</div>
                      <div className="text-xs font-extrabold text-ink mt-0.5">
                        {selectedDetailItem.is_active ? "🟢 Aktif (Okunabilir)" : "🔴 Pasif (Kilitli)"}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleActive(selectedDetailItem)}
                      disabled={isTogglingActive}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                        selectedDetailItem.is_active
                          ? "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200"
                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300"
                      }`}
                    >
                      {isTogglingActive ? "..." : selectedDetailItem.is_active ? "Durdur" : "Aktif Et"}
                    </button>
                  </div>
                </div>

                {/* Scan Logs Timeline */}
                <div className="my-4">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-ink/10">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-ink">
                      <History className="w-4 h-4 text-gold-dark" />
                      <span>Tarama Geçmişi & Cihaz Kayıtları</span>
                    </div>
                    <span className="text-[11px] font-bold bg-gold/40 px-2 py-0.5 rounded text-ink">
                      {itemScans.length} Kez Okutuldu
                    </span>
                  </div>

                  <div className="bg-white/70 rounded-xl border border-ink/15 p-3 max-h-48 overflow-y-auto space-y-2">
                    {scansError && <p role="alert" className="app-error">{scansError}<button className="app-button" onClick={() => selectedDetailItem && handleOpenDetailModal(selectedDetailItem)}>Yeniden dene</button></p>}
                  {isLoadingScans ? (
                      <div className="py-6 text-center text-xs text-ink-soft animate-pulse flex items-center justify-center gap-1.5">
                        <Loader2 className="w-4 h-4 animate-spin text-gold-dark" />
                        <span>Tarama kayıtları yükleniyor...</span>
                      </div>
                    ) : itemScans.length > 0 ? (
                      itemScans.map((scan) => (
                        <div
                          key={scan.id}
                          className="p-2.5 rounded-lg bg-white border border-ink/10 shadow-xs flex items-center justify-between text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-ink flex items-center gap-1.5">
                              <Smartphone className="w-3.5 h-3.5 text-gold-dark" />
                              <span>{scan.device_type} Cihaz</span>
                            </div>
                            <div className="text-[11px] text-ink-soft flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(scan.scanned_at).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            {scan.latitude && scan.longitude ? (
                              <a
                                href={`https://maps.google.com/?q=${scan.latitude},${scan.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 inline-flex items-center gap-1 hover:underline"
                              >
                                <MapPin className="w-3 h-3 text-emerald-700" />
                                <span>Harita</span>
                              </a>
                            ) : (
                              <span className="text-[10.5px] text-ink-soft">
                                {scan.approximate_city || "Anonim Tarama"}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-xs text-ink-soft">
                        Bu eşyanın QR kodu henüz bir kamera tarafından taranmadı.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Bottom Action Bar */}
              <div className="pt-3 mt-2 border-t border-ink/10 flex items-center justify-between gap-2 relative z-10">
                <Link
                  href={`/studio?edit=${selectedDetailItem.id}`}
                  className="px-4 py-2.5 rounded-xl bg-gold hover:bg-gold-dark text-ink font-bold text-xs border border-ink shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>QR Tasarımını & Bilgileri Düzenle</span>
                </Link>

                <Link
                  href={`/q/${selectedDetailItem.qr_code?.unique_code || selectedDetailItem.id}`}
                  target="_blank"
                  className="px-3 py-2.5 rounded-xl bg-white hover:bg-paper-hover text-ink font-bold text-xs border border-ink/20 flex items-center gap-1 shadow-xs"
                >
                  <span>Public Sayfa</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Download Preview Modal with Real Dynamic QR & A4 Engine & Mobile Bottom Sheet */}
      <AnimatePresence>
        {selectedDownloadItem && (() => {
          const dlQr = selectedDownloadItem.qr_code;
          const dlDesignId = dlQr?.frame_type || dlQr?.pattern_style || "teal_liquid";
          const dlPreset =
            CUSTOM_QR_DESIGNS.find((d) => d.id === dlDesignId) || CUSTOM_QR_DESIGNS[0];
          const dlColorDark = dlQr?.color_dark || dlPreset.fgColor;
          const dlColorLight = dlQr?.color_light || dlPreset.bgColor;
          const dlFrameText =
            dlQr?.frame_text !== undefined && dlQr?.frame_text !== null
              ? dlQr.frame_text
              : dlPreset.defaultText;
          const cleanDlItemName = decodeHtmlEntities(selectedDownloadItem.name);

          return (
            <div
              ref={exportDialog} role="dialog" aria-modal="true" aria-label="QR etiketini indir" tabIndex={-1} className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setSelectedDownloadItem(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-[420px] bg-paper-card p-5 sm:p-7 rounded-t-[28px] sm:rounded-[22px] shadow-2xl text-ink border-t-2 sm:border-t-0 border-ink/20"
              >
                {/* Mobile Drawer Pull Indicator */}
                <div className="w-10 h-1.5 bg-ink/20 rounded-full mx-auto mb-3 sm:hidden" />
                <WobblyCardFrame stroke="#33302B" strokeWidth={1.8} className="hidden sm:block" />

                <div className="flex items-center justify-between pb-3 border-b border-ink/10 relative z-10">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-gold-dark" />
                    <span className="font-bold text-sm text-ink">QR İndirme & Baskı</span>
                  </div>
                  <button
                    onClick={() => setSelectedDownloadItem(null)}
                    className="w-7 h-7 rounded-full bg-paper-hover border border-ink/20 flex items-center justify-center text-ink hover:bg-gold cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-center my-4 space-y-3 relative z-10">
                  <div className="mx-auto rounded-2xl p-4 bg-[#EFEAE0]/60 border border-ink/15 shadow-inner flex items-center justify-center">
                    <div
                      ref={modalStickerCardRef}
                      className="inline-flex items-center justify-center p-1.5 drop-shadow-[0_12px_24px_rgba(51,48,43,0.14)]"
                    >
                      <DynamicQrRenderer
                        data={`${getPublicAppUrl()}/q/${dlQr?.unique_code || selectedDownloadItem.id}`}
                        size={190}
                        designId={dlPreset.id}
                        dotColor={dlColorDark}
                        bgColor={dlColorLight}
                        accentColor={dlPreset.accentColor}
                        labelText={dlFrameText}
                        onInstanceReady={(inst) => {
                          modalQrRef.current = inst;
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-ink">{cleanDlItemName}</h4>
                    <p className="text-xs text-ink-soft font-mono">
                      #{dlQr?.unique_code || "KQR-CODE"} · {dlPreset.name.replace(/^\d+\.\s*/, "")}
                    </p>
                  </div>
                </div>

                {qrColorError(dlColorDark, dlColorLight) && <p role="alert" className="app-error">{qrColorError(dlColorDark, dlColorLight)} <Link className="underline" href={`/studio?edit=${selectedDownloadItem.id}`}>Tasarımı düzenle</Link></p>}
                <fieldset disabled={!!qrColorError(dlColorDark, dlColorLight)} className="space-y-2.5 relative z-10 pt-3 border-t border-ink/10">
                  {/* 1. Primary Button: Download QR Image (PNG) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (modalQrRef.current) {
                        downloadSinglePng(
                          modalQrRef.current,
                          `kayipqr-${cleanDlItemName}-${dlPreset.id}`
                        );
                      }
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gold hover:bg-gold-dark text-ink font-extrabold text-xs border border-ink shadow-[0_2px_0px_#33302B] active:translate-y-[1px] flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>📥 QR Görselini İndir (Yüksek Kalite PNG)</span>
                  </button>

                  {/* 2. Secondary Button: Multi-Sticker A4 Print / Download */}
                  <button
                    type="button"
                    onClick={() => {
                      haptic.lightTap();
                      setShowModalA4Options((prev) => !prev);
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      showModalA4Options
                        ? "bg-ink text-paper border-ink shadow-xs"
                        : "bg-white hover:bg-paper-hover text-ink border-ink/25 shadow-xs"
                    }`}
                  >
                    <Printer className="w-4 h-4" />
                    <span>🖨️ A4 Kağıda Çoklu Yazdır / Şablon İndir</span>
                  </button>

                  {/* Expandable A4 Size & Action Selector */}
                  {showModalA4Options && (
                    <div className="p-3.5 rounded-xl bg-[#F5EFE0] border border-ink/20 space-y-3 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-ink-soft mb-1.5">
                          1. A4 Sayfa Boyut Düzenini Seçin:
                        </label>
                        <select
                          value={downloadPreset}
                          onChange={(e: any) => setDownloadPreset(e.target.value)}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-ink/25 font-bold text-xs text-ink focus:outline-none focus:ring-2 focus:ring-gold"
                        >
                          <option value="mix">
                            🌟 Karma Paket (2 Büyük + 3 Orta + 4 Küçük = 9 Etiket)
                          </option>
                          <option value="standard">
                            💻 Orta Boy · Laptop & Tablet (6 Adet)
                          </option>
                          <option value="nano">
                            🔑 Küçük Boy · Anahtarlık & Telefon (12 Adet)
                          </option>
                          <option value="luggage">
                            🧳 Büyük Boy · Bavul & Çanta (4 Adet)
                          </option>
                          <option value="round">
                            ⭕ Madalyon / Rozet Dizilimi (8 Adet)
                          </option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            printA4Sheet({
                              itemName: cleanDlItemName,
                              uniqueCode: dlQr?.unique_code || "KQR",
                              designId: dlPreset.id,
                              dotType: dlPreset.id,
                              frameText: dlFrameText,
                              dotColor: dlColorDark,
                              bgColor: dlColorLight,
                              sizePreset: downloadPreset,
                            });
                          }}
                          className="py-2.5 px-3 rounded-lg bg-gold hover:bg-gold-dark text-ink font-extrabold text-[11.5px] border border-ink shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 shrink-0" />
                          <span>Doğrudan Yazıcıya Gönder</span>
                        </button>

                        <button
                          type="button"
                          disabled={isDownloadingA4}
                          onClick={async () => {
                            setIsDownloadingA4(true);
                            try {
                              await downloadA4SheetPng({
                                itemName: cleanDlItemName,
                                uniqueCode: dlQr?.unique_code || "KQR",
                                designId: dlPreset.id,
                                dotType: dlPreset.id,
                                frameText: dlFrameText,
                                dotColor: dlColorDark,
                                bgColor: dlColorLight,
                                sizePreset: downloadPreset,
                              });
                            } finally {
                              setIsDownloadingA4(false);
                            }
                          }}
                          className="py-2.5 px-3 rounded-lg bg-white hover:bg-paper-hover text-ink font-extrabold text-[11.5px] border border-ink/25 shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                        >
                          <Download className="w-3.5 h-3.5 text-gold-dark shrink-0" />
                          <span>
                            {isDownloadingA4
                              ? "Hazırlanıyor..."
                              : "A4 Şablonu Resim İndir"}
                          </span>
                        </button>
                      </div>
                      <p className="text-[10.5px] text-ink-soft text-center leading-tight">
                        💡 Kırtasiyede veya başka bir yerde çıktı almak için <strong>&ldquo;A4 Şablonu Resim İndir&rdquo;</strong> seçeneğini kullanabilirsiniz.
                      </p>
                    </div>
                  )}

                  {/* Subtle Vector SVG Link */}
                  <div className="pt-1 text-center">
                    <span className="text-[11px] text-ink-soft">
                      Matbaa veya lazer kazıma için{" "}
                      <button
                        type="button"
                        onClick={() => {
                          if (modalQrRef.current) {
                            downloadSingleSvg(
                              modalQrRef.current,
                              `kayipqr-${cleanDlItemName}-${dlPreset.id}`
                            );
                          }
                        }}
                        className="font-bold text-ink underline underline-offset-2 decoration-gold-dark hover:text-gold-dark transition-colors cursor-pointer"
                      >
                        SVG indir
                      </button>
                    </span>
                  </div>
                </fieldset>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Celebration Modal with AnimatePresence */}
      <AnimatePresence>
        {celebrationItem && (
          <div ref={celebrationDialog} role="dialog" aria-modal="true" aria-label="Eşyan teslim alındı" tabIndex={-1} className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-[460px] bg-paper-card p-6 sm:p-8 rounded-[24px] shadow-2xl text-ink text-center space-y-4"
            >
              <WobblyCardFrame stroke="#33302B" strokeWidth={1.8} />

              <div className="relative z-10">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gold/40 border-[1.5px] border-ink flex items-center justify-center text-ink shadow-md -rotate-3">
                  <PartyPopper className="w-9 h-9 text-gold-dark animate-bounce" />
                </div>

                <div className="mt-4">
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-purple-900 bg-purple-100 px-3 py-1 rounded-full border border-purple-300 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-700" /> Eşya Başarıyla Yuvasına Döndü!
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
                    Tebrikler! 🎉
                  </h3>
                  <p className="text-xs sm:text-sm text-ink-soft mt-1.5 leading-relaxed max-w-sm mx-auto">
                    <strong>{decodeHtmlEntities(celebrationItem.name)}</strong> eşyanız başarıyla teslim alındı ve koruma protokolü çözüldü olarak işaretlendi.
                  </p>
                </div>

                {/* Summary card */}
                <div className="my-4 p-3.5 rounded-xl bg-white/80 border border-ink/15 text-left text-xs space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-soft">Eşya Adı:</span>
                    <strong className="text-ink">{decodeHtmlEntities(celebrationItem.name)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-soft">KayıpQR Kodu:</span>
                    <span className="font-mono font-bold text-ink">#{celebrationItem.qr_code?.unique_code || "KQR"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-soft">Toplam Tarama:</span>
                    <span className="font-bold text-emerald-800">{celebrationItem.total_scans || 1} kez okutuldu</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      handleSetStatus(celebrationItem, "safe");
                      setCelebrationItem(null);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Tekrar Güvende Moduna Al</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCelebrationItem(null)}
                    className="py-2.5 px-4 rounded-xl bg-white hover:bg-paper-hover text-ink font-bold text-xs border border-ink/20 shadow-xs transition-colors cursor-pointer"
                  >
                    Kapat
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-paper flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gold-dark" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
