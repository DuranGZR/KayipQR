"use client";
import { qrColorError } from "@/lib/qrPolicy";
import { resolveQrDesign } from "@/components/ui/DynamicQrRenderer";
import { useState } from "react";
import { Download, Printer, Check, ChevronDown, Loader2 } from "lucide-react";
import { generateCustomQrSvgString } from "@/components/ui/DynamicQrRenderer";
import { downloadA4SheetPng, printA4Sheet, StickerPrintConfig } from "@/lib/printEngine";
import { getPublicAppUrl } from "@/lib/api";

const layouts: { id: NonNullable<StickerPrintConfig["sizePreset"]>; label: string; hint: string; cols: number; count: number }[] = [
  { id: "mix", label: "Karma", hint: "9 etiket · 3 boy", cols: 3, count: 9 },
  { id: "nano", label: "Küçük", hint: "12 etiket", cols: 4, count: 12 },
  { id: "standard", label: "Orta", hint: "6 etiket", cols: 2, count: 6 },
  { id: "luggage", label: "Büyük", hint: "4 etiket", cols: 2, count: 4 },
  { id: "round", label: "Madalyon", hint: "8 etiket", cols: 3, count: 8 },
];

export async function makePng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("QR görseli hazırlanamadı.")); img.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Tarayıcı görsel oluşturmayı desteklemiyor.");
    context.drawImage(img, 0, 0);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Görsel oluşturulamadı.")), "image/png"));
  } finally { URL.revokeObjectURL(url); }
}

export function QrExportPanel({ config }: { config: StickerPrintConfig }) {
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [preset, setPreset] = useState<StickerPrintConfig["sizePreset"]>("mix");
  const fileName = `kayipqr-${config.uniqueCode}`;
  const svg = () => generateCustomQrSvgString({ data: `${getPublicAppUrl()}/q/${config.uniqueCode}`, size: 2000, designId: config.designId, dotColor: config.dotColor, bgColor: config.bgColor, labelText: config.frameText });
  const save = (blob: Blob, extension: string) => {
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `${fileName}.${extension}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const colors = resolveQrDesign({ designId: config.designId, dotColor: config.dotColor, bgColor: config.bgColor });
  const colorError = qrColorError(colors.fgColor, colors.bgColor);
  const run = async (action: string, task: () => Promise<void> | void) => {
    if (busy || colorError) return;
    setBusy(action); setError(""); setStatus("");
    try { await task(); setStatus(action === "print" ? "Baskı penceresi açıldı. PDF olarak da kaydedebilirsin." : "Dosyan hazır. İndirilenler klasörünü kontrol edebilirsin."); }
    catch (cause) { if ((cause as Error).name !== "AbortError") setError((cause as Error).message || "İşlem tamamlanamadı. Tekrar dene."); }
    finally { setBusy(""); }
  };
  return <div className="space-y-3">
    {colorError && <p role="alert" className="app-error">{colorError} Tasarımı stüdyoda düzenleyebilirsin.</p>}
    <button className="app-button app-button-primary w-full" disabled={!!busy || !!colorError} onClick={() => run("png", async () => save(await makePng(svg()), "png"))}>
      {busy === "png" ? <Loader2 size={19} className="animate-spin" /> : <Download size={19} />}{busy === "png" ? "Görsel hazırlanıyor…" : "QR görselini indir"}
    </button>
    <p className="text-center text-xs text-ink-soft">Yüksek çözünürlüklü PNG · Baskıya hazır</p>
    <button className="app-button w-full justify-between" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}><span className="flex gap-2 items-center"><Printer size={18} />A4 baskı ve diğer formatlar</span><ChevronDown size={18} className={advanced ? "rotate-180" : ""} /></button>
    {advanced && <div className="app-card !p-4 space-y-4">
      <p className="text-sm font-bold">A4 yerleşimini seç</p>
      <div className="grid grid-cols-2 gap-2">{layouts.map(layout => <button key={layout.id} aria-pressed={preset === layout.id} onClick={() => setPreset(layout.id)} className={`app-card app-design-card text-left !p-4 ${preset === layout.id ? "" : ""}`}>
        <span className="flex justify-between text-sm font-bold">{layout.label}{preset === layout.id && <Check size={15} className="text-[#1E7E75]" />}</span>
        <span className="grid gap-1 w-14 my-2" style={{ gridTemplateColumns: `repeat(${layout.cols}, 1fr)` }}>{Array.from({ length: layout.count }, (_, index) => <span key={index} className="aspect-square rounded-[2px] bg-[#1E7E75]/35" />)}</span>
        <span className="text-xs text-ink-soft">{layout.hint}</span>
      </button>)}</div>
      <button className="app-button w-full" disabled={!!busy || !!colorError} onClick={() => run("a4", () => downloadA4SheetPng({ ...config, sizePreset: preset }))}>{busy === "a4" ? "A4 hazırlanıyor…" : "A4 şablonunu indir (PNG)"}</button>
      <button className="app-button w-full" disabled={!!busy || !!colorError} onClick={() => run("print", () => printA4Sheet({ ...config, sizePreset: preset }))}><Printer size={17} />Yazdır / PDF kaydet</button>
      <button className="app-button w-full" disabled={!!busy || !!colorError} onClick={() => run("svg", () => save(new Blob([svg()], { type: "image/svg+xml;charset=utf-8" }), "svg"))}>Vektör olarak indir (SVG)</button>
      <p className="text-xs leading-relaxed text-ink-soft">Tek bir eşyanın etiketleri aynı sayfaya yerleştirilir. Baskı ölçeğini %100 seç.</p>
    </div>}
    {busy && <p role="status" className="text-sm text-ink-soft text-center">İşlemin hazırlanıyor, lütfen bekle…</p>}
    {status && <p role="status" className="app-success">{status}</p>}
    {error && <p role="alert" className="app-error">{error}</p>}
  </div>;
}
