"use client";
import { useStudioDraft } from "@/lib/useStudioDraft";
import { qrColorError, ITEM_NAME_MAX, OWNER_NAME_MAX, ITEM_NOTE_MAX, QR_LABEL_MAX } from "@/lib/qrPolicy";

import { makePng } from "@/components/dashboard/QrExportPanel";
import { generateCustomQrSvgString } from "@/components/ui/DynamicQrRenderer";
import React, { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  QrCode,
  Palette,
  Printer,
  Download,
  Check,
  Tag,
  Sparkles,
  AlertCircle,
  Eye,
  Type,
  Loader2,
  RotateCcw,
} from "lucide-react";
import {
  WobblyCardFrame,
  WobblyButtonFrame,
} from "@/components/ui/SketchBorders";
import { Sidebar } from "./Sidebar";
import {
  DynamicQrRenderer,
  CUSTOM_QR_DESIGNS,
  CustomQrDesignPreset,
} from "@/components/ui/DynamicQrRenderer";
import { itemsApi, getPublicAppUrl, getAuthToken } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { decodeHtmlEntities } from "@/lib/utils";
import {
  downloadSinglePng,
  downloadSingleSvg,
  downloadFullCardPng,
  printA4Sheet,
  downloadA4SheetPng,
} from "@/lib/printEngine";

const QUICK_TEXT_CHIPS = [
  { label: "BENİ TARA", value: "BENİ TARA" },
  { label: "BULDUYSAN TARA", value: "BULDUYSAN TARA" },
  { label: "SAHİBİME ULAŞ", value: "SAHİBİME ULAŞ" },
  { label: "SCAN ME", value: "SCAN ME" },
  { label: "🚫 Yazısız (Sadece QR)", value: "" },
];

const ITEM_CATEGORIES = [
  "Kişisel Eşya",
  "Teknoloji",
  "Çanta & Bavul",
  "Anahtar",
  "Evcil Hayvan",
  "Kimlik & Kart",
];

function getContrastRatio(hex1: string, hex2: string): number {
  const getLuminance = (hex: string) => {
    const cleanHex = hex.replace("#", "");
    const fullHex =
      cleanHex.length === 3
        ? cleanHex
            .split("")
            .map((c) => c + c)
            .join("")
        : cleanHex.padEnd(6, "0");
    const rgb = parseInt(fullHex, 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;
    const a = [r, g, b].map((v) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    );
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };
  try {
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  } catch {
    return 7;
  }
}

function StudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editItemId = searchParams?.get("edit") || searchParams?.get("id");

  const draft = useStudioDraft(editItemId);
  const [isLoadingItem, setIsLoadingItem] = useState(false);
  const savedItemId = draft.item?.id || editItemId;
  const existingQrCode = draft.item?.qr_code?.unique_code || "";
  const [itemName, setItemName] = draft.field("name");
  const [itemCategory, setItemCategory] = draft.field("category");
  const [finderNote, setFinderNote] = draft.field("note");
  const [ownerName, setOwnerName] = draft.field("owner");
  const [showNameToFinder, setShowNameToFinder] = draft.field("showName");
  const [showDescToFinder, setShowDescToFinder] = draft.field("showNote");
  const selectedDesign = CUSTOM_QR_DESIGNS.find(design => design.id === draft.form.design) || CUSTOM_QR_DESIGNS[0];
  const setSelectedDesign = (design: CustomQrDesignPreset) => draft.setForm(previous => ({ ...previous, design: design.id }));
  const [frameText, setFrameText] = draft.field("label");
  const [customQrColor, setCustomQrColor] = draft.field("foreground");
  const [customCardBg, setCustomCardBg] = draft.field("background");
  const saveLock = useRef(false);
  const [printPreset, setPrintPreset] = useState<
    "standard" | "nano" | "luggage" | "round" | "mix"
  >("mix");

  const isSaving = draft.saving;
  const setIsSaving = draft.setSaving;
  const [errorMessage, setErrorMessage] = useState("");
  const [mobileStudioTab, setMobileStudioTab] = useState<
    "design" | "preview" | "export"
  >("design");

  const qrInstanceRef = useRef<any>(null);
  const stickerCardRef = useRef<HTMLDivElement>(null);
  const [isExportingCard, setIsExportingCard] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push("/login?redirect=/studio");
      return;
    }

    if (!editItemId || draft.item?.id === editItemId) return;
    let cancelled = false;

    const loadItem = async () => {
      setIsLoadingItem(true);
      setErrorMessage("");
      try {
        const item = await itemsApi.get(editItemId);
        if (cancelled) return;
        draft.setItem(item);
        setItemName(decodeHtmlEntities(item.name));
        setItemCategory(decodeHtmlEntities(item.category) || "Kişisel Eşya");
        setOwnerName(decodeHtmlEntities(item.owner_display_name));
        setFinderNote(decodeHtmlEntities(item.description || item.reward_text));
        setShowNameToFinder(item.show_name_to_finder ?? true);
        setShowDescToFinder(item.show_desc_to_finder ?? true);

        if (item.qr_code) {


          let parsedCfg: any = {};
          try {
            if ((item.qr_code as any).design_config) {
              parsedCfg = JSON.parse((item.qr_code as any).design_config);
            }
          } catch {}

          const savedStyleId =
            item.qr_code.frame_type ||
            item.qr_code.pattern_style ||
            parsedCfg.frame_type ||
            parsedCfg.pattern_style ||
            parsedCfg.dot_style;

          const matchedDesign =
            CUSTOM_QR_DESIGNS.find((d) => d.id === savedStyleId) ||
            CUSTOM_QR_DESIGNS[0];

          setSelectedDesign(matchedDesign);
          setCustomQrColor(
            item.qr_code.color_dark ||
              parsedCfg.color_dark ||
              matchedDesign.fgColor
          );
          setCustomCardBg(
            item.qr_code.color_light ||
              parsedCfg.color_light ||
              matchedDesign.bgColor
          );
          setFrameText(
            item.qr_code.frame_text !== undefined && item.qr_code.frame_text !== null
              ? decodeHtmlEntities(item.qr_code.frame_text)
              : parsedCfg.frame_text !== undefined && parsedCfg.frame_text !== null
              ? decodeHtmlEntities(parsedCfg.frame_text)
              : matchedDesign.defaultText
          );
        }
      } catch (err: any) {
        if (!cancelled) setErrorMessage(err.message || "Düzenlenecek eşya yüklenemedi.");
      } finally {
        if (!cancelled) setIsLoadingItem(false);
      }
    };

    loadItem();
    return () => { cancelled = true; };
  }, [editItemId, router]);

  const handleSelectDesign = (design: CustomQrDesignPreset) => {
    haptic.lightTap();
    setSelectedDesign(design);
    setCustomQrColor(design.fgColor);
    setCustomCardBg(design.bgColor);
  };

  const handleResetDesignColors = () => {
    haptic.lightTap();
    setCustomQrColor(selectedDesign.fgColor);
    setCustomCardBg(selectedDesign.bgColor);
  };

  const activeQrColor = customQrColor || selectedDesign.fgColor;
  const activeCardBg = customCardBg || selectedDesign.bgColor;
  const appBaseUrl = getPublicAppUrl();
  const previewQrData = `${appBaseUrl}/q/${existingQrCode || "KQR"}`;

  // Ensures the item is saved in DB and has a real unique_code before downloading/printing
  const ensureSavedQrCode = async (): Promise<string | null> => {
    if (saveLock.current || isSaving || isLoadingItem || (editItemId && draft.item?.id !== editItemId)) return null;
    const effectiveName = itemName.trim();
    if (!effectiveName) { setErrorMessage("Eşyan için bir isim yaz."); document.getElementById("studio-item-name")?.focus(); return null; }
    const colorError = qrColorError(customQrColor, customCardBg);
    if (colorError) { setErrorMessage(colorError); return null; }
    saveLock.current = true;

    setIsSaving(true);
    setErrorMessage("");
    try {
      const payload = {
        name: effectiveName,
        category: itemCategory || "Kişisel Eşya",
        description: finderNote.trim(),
        reward_text: "",
        owner_display_name: ownerName.trim(),
        show_name_to_finder: showNameToFinder,
        show_desc_to_finder: showDescToFinder,
        qr_color_dark: activeQrColor,
        qr_color_light: activeCardBg,
        qr_pattern_style: selectedDesign.id,
        qr_frame_type: selectedDesign.id,
        qr_frame_text: frameText,
      };

      if (savedItemId) {
        const updated = await itemsApi.update(savedItemId, payload);
        const code = updated.qr_code?.unique_code || existingQrCode;
        draft.setItem(updated);
        return code;
      } else {
        const created = await itemsApi.create(payload);
        draft.setItem(created);
        const code = created.qr_code?.unique_code || "";
        if (code) {


        }
        return code;
      }
    } catch (err: any) {
      setErrorMessage(err.message || "QR kod oluşturulurken hata oluştu.");
      return null;
    } finally {
      saveLock.current = false;
      setIsSaving(false);
    }
  };

  const handleSaveAndRedirect = async () => {
    const code = await ensureSavedQrCode();
    if (code) router.push("/dashboard");
  };

  const handleDownloadFullCard = async () => {
    const realCode = await ensureSavedQrCode();
    if (!realCode || !stickerCardRef.current) return;
    setIsExportingCard(true);
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      await downloadFullCardPng(
        stickerCardRef.current,
        `kayipqr-${itemName || "sticker"}-${selectedDesign.id}`
      );
    } finally {
      setIsExportingCard(false);
    }
  };

  const downloadSaved = async (extension: "svg" | "png") => {
    const realCode = await ensureSavedQrCode();
    if (!realCode) return;
    try {
      const svg = generateCustomQrSvgString({ data: `${appBaseUrl}/q/${realCode}`, size: 2000, designId: selectedDesign.id, dotColor: activeQrColor, bgColor: activeCardBg, labelText: frameText });
      const blob = extension === "png" ? await makePng(svg) : new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = `kayipqr-${realCode}.${extension}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setErrorMessage((cause as Error).message); }
  };
  const handleDownloadPng = () => downloadSaved("png");
  const handleDownloadSvg = () => downloadSaved("svg");

  const [showA4Options, setShowA4Options] = useState(false);
  const [isDownloadingA4, setIsDownloadingA4] = useState(false);

  const handlePrintA4 = async () => {
    const realCode = await ensureSavedQrCode();
    if (!realCode) return;
    printA4Sheet({
      itemName: itemName || "Kişisel Eşya",
      uniqueCode: realCode,
      designId: selectedDesign.id,
      dotType: selectedDesign.id,
      frameText: frameText,
      dotColor: activeQrColor,
      bgColor: activeCardBg,
      sizePreset: printPreset,
    });
  };

  const handleDownloadA4Png = async () => {
    const realCode = await ensureSavedQrCode();
    if (!realCode) return;
    setIsDownloadingA4(true);
    try {
      await downloadA4SheetPng({
        itemName: itemName || "Kişisel Eşya",
        uniqueCode: realCode,
        designId: selectedDesign.id,
        dotType: selectedDesign.id,
        frameText: frameText,
        dotColor: activeQrColor,
        bgColor: activeCardBg,
        sizePreset: printPreset,
      });
    } finally {
      setIsDownloadingA4(false);
    }
  };

  const contrastRatio = getContrastRatio(activeQrColor, activeCardBg);
  const isLowContrast = contrastRatio < 3.0;

  return (
    <div className="min-h-screen dot-grid-pattern text-ink flex flex-col md:flex-row selection:bg-gold selection:text-ink pb-24 lg:pb-0">
      <Sidebar />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 min-w-0 p-3.5 sm:p-8 lg:p-12"
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2.5">
              <span>
                {editItemId ? "QR Tasarımını Düzenle" : "QR Tasarım Stüdyosu"}
              </span>
              <span className="text-[11px] font-bold bg-gold/40 px-2.5 py-0.5 rounded-full border border-ink/20 text-ink">
                {editItemId
                  ? `Düzenleme: #${existingQrCode}`
                  : "8 etiket tasarımı"}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-ink-soft mt-1">
              Eşyanı ekle, tasarımını seç ve etiketini indir. İndirme işlemi bilgilerini de kaydeder.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-bold text-ink-soft hover:text-ink px-3 py-2"
            >
              Vazgeç
            </Link>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveAndRedirect}
              disabled={isSaving || isLoadingItem || !!qrColorError(customQrColor, customCardBg)}
              className="relative inline-flex items-center gap-1.5 bg-gold hover:bg-gold-dark text-ink font-bold text-xs rounded-[10px] px-5 py-2.5 shadow-[0_2px_0px_#33302B] active:translate-y-[1px] transition-all cursor-pointer disabled:opacity-75"
            >
              <WobblyButtonFrame stroke="#33302B" strokeWidth={1.4} />
              <Check className="w-4 h-4 relative z-10" />
              <span className="relative z-10">
                {isSaving
                  ? "Kaydediliyor..."
                  : editItemId
                  ? "Değişiklikleri Güncelle"
                  : "Kaydet ve eşyalarıma ekle"}
              </span>
            </motion.button>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="lg:hidden flex items-center bg-white/95 p-1 rounded-xl border border-ink/20 shadow-xs mb-5 text-xs font-bold sticky top-2 z-20 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setMobileStudioTab("design")}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mobileStudioTab === "design"
                ? "bg-gold text-ink shadow-2xs font-extrabold"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>1. Tasarım Seç</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileStudioTab("preview")}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mobileStudioTab === "preview"
                ? "bg-gold text-ink shadow-2xs font-extrabold"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>2. Canlı Önizleme</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileStudioTab("export")}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mobileStudioTab === "export"
                ? "bg-gold text-ink shadow-2xs font-extrabold"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>3. İndir & Baskı</span>
          </button>
        </div>
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: DESIGN CONTROLS */}
          <div
            className={`${
              mobileStudioTab === "design" ? "block" : "hidden"
            } lg:block lg:col-span-7 space-y-6`}
          >
            {/* STEP 1: CHOOSE FROM THE 8 ICONIC QR DESIGNS */}
            <div className="relative bg-paper-card p-6 sm:p-7 rounded-[20px] shadow-xs">
              <WobblyCardFrame stroke="#33302B" strokeWidth={1.6} />
              <div className="relative z-10">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-ink/10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-gold-dark" />
                    <h3 className="font-bold text-base text-ink">
                      1. Tasarımını seç
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold bg-gold/30 text-ink px-2.5 py-0.5 rounded-full border border-ink/15">
                    8 tasarım
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {CUSTOM_QR_DESIGNS.map((design) => {
                    const isSelected = selectedDesign.id === design.id;
                    return (
                      <button
                        key={design.id}
                        type="button"
                        onClick={() => handleSelectDesign(design)}
                        className={`p-3.5 rounded-2xl text-left border transition-all flex items-center gap-3.5 cursor-pointer group ${
                          isSelected
                            ? "bg-gold/25 border-ink shadow-sm ring-2 ring-gold"
                            : "bg-white border-ink/20 hover:border-ink/50 hover:bg-paper-hover"
                        }`}
                      >
                        {/* Live Miniature Custom SVG Preview */}
                        <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-black/10 group-hover:scale-105 transition-transform">
                          <DynamicQrRenderer
                            data={`${appBaseUrl}/q/KQR`}
                            size={60}
                            designId={design.id}
                            dotColor={design.fgColor}
                            bgColor={design.bgColor}
                            accentColor={design.accentColor}
                            labelText=""
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-extrabold text-xs text-ink truncate">
                              {design.name}
                            </span>
                            {design.id === "kayipqr_signature" && (
                              <span className="text-[9px] font-black uppercase bg-gold px-1.5 py-0.5 rounded text-ink border border-ink/20 shrink-0">
                                ★ İMZA
                              </span>
                            )}
                          </div>
                          <span className="inline-block text-[10px] font-bold text-ink-soft bg-paper-hover px-2 py-0.5 rounded-md border border-ink/10 mt-1">
                            {design.shape === "circle" ? "Yuvarlak etiket" : "Köşeli etiket"}
                          </span>

                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* STEP 2: SINGLE TEXT SLOT ("BENİ TARA" vs.) & COLOR TWEAK */}
            <div className="relative bg-paper-card p-6 sm:p-7 rounded-[20px] shadow-xs">
              <WobblyCardFrame stroke="#33302B" strokeWidth={1.6} />
              <div className="relative z-10 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-ink/10">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-gold-dark" />
                    <h3 className="font-bold text-base text-ink">
                      2. Yazı ve renkler
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-ink-soft">
                    İsteğe bağlı
                  </span>
                </div>
                {/* Single Text Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="studiopage-field-0" className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
                      Etiket Yazısı (İsteğe Bağlı Tek Satır)
                    </label>
                    <span className="text-[10.5px] font-mono text-ink-soft">
                      {frameText.length}/22
                    </span>
                  </div>
                  <input id="studiopage-field-0"
                    type="text"
                    maxLength={QR_LABEL_MAX}
                    value={frameText}
                    onChange={(e) => setFrameText(e.target.value)}
                    placeholder="Örn: BENİ TARA (Boş bırakırsanız sadece QR görünür)"
                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-ink/25 text-ink font-extrabold text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  {/* Quick-Pick Slogan Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {QUICK_TEXT_CHIPS.map((chip) => {
                      const active = frameText === chip.value;
                      return (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => {
                            haptic.lightTap();
                            setFrameText(chip.value);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            active
                              ? "bg-gold text-ink border-ink shadow-2xs"
                              : "bg-white text-ink-soft border-ink/15 hover:text-ink hover:bg-paper-hover"
                          }`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {qrColorError(customQrColor, customCardBg) && <p role="alert" className="app-error">{qrColorError(customQrColor, customCardBg)}</p>}
                {/* Optional Color Fine-Tuning */}
                <div className="pt-4 border-t border-ink/10">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                      Renkleri Özelleştir (İsteğe Bağlı)
                    </span>
                    <button
                      type="button"
                      onClick={handleResetDesignColors}
                      className="text-[11px] font-bold text-gold-dark hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Tasarımın Orijinal Rengine Dön</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-ink-soft mb-1">
                        {selectedDesign.shape === "circle"
                          ? "İç QR Oyma Rengi"
                          : "QR Matris Rengi"}
                      </label>
                      <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-ink/20">
                        <input
                          type="color" aria-label="QR rengi seç"
                          value={activeQrColor}
                          onChange={(e) => setCustomQrColor(e.target.value)}
                          className="w-7 h-7 rounded-lg border border-ink/20 cursor-pointer"
                        />
                        <input
                          type="text" aria-label="QR rengi HEX kodu" maxLength={7}
                          value={activeQrColor}
                          onChange={(e) => setCustomQrColor(e.target.value)}
                          className="w-full text-xs font-mono font-bold text-ink bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-ink-soft mb-1">
                        {selectedDesign.shape === "circle"
                          ? "Madalyon Daire Rengi"
                          : "Zemin Rengi"}
                      </label>
                      <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-ink/20">
                        <input
                          type="color" aria-label="Zemin rengi seç"
                          value={activeCardBg}
                          onChange={(e) => setCustomCardBg(e.target.value)}
                          className="w-7 h-7 rounded-lg border border-ink/20 cursor-pointer"
                        />
                        <input
                          type="text" aria-label="Zemin rengi HEX kodu" maxLength={7}
                          value={activeCardBg}
                          onChange={(e) => setCustomCardBg(e.target.value)}
                          className="w-full text-xs font-mono font-bold text-ink bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* STEP 3: ITEM & OWNER METADATA (For Finder Screen when scanned) */}
            <div className="relative bg-paper-card p-6 sm:p-7 rounded-[20px] shadow-xs">
              <WobblyCardFrame stroke="#33302B" strokeWidth={1.6} />
              <div className="relative z-10">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-ink/10">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gold-dark" />
                    <h3 className="font-bold text-base text-ink">
                      3. Eşya & Sahip Bilgileri (Tarandığında Görünür)
                    </h3>
                  </div>
                  <span className="text-[10.5px] font-semibold text-ink-soft">
                    QR Üzerinde Kalabalık Yapmaz
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                      Kategori Seçin
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {ITEM_CATEGORIES.map((cat) => {
                        const active = itemCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              haptic.lightTap();
                              setItemCategory(cat);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                              active
                                ? "bg-gold text-ink border-ink shadow-2xs"
                                : "bg-white text-ink-soft border-ink/15 hover:text-ink hover:bg-paper-hover"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="studio-item-name" className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
                          Eşya Adı
                        </label>
                        <span className="text-[10.5px] font-mono text-ink-soft">
                          {itemName.length}/{ITEM_NAME_MAX}
                        </span>
                      </div>
                      <input
                        type="text"
                        id="studio-item-name" maxLength={ITEM_NAME_MAX}
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        placeholder="Örn: MacBook Pro, Sırt Çantası, Anahtarlık..."
                        className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-ink/25 text-ink font-bold placeholder:font-normal placeholder:text-ink-soft/45 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="studiopage-field-6" className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
                          Eşya Sahibi Adı (İsteğe Bağlı)
                        </label>
                        <span className="text-[10px] font-mono text-ink-soft">
                          {ownerName.length}/{OWNER_NAME_MAX}
                        </span>
                      </div>
                      <input id="studiopage-field-6"
                        type="text"
                        maxLength={OWNER_NAME_MAX}
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Örn: Ahmet Y. (Boş bırakılabilir)"
                        className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-ink/25 text-ink font-bold placeholder:font-normal placeholder:text-ink-soft/45 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-gold"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="studiopage-field-7" className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
                        Bulan Kişiye Not (İsteğe Bağlı)
                      </label>
                      <span className="text-[10px] font-mono text-ink-soft">
                        {finderNote.length}/{ITEM_NOTE_MAX}
                      </span>
                    </div>
                    <input id="studiopage-field-7"
                      type="text"
                      maxLength={ITEM_NOTE_MAX}
                      value={finderNote}
                      onChange={(e) => setFinderNote(e.target.value)}
                      placeholder="Örn: Eşyamı bulduysanız lütfen buradan mesaj veya konum bırakın."
                      className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-ink/25 text-ink font-semibold placeholder:font-normal placeholder:text-ink-soft/45 text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>
                  {/* Privacy Toggles for Finder View */}
                  <div className="pt-2 border-t border-ink/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-paper-hover/70 border border-ink/15 cursor-pointer hover:border-ink/30 transition-colors">
                      <span className="text-xs font-bold text-ink">
                        Eşya Adını Bulan Kişiye Göster
                      </span>
                      <input
                        type="checkbox"
                        checked={showNameToFinder}
                        onChange={(e) => setShowNameToFinder(e.target.checked)}
                        className="w-4 h-4 accent-gold rounded border-ink/30 cursor-pointer shrink-0"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-paper-hover/70 border border-ink/15 cursor-pointer hover:border-ink/30 transition-colors">
                      <span className="text-xs font-bold text-ink">
                        Notu / Açıklamayı Bulan Kişiye Göster
                      </span>
                      <input
                        type="checkbox"
                        checked={showDescToFinder}
                        onChange={(e) => setShowDescToFinder(e.target.checked)}
                        className="w-4 h-4 accent-gold rounded border-ink/30 cursor-pointer shrink-0"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* RIGHT COLUMN: LIVE CUSTOM QR STICKER PREVIEW & EXPORT */}
          <div
            className={`${
              mobileStudioTab !== "design" ? "block" : "hidden"
            } lg:block lg:col-span-5 sticky top-6 self-start space-y-6 z-20`}
          >
            <div className="relative bg-paper-card p-6 rounded-[22px] shadow-md">
              <WobblyCardFrame stroke="#33302B" strokeWidth={1.8} />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between border-b border-ink/10 pb-3">
                  <span className="font-extrabold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-gold-dark" />
                    <span>{selectedDesign.name}</span>
                  </span>
                  <span className="text-[10.5px] font-bold bg-gold/30 text-ink px-2.5 py-0.5 rounded-full border border-ink/15">
                    {selectedDesign.shape === "circle" ? "Yuvarlak etiket" : "Köşeli etiket"}
                  </span>
                </div>
                {/* Contrast Readability Indicator */}
                {isLowContrast ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-[11px] font-bold leading-tight">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <div>
                      <span className="font-extrabold text-amber-900">
                        ⚠️ Düşük Kontrast ({contrastRatio.toFixed(1)}:1):
                      </span>{" "}
                      <span className="font-normal">
                        Kamera okunabilirliği için zıt renkler seçin.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-[11px] font-bold">
                    <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>
                      ✓ Renkler Yeterince Farklı ({contrastRatio.toFixed(1)}:1 Kontrast)
                    </span>
                  </div>
                )}
                {/* Pure Minimalist Custom QR Sticker Canvas */}
                <div className="min-h-[320px] flex flex-col items-center justify-center py-4 bg-[#EFEAE0]/60 rounded-2xl border border-ink/10">
                  <div
                    ref={stickerCardRef}
                    className="inline-flex items-center justify-center p-2 drop-shadow-[0_14px_28px_rgba(51,48,43,0.14)] transition-all"
                  >
                    <DynamicQrRenderer
                      data={previewQrData}
                      size={260}
                      designId={selectedDesign.id}
                      dotColor={activeQrColor}
                      bgColor={activeCardBg}
                      accentColor={selectedDesign.accentColor}
                      labelText={frameText}
                      onInstanceReady={(inst) => (qrInstanceRef.current = inst)}
                    />
                  </div>
                </div>
                {/* Export & Print Controls (Simplified 2-Button + Subtle SVG Link) */}
                <div className="space-y-2.5 pt-3 border-t border-ink/10">
                  {/* 1. Primary Button: Download QR Image (PNG) */}
                  <button
                    type="button"
                    disabled={isSaving || !!qrColorError(customQrColor, customCardBg)}
                    onClick={handleDownloadPng}
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
                      setShowA4Options((prev) => !prev);
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      showA4Options
                        ? "bg-ink text-paper border-ink shadow-xs"
                        : "bg-white hover:bg-paper-hover text-ink border-ink/25 shadow-xs"
                    }`}
                  >
                    <Printer className="w-4 h-4" />
                    <span>🖨️ A4 Kağıda Çoklu Yazdır / Şablon İndir</span>
                  </button>
                  {/* Expandable A4 Size & Action Selector */}
                  {showA4Options && (
                    <div className="p-3 bg-white rounded-xl border border-ink/15 space-y-3">
                      <div>
                        <label htmlFor="studiopage-field-10" className="block text-[11px] font-bold text-ink mb-2">
                          1. A4 Sayfa Boyut Düzenini Seçin:
                        </label>
                        <select id="studiopage-field-10" className="w-full px-3 py-2.5 rounded-xl bg-paper-card border border-ink/20 text-xs font-bold"
                          value={printPreset}
                          onChange={(e: any) => setPrintPreset(e.target.value)}
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
                      <div className="grid grid-cols-2 gap-2">
                        <button className="py-2.5 px-3 rounded-xl bg-gold text-ink font-bold text-xs border border-ink shadow-xs flex items-center justify-center gap-2"
                          type="button"
                          disabled={isSaving || !!qrColorError(customQrColor, customCardBg)} onClick={handlePrintA4}
                        >
                          <Printer className="w-4 h-4" />
                          <span>Doğrudan Yazıcıya Gönder</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadA4Png}
                          className="py-2.5 px-3 rounded-xl bg-white text-ink font-bold text-xs border border-ink/25 shadow-xs flex items-center justify-center gap-2"
                          disabled={isDownloadingA4 || isSaving || !!qrColorError(customQrColor, customCardBg)}
                        >
                          <Download  />
                          <span>
                            {isDownloadingA4
                              ? "Hazırlanıyor..."
                              : "A4 Şablonu Resim İndir"}
                          </span>
                        </button>
                      </div>
                      <p className="text-[10.5px] text-ink-soft leading-relaxed">
                        💡 Kırtasiyede veya başka bir yerde çıktı almak için <strong>&ldquo;A4 Şablonu Resim İndir&rdquo;</strong> seçeneğini kullanabilirsiniz.
                      </p>
                    </div>
                  )}
                  {/* Subtle Vector SVG & Full Card Link */}
                  <div className="flex flex-wrap items-center justify-center gap-2 text-[10.5px] text-ink-soft">
                    <span>
                      Matbaa veya lazer kazıma için{" "}
                      <button
                        type="button"
                        disabled={isSaving || !!qrColorError(customQrColor, customCardBg)} onClick={handleDownloadSvg}
                        className="font-bold text-gold-dark underline hover:text-ink"
                      >
                        SVG indir
                      </button>
                    </span>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={handleDownloadFullCard}
                      className="font-bold text-ink-soft underline hover:text-ink"
                      disabled={isExportingCard || isSaving || !!qrColorError(customQrColor, customCardBg)}
                    >
                      {isExportingCard ? "Hazırlanıyor..." : "Kart Görselini İndir"}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleSaveAndRedirect}
                  disabled={isSaving || isLoadingItem || !!qrColorError(customQrColor, customCardBg)}
                  className="w-full py-3.5 px-4 rounded-[10px] bg-paper-hover hover:bg-gold text-ink font-bold text-xs border border-ink/30 shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSaving
                      ? "Kaydediliyor..."
                      : editItemId
                      ? "Değişiklikleri Güncelle"
                      : "Kaydet ve eşyalarıma ekle"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Floating Mini Preview Pill */}
        {mobileStudioTab === "design" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden fixed bottom-28 right-4 z-40"
          >
            <button
              type="button"
              onClick={() => {
                haptic.lightTap();
                setMobileStudioTab("preview");
              }}
              className="flex items-center gap-2 pl-2 pr-3.5 py-2 rounded-full bg-ink text-white shadow-xl border border-white/20 active:scale-95 transition-transform"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border border-white/30"
                style={{ backgroundColor: activeCardBg, color: activeQrColor }}
              >
                QR
              </div>
              <span className="text-[11px] font-bold">Önizle</span>
              <Eye className="w-3.5 h-3.5 text-gold" />
            </button>
          </motion.div>
        )}

        {/* Mobile Sticky Action Bar */}
        <div className="lg:hidden fixed bottom-[60px] left-0 right-0 p-2.5 bg-white/95 backdrop-blur-md border-t border-ink/15 z-30 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink truncate min-w-0">
            <QrCode className="w-4 h-4 text-gold-dark shrink-0" />
            <span className="truncate">{selectedDesign.name}</span>
          </div>
          <button
            type="button"
            onClick={handleSaveAndRedirect}
            disabled={isSaving || isLoadingItem || !!qrColorError(customQrColor, customCardBg)}
            className="py-2 px-4 rounded-xl bg-gold hover:bg-gold-dark text-ink font-extrabold text-xs shadow-xs active:scale-95 transition-transform flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>
              {isSaving
                ? "Kaydediliyor..."
                : editItemId
                ? "Güncelle"
                : "Kaydet & Bitir"}
            </span>
          </button>
        </div>
      </motion.main>
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div >
          <div >
            <Loader2  />
            <span>QR Tasarım Stüdyosu Yükleniyor...</span>
          </div>
        </div>
      }
    >
      <StudioContent />
    </Suspense>
  );
}
