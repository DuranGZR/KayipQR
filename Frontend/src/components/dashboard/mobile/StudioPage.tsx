"use client";
import { useStudioDraft } from "@/lib/useStudioDraft";
import { isQrColor as validColor, qrContrast as contrast, qrColorError, ITEM_NAME_MAX, OWNER_NAME_MAX, ITEM_NOTE_MAX, QR_LABEL_MAX } from "@/lib/qrPolicy";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Palette, Package, Download, RotateCcw, Eye, X, ShieldCheck, Sparkles } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DynamicQrRenderer, CUSTOM_QR_DESIGNS } from "@/components/ui/DynamicQrRenderer";
import { QrExportPanel } from "@/components/dashboard/QrExportPanel";
import { Sheet } from "@/components/ui/Sheet";
import { itemsApi, getAuthToken, getPublicAppUrl, ItemData } from "@/lib/api";
import { decodeHtmlEntities } from "@/lib/utils";

const categories = ["Kişisel Eşya", "Teknoloji", "Çanta & Bavul", "Anahtar", "Evcil Hayvan", "Kimlik & Kart"];
function Studio() {
  const router = useRouter(); const search = useSearchParams();
  const editId = search.get("edit") || search.get("id");
  const { form, setForm, step, setStep, item, setItem, saving, setSaving } = useStudioDraft(editId);
  const [loading, setLoading] = useState(!!editId);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [preview, setPreview] = useState(false);
  const saveLock = useRef(false);
  const patch = (values: Partial<typeof form>) => setForm(previous => ({ ...previous, ...values }));
  useEffect(() => {
    if (!getAuthToken()) { router.replace("/login?redirect=/studio"); return; }
    let cancelled = false;
    if (!editId || item?.id === editId) { setLoading(false); return; }
    setLoading(true);
    itemsApi.get(editId).then(result => {
      if (cancelled) return;
      const design = CUSTOM_QR_DESIGNS.find(preset => preset.id === result.qr_code?.frame_type) || CUSTOM_QR_DESIGNS[0];
      const next: typeof form = { name: decodeHtmlEntities(result.name), category: result.category, owner: decodeHtmlEntities(result.owner_display_name), note: decodeHtmlEntities(result.description), showName: result.show_name_to_finder ?? true, showNote: result.show_desc_to_finder ?? true, design: design.id, foreground: result.qr_code?.color_dark || design.fgColor, background: result.qr_code?.color_light || design.bgColor, label: result.qr_code?.frame_text ?? "BENİ TARA" };
      setForm(next); setItem(result); setError("");
    }).catch(cause => { if (!cancelled) setError((cause as Error).message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [editId, router]);
  const preset = CUSTOM_QR_DESIGNS.find(design => design.id === form.design) || CUSTOM_QR_DESIGNS[0];
  const fg = validColor(form.foreground) ? form.foreground : preset.fgColor;
  const bg = validColor(form.background) ? form.background : preset.bgColor;
  const colorsValid = validColor(form.foreground) && validColor(form.background);
  const ratio = contrast(fg, bg);
  const qr = (size: number, code = item?.qr_code?.unique_code || "ONIZLEME") => <DynamicQrRenderer data={`${getPublicAppUrl()}/q/${code}`} designId={form.design} size={size} dotColor={fg} bgColor={bg} labelText={form.label} />;
  const go = (next: number) => { setStep(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const next = async () => {
    setError("");
    if (!form.name.trim()) { setNameError("Eşyan için bir isim yaz."); go(0); document.getElementById("item-name")?.focus(); return; }
    setNameError("");
    if (step === 0) { go(1); return; }
    if (saveLock.current || saving || loading) return;
    const colorError = qrColorError(form.foreground, form.background);
    if (colorError) { setError(colorError); return; }
    saveLock.current = true; setSaving(true);
    try {
      const data = { name: form.name.trim(), category: form.category, description: form.note.trim(), owner_display_name: form.owner.trim(), show_name_to_finder: form.showName, show_desc_to_finder: form.showNote, qr_color_dark: fg, qr_color_light: bg, qr_pattern_style: form.design, qr_frame_type: form.design, qr_frame_text: form.label };
      const result = item ? await itemsApi.update(item.id, data) : await itemsApi.create(data);
      setItem(result); go(2);
    } catch (cause) { setError((cause as Error).message); }
    finally { setSaving(false); saveLock.current = false; }
  };
  return <div className="app-shell min-h-screen flex flex-col md:flex-row">
    <Sidebar />
    <main className="app-main">
      <header className="flex justify-between items-start gap-4 mb-6">
        <div><p className="app-eyebrow mb-2">{editId ? "ETİKETİNİ GÜNCELLE" : "SANA ÖZEL BİR ETİKET"}</p><h1 className="text-[28px] md:text-3xl font-extrabold tracking-tight">{step === 2 ? "Etiketin hazır!" : "Bir eşya, bir QR."}</h1><p className="text-sm text-ink-soft mt-2">{step === 0 ? "Önce neyi koruyacağımızı seçelim." : step === 1 ? "Şimdi ona senin tarzını katalım." : "İndir ve eşyana ekle."}</p></div>
        <button className="app-icon-button border border-ink/10 bg-white shrink-0" aria-label="Stüdyodan çık" onClick={() => router.push("/dashboard")}><X size={20} /></button>
      </header>
      <ol className="flex items-center gap-2 mb-7" aria-label="QR oluşturma adımları">{["Eşyan", "Tasarım", "Hazır"].map((label, index) => <li key={label} className="flex-1"><button disabled={index > step} onClick={() => go(index)} aria-current={step === index ? "step" : undefined} className={`w-full flex items-center gap-2 py-3 border-b-2 text-sm font-bold ${step === index ? "border-[#1E7E75] text-[#1E7E75]" : step > index ? "border-[#1E7E75]/30" : "border-ink/10 text-ink/40"}`}><span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${step >= index ? "bg-[#1E7E75] text-white" : "bg-ink/5"}`}>{step > index ? <Check size={15} /> : index + 1}</span>{label}</button></li>)}</ol>
      {error && <div role="alert" className="app-error mb-5">{error}</div>}
      {loading ? <div className="app-card py-20 text-center" role="status"><Loader2 className="animate-spin mx-auto mb-3" />Eşya yükleniyor…</div> : error && editId && !item ? <Link className="app-button" href="/dashboard">Eşyalarıma dön</Link> : <>
        {step === 0 && <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
          <section className="app-card space-y-6">
            <div><label className="app-label" htmlFor="item-name">Eşyana bir isim ver</label><input id="item-name" className="app-input" placeholder="Örn. Günlük sırt çantam" maxLength={ITEM_NAME_MAX} value={form.name} aria-invalid={!!nameError} aria-describedby={nameError ? "name-error" : undefined} onChange={event => { patch({ name: event.target.value }); setNameError(""); }} />{nameError && <p id="name-error" role="alert" className="text-sm text-rose-700 mt-2">{nameError}</p>}</div>
            <fieldset><legend className="app-label">Kategori</legend><div className="flex flex-wrap gap-2">{(categories.includes(form.category) ? categories : [form.category, ...categories]).map(category => <button key={category} className="app-chip" aria-pressed={form.category === category} onClick={() => patch({ category })}>{category}</button>)}</div></fieldset>
            <div><label className="app-label" htmlFor="owner-name">Görünen adın <span className="font-normal text-ink-soft">(isteğe bağlı)</span></label><input id="owner-name" className="app-input" placeholder="Örn. Duran K." maxLength={OWNER_NAME_MAX} value={form.owner} onChange={event => patch({ owner: event.target.value })} /><p className="text-xs text-ink-soft mt-2">Boş bırakırsan “Eşya Sahibi” görünür.</p></div>
            <div><label className="app-label" htmlFor="finder-note">Bulan kişiye notun <span className="font-normal text-ink-soft">(isteğe bağlı)</span></label><textarea id="finder-note" className="app-input min-h-28 resize-y" rows={3} maxLength={ITEM_NOTE_MAX} placeholder="Bulduysan lütfen buradan mesaj bırak. Teşekkürler!" value={form.note} onChange={event => patch({ note: event.target.value })} /></div>
            <details className="border-t border-ink/10 pt-4"><summary className="font-bold text-sm cursor-pointer min-h-11 flex items-center gap-2"><ShieldCheck size={18} />Görünürlük tercihleri</summary><div className="space-y-4 pt-3">{[{ key: "showName" as const, label: "Eşya adı görünsün" }, { key: "showNote" as const, label: "Notum görünsün" }].map(option => <label key={option.key} className="flex justify-between items-center gap-4 min-h-12 text-sm">{option.label}<input type="checkbox" className="app-switch" checked={form[option.key]} onChange={event => patch({ [option.key]: event.target.checked })} /></label>)}</div></details>
          </section>
          <aside className="app-card bg-[#edf1e8]"><div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center mb-4"><ShieldCheck className="text-[#1E7E75]" /></div><h2 className="text-lg font-bold">Sana ulaşırlar,<br />bilgilerine değil.</h2><p className="text-sm leading-relaxed text-ink-soft mt-3">QR etiketin yalnızca bu eşyanın sayfasını açar. Telefonun ve e-postan bulan kişiye gösterilmez.</p></aside>
        </div>}
        {step === 1 && <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
          <div className="space-y-5">
            <section><div className="flex items-center justify-between gap-2 mb-3"><h2 className="text-lg font-extrabold">Hangi tasarım senin?</h2><button className="app-icon-button bg-paper-card border border-ink/10 shrink-0" onClick={() => setPreview(true)} aria-label="Seçili tasarımı büyük önizle"><Eye size={20} /></button></div><div className="grid grid-cols-2 gap-3">{CUSTOM_QR_DESIGNS.map(design => <button key={design.id} aria-pressed={form.design === design.id} onClick={() => patch({ design: design.id, foreground: design.fgColor, background: design.bgColor })} className="app-card app-design-card relative !p-4 text-left transition-colors">
              {form.design === design.id && <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#1E7E75] text-white flex items-center justify-center"><Check size={14} /></span>}
              <div className="h-32 flex items-center justify-center overflow-hidden"><DynamicQrRenderer data={`${getPublicAppUrl()}/q/ONIZLEME`} designId={design.id} size={104} labelText="" /></div><span className="block text-sm font-bold mt-2">{design.name.replace(/^\d+\.\s*/, "")}</span><span className="block text-[11px] text-ink-soft mt-1">{design.shape === "circle" ? "Yuvarlak etiket" : "Kare etiket"}</span>
            </button>)}</div></section>
            <section className="app-card space-y-4"><label className="app-label" htmlFor="qr-label">Etiketin üzerindeki yazı</label><input id="qr-label" className="app-input" maxLength={QR_LABEL_MAX} value={form.label} onChange={event => patch({ label: event.target.value })} placeholder="Yazısız da kullanabilirsin" /><div className="flex gap-2 flex-wrap">{["BENİ TARA", "BULDUYSAN TARA", ""].map(label => <button className="app-chip" key={label} aria-pressed={form.label === label} onClick={() => patch({ label })}>{label || "Yazısız"}</button>)}</div>
              <details className="border-t border-ink/10 pt-4"><summary className="flex items-center gap-2 font-bold text-sm min-h-11 cursor-pointer"><Palette size={18} />Renkleri özelleştir</summary><div className="grid grid-cols-2 gap-3 mt-3">{[{ key: "foreground" as const, label: "QR rengi", color: fg }, { key: "background" as const, label: "Zemin", color: bg }].map(option => <div key={option.key}><label className="app-label" htmlFor={option.key}>{option.label}</label><input type="color" className="w-full h-12 rounded-lg" aria-label={option.label + " seç"} value={option.color} onChange={event => patch({ [option.key]: event.target.value })} /><input id={option.key} className="app-input mt-2 !text-sm" maxLength={7} value={form[option.key]} aria-invalid={!validColor(form[option.key])} onChange={event => patch({ [option.key]: event.target.value })} /></div>)}</div><button className="app-button w-full mt-4" onClick={() => patch({ foreground: preset.fgColor, background: preset.bgColor })}><RotateCcw size={17} />Orijinal renklere dön</button></details>
            </section>
          </div>
          <aside className="app-card lg:sticky lg:top-6 text-center"><p className="app-eyebrow mb-4">CANLI ÖNİZLEME</p><div className="flex justify-center">{qr(240)}</div><h2 className="font-bold mt-5">{form.name}</h2><p className="text-sm text-ink-soft mt-2">{preset.name.replace(/^\d+\.\s*/, "")}</p><div className={`text-sm rounded-xl p-3 mt-5 ${ratio < 3 ? "bg-amber-50 text-amber-900" : "bg-[#e9f0e6] text-[#28654b]"}`}>{ratio < 3 ? "Kontrast düşük. Daha zıt renkler seç." : "Renk kontrastı iyi."} <span className="font-bold">{ratio.toFixed(1)}:1</span></div><p className="text-xs text-ink-soft leading-relaxed mt-3">Önizleme kodudur. Kaydettikten sonra gerçek QR’ın hazır olacak. Baskıyı kullanmadan önce kameranla dene.</p><button className="app-button w-full mt-4" onClick={() => setPreview(true)}><Eye size={18} />Büyük önizleme</button></aside>
        </div>}
        {step === 2 && item?.qr_code && <div className="max-w-xl mx-auto">
          <section className="app-card text-center mb-5 relative overflow-hidden"><span className="inline-flex gap-2 items-center px-3 py-1.5 rounded-full bg-[#e6eee3] text-[#28654b] text-xs font-bold mb-4"><Check size={15} />Kaydedildi · Kullanıma hazır</span><div className="flex justify-center">{qr(190)}</div><h2 className="text-xl font-extrabold mt-4">{item.name}</h2><p className="font-mono text-xs text-ink-soft mt-2">{item.qr_code.unique_code}</p><p className="hidden md:block text-sm leading-relaxed text-ink-soft mt-4">Bu QR artık eşyanın sayfasına bağlı. Bilgilerini güncellesen de etiketin aynı kalır.</p></section>
          <QrExportPanel config={{ itemName: form.name, uniqueCode: item.qr_code.unique_code, designId: form.design, dotColor: fg, bgColor: bg, frameText: form.label }} />
          <Link href={`/dashboard/${item.id}`} className="app-button w-full mt-5">Eşya detayına git<ArrowRight size={17} /></Link>
        </div>}
        {step < 2 && <div className="hidden md:flex justify-between gap-4 mt-7"><button className="app-button" onClick={() => step ? go(step - 1) : router.push("/dashboard")}><ArrowLeft size={18} />Geri</button><button className="app-button app-button-primary min-w-48" disabled={saving || loading || (!!editId && !item) || (step === 1 && !!qrColorError(form.foreground, form.background))} onClick={next}>{saving ? <Loader2 className="animate-spin" size={18} /> : step === 0 ? <Palette size={18} /> : <Check size={18} />}{saving ? "Kaydediliyor…" : step === 0 ? "Tasarıma geç" : "Kaydet ve QR’ı hazırla"}<ArrowRight size={17} /></button></div>}
      </>}
      {step < 2 && <div className="app-mobile-action"><button className="app-icon-button border border-ink/15 !h-12 !w-12" aria-label="Önceki adıma dön" onClick={() => step ? go(step - 1) : router.push("/dashboard")}><ArrowLeft size={21} /></button><button className="app-button app-button-primary flex-1" disabled={saving || loading || (!!editId && !item) || (step === 1 && !!qrColorError(form.foreground, form.background))} onClick={next}>{saving ? <Loader2 size={19} className="animate-spin" /> : step === 0 ? <Palette size={19} /> : <Check size={19} />}{saving ? "Kaydediliyor…" : step === 0 ? "Tasarıma geç" : "Kaydet ve QR’ı hazırla"}<ArrowRight size={18} /></button></div>}
    </main>
    <Sheet open={preview} onClose={() => setPreview(false)} title="Etiket önizlemesi"><div className="flex justify-center py-5">{qr(290)}</div></Sheet>
  </div>;
}
export default function StudioPage() { return <Suspense fallback={<p className="p-10 text-center">Stüdyo yükleniyor…</p>}><Studio /></Suspense>; }

