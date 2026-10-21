"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Bell, ChevronRight, Eye, EyeOff, KeyRound, Loader2, LogOut, ShieldCheck, Trash2, UserRound, X, Check } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { authApi, getAuthToken, clearAuthTokens, getStoredUser, setAuthSession, User } from "@/lib/api";

type Section = "profile" | "notifications" | "password" | "account" | null;
const sectionNames = { profile: "Profil bilgileri", notifications: "Bildirim tercihleri", password: "Şifre değiştir", account: "Hesap işlemleri" };
export default function SettingsPage() {
  const router = useRouter(); const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [onMessage, setOnMessage] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [permission, setPermission] = useState("unsupported");
  const operationLock = useRef(false);
  const dirty = !!user && (name !== (user.full_name || "") || phone !== (user.phone_number || "") || onMessage !== (user.email_on_message ?? true) || !!currentPassword || !!password || !!repeat);
  const reset = (next: User) => { setName(next.full_name || ""); setPhone(next.phone_number || ""); setOnMessage(next.email_on_message ?? true); setCurrentPassword(""); setPassword(""); setRepeat(""); setErrors({}); };
  const load = async () => {
    if (!getAuthToken()) { router.replace("/login"); return; }
    setLoading(true); setLoadError("");
    try { const next = await authApi.getMe(); setUser(next); reset(next); }
    catch (cause) { setLoadError((cause as Error).message); if (!getAuthToken()) router.replace("/login"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); if ("Notification" in window) setPermission(Notification.permission); }, []);
  const navigate = (next: Section) => {
    if (busy) return;
    if (user) reset(user); setSection(next); window.scrollTo({ top: 0 });
  };
  const save = async () => {
    if (!user || operationLock.current) return;
    const nextErrors: Record<string, string> = {};
    if (section === "profile" && name.length > 255) nextErrors.name = "Adın en fazla 255 karakter olabilir.";
    if (section === "profile" && phone && !/^[+\d\s()\-]{7,50}$/.test(phone)) nextErrors.phone = "Geçerli bir telefon numarası yaz.";
    if (section === "password") {
      if (!currentPassword) nextErrors.current = "Mevcut şifreni yaz.";
      if (password.length < 6) nextErrors.password = "Yeni şifren en az 6 karakter olmalı.";
      if (password !== repeat) nextErrors.repeat = "Şifreler birbiriyle eşleşmiyor.";
    }
    setErrors(nextErrors); if (Object.keys(nextErrors).length) return;
    operationLock.current = true; setBusy(true);
    try {
      if (section === "password") { await authApi.changePassword({ current_password: currentPassword, new_password: password }); setCurrentPassword(""); setPassword(""); setRepeat(""); }
      else {
        const next = await authApi.updateProfile({ full_name: name.trim(), phone_number: phone.trim(), email_on_message: onMessage });
        setUser(next); reset(next);
        const token = getAuthToken(); if (token) setAuthSession(token, next, !!localStorage.getItem("kayipqr_token"));
      }
      toast.success("Değişikliklerin kaydedildi."); setSection(null);
    } catch (cause) { setErrors({ form: (cause as Error).message }); }
    finally { operationLock.current = false; setBusy(false); }
  };
  const editable = section === "profile" || section === "notifications" || section === "password";
  const fieldError = (key: string) => errors[key] && <p role="alert" className="text-sm text-rose-700 mt-2">{errors[key]}</p>;
  const links = [
    { id: "profile" as const, icon: UserRound, label: "Profil bilgileri", hint: "Adın ve iletişim bilgilerin", color: "bg-[#eee8dc]" },
    { id: "notifications" as const, icon: Bell, label: "Bildirim tercihleri", hint: "Nelerden haberdar olmak istersin?", color: "bg-[#f8edcf]" },
    { id: "password" as const, icon: KeyRound, label: "Şifre değiştir", hint: "Hesabının güvenliğini yönet", color: "bg-[#e7ede2]" },
    { id: "account" as const, icon: ShieldCheck, label: "Hesap işlemleri", hint: "Oturum ve hesap yönetimi", color: "bg-[#eee8dc]" },
  ];
  return <div className="app-shell min-h-screen flex flex-col md:flex-row"><Sidebar />
    <main className="app-main">
      {section ? <header className="flex items-center gap-3 mb-7"><button className="app-icon-button border border-ink/10 bg-paper-card" onClick={() => navigate(null)} aria-label="Hesabıma dön"><ArrowLeft size={21} /></button><h1 className="text-xl font-extrabold">{sectionNames[section]}</h1></header> : <header className="mb-7"><p className="app-eyebrow mb-2">SANA AİT ALAN</p><h1 className="text-[29px] font-extrabold">Hesabım<span className="text-[#1E7E75]">.</span></h1></header>}
      {loading ? <div className="app-card h-72 skeleton-shimmer" role="status" aria-label="Hesap yükleniyor" /> : loadError ? <div className="app-error" role="alert">{loadError}<button className="app-button mt-3" onClick={load}>Yeniden dene</button></div> : user && <div className="max-w-2xl">
        {!section && <><div className="flex gap-4 items-center mb-7 app-card"><div className="w-16 h-16 rounded-full bg-gold/35 border border-gold/40 flex items-center justify-center text-xl font-extrabold shrink-0">{(user.full_name || user.email).slice(0, 2).toLocaleUpperCase("tr-TR")}</div><div className="min-w-0"><h2 className="text-lg font-extrabold truncate">{user.full_name || "KayıpQR hesabın"}</h2><p className="text-sm text-ink-soft truncate mt-1">{user.email}</p><span className="inline-flex gap-1 text-xs text-[#1E7E75] items-center mt-2"><ShieldCheck size={13} />Kişisel bilgilerin sana özel</span></div></div>
          <div className="app-card !p-0 overflow-hidden">{links.map(entry => <button key={entry.id} className="w-full flex items-center text-left gap-3 p-4 md:p-5 border-b last:border-0 border-ink/10 hover:bg-ink/[.02]" onClick={() => navigate(entry.id)}><span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${entry.color}`}><entry.icon size={21} /></span><span className="flex-1 min-w-0"><strong className="block text-[15px]">{entry.label}</strong><span className="block text-xs text-ink-soft mt-1">{entry.hint}</span></span><ChevronRight size={18} className="text-ink/35" /></button>)}</div>
          <button className="app-button w-full mt-6 !bg-transparent text-ink-soft" onClick={() => setLogoutOpen(true)}><LogOut size={18} />Çıkış yap</button><p className="text-center text-xs text-ink-soft mt-7">KayıpQR · Eşyalarınla bağın kopmasın.</p>
        </>}
        {section === "profile" && <form id="settings-form" className="app-card space-y-6" onSubmit={event => { event.preventDefault(); save(); }}>
          <div><label className="app-label" htmlFor="full-name">Görünen adın</label><input id="full-name" autoComplete="name" className="app-input" value={name} maxLength={255} aria-invalid={!!errors.name} onChange={event => setName(event.target.value)} />{fieldError("name")}</div>
          <div><label className="app-label" htmlFor="phone">Telefon <span className="font-normal text-ink-soft">(isteğe bağlı)</span></label><input id="phone" type="tel" inputMode="tel" autoComplete="tel" className="app-input" placeholder="05XX XXX XX XX" maxLength={50} value={phone} aria-invalid={!!errors.phone} onChange={event => setPhone(event.target.value)} />{fieldError("phone")}<p className="text-xs leading-relaxed text-ink-soft mt-2">Telefonun bulan kişiye gösterilmez. İletişim site içindeki mesajlardan devam eder.</p></div>
          <div><label className="app-label" htmlFor="email">E-posta adresin</label><input id="email" type="email" className="app-input" value={user.email} disabled /><p className="text-xs text-ink-soft mt-2">E-posta adresi bu ekrandan değiştirilemez.</p></div>
        </form>}
        {section === "notifications" && <div className="space-y-5"><section className="app-card"><h2 className="font-extrabold text-lg mb-2">E-posta bildirimleri</h2><p className="text-sm text-ink-soft mb-5">Önemli anlardan haberdar ol.</p>{[{ label: "Yeni konuşmanın ilk mesajı", hint: "Her yeni konuşmada yalnızca ilk mesaj için e-posta al. QR taramalarında ve sonraki mesajlarda e-posta gönderilmez.", value: onMessage, set: setOnMessage }].map(entry => <label key={entry.label} className="flex justify-between gap-5 items-center py-5 border-t border-ink/10 cursor-pointer"><span><strong className="block text-sm">{entry.label}</strong><span className="block text-xs text-ink-soft leading-relaxed mt-1">{entry.hint}</span></span><input type="checkbox" className="app-switch" checked={entry.value} onChange={event => entry.set(event.target.checked)} /></label>)}</section>
          <section className="app-card"><h2 className="font-bold mb-2">Tarayıcı uyarıları</h2><p className="text-sm leading-relaxed text-ink-soft mb-4">Site açıkken yeni bildirimleri ekranında gösterir. Site kapalıyken e-posta tercihlerin geçerlidir.</p><button className="app-button w-full" disabled={permission === "granted" || permission === "unsupported"} onClick={async () => { try { setPermission(await Notification.requestPermission()); } catch { toast.error("Tarayıcı izni alınamadı."); } }}>{permission === "granted" ? "Bildirim izni açık ✓" : permission === "unsupported" ? "Bu tarayıcı desteklemiyor" : permission === "denied" ? "Tarayıcı ayarlarından izin ver" : "Tarayıcı bildirimlerini aç"}</button>{permission === "denied" && <p className="text-xs text-ink-soft leading-relaxed mt-3">Adres çubuğundaki site ayarlarından bildirim iznini değiştirebilirsin.</p>}</section>
        </div>}
        {section === "password" && user.has_password === false && <p className="app-card text-sm leading-relaxed">Google ile giriş yapıyorsun. E-posta ile giriş için <a className="underline" href="/forgot-password">şifre belirleme bağlantısı isteyebilirsin</a>.</p>}
        {section === "password" && user.has_password !== false && <form id="settings-form" className="app-card space-y-5" onSubmit={event => { event.preventDefault(); save(); }}><p className="text-sm leading-relaxed text-ink-soft">Tahmin edilmesi zor, başka bir yerde kullanmadığın bir şifre seç.</p>{[{ id: "current", label: "Mevcut şifren", value: currentPassword, set: setCurrentPassword, auto: "current-password" }, { id: "password", label: "Yeni şifren", value: password, set: setPassword, auto: "new-password" }, { id: "repeat", label: "Yeni şifreni tekrar yaz", value: repeat, set: setRepeat, auto: "new-password" }].map(field => <div key={field.id}><label className="app-label" htmlFor={field.id}>{field.label}</label><input id={field.id} type={showPassword ? "text" : "password"} autoComplete={field.auto} className="app-input" required maxLength={128} value={field.value} aria-invalid={!!errors[field.id]} onChange={event => field.set(event.target.value)} />{fieldError(field.id)}</div>)}<button type="button" className="app-button w-full" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}{showPassword ? "Şifreleri gizle" : "Şifreleri göster"}</button></form>}
        {section === "account" && <div className="space-y-5"><section className="app-card"><h2 className="font-extrabold text-lg">Oturumun</h2><p className="text-sm text-ink-soft mt-2 mb-5">Bu cihazdaki hesabından güvenle çıkış yap.</p><button className="app-button w-full" onClick={() => setLogoutOpen(true)}><LogOut size={18} />Çıkış yap</button></section><section className="app-card !border-rose-200"><h2 className="font-extrabold text-lg text-rose-800">Hesabını sil</h2><p className="text-sm text-ink-soft leading-relaxed mt-2 mb-5">Hesabınla birlikte eşyaların, QR kodların ve konuşmaların kalıcı olarak silinir. Basılı etiketlerin artık çalışmaz.</p><button className="app-button w-full text-rose-700 !border-rose-200" onClick={() => setDeleteOpen(true)}><Trash2 size={18} />Hesabımı sil</button></section></div>}
        {errors.form && <p role="alert" className="app-error mt-5">{errors.form}</p>}
        {editable && <><button className="app-button app-button-primary w-full mt-6 hidden md:flex" disabled={!dirty || busy} onClick={save}>{busy ? "Kaydediliyor…" : "Değişiklikleri kaydet"}</button><div className="app-mobile-action"><button className="app-button flex-1 app-button-primary" disabled={!dirty || busy} onClick={save}>{busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}{busy ? "Kaydediliyor…" : dirty ? "Değişiklikleri kaydet" : "Tüm değişiklikler kaydedildi"}</button></div></>}
      </div>}
    </main>
    <Sheet open={deleteOpen} onClose={() => !busy && setDeleteOpen(false)} title="Hesabını kalıcı olarak sil?"><p className="text-sm leading-relaxed text-ink-soft mb-5">Bu işlem geri alınamaz. Devam etmek için aşağıya <strong>hesabımı sil</strong> yaz.</p><label className="app-label" htmlFor="delete-confirm">Onay metni</label><input id="delete-confirm" className="app-input mb-4" autoComplete="off" value={deleteText} onChange={event => setDeleteText(event.target.value)} /><button className="app-button app-button-danger w-full text-white" disabled={busy || deleteText.trim().toLocaleLowerCase("tr-TR") !== "hesabımı sil"} onClick={async () => {
      if (operationLock.current) return; operationLock.current = true; setBusy(true);
      try { await authApi.deleteAccount(); clearAuthTokens(); router.replace("/"); } catch (cause) { toast.error((cause as Error).message); } finally { setBusy(false); operationLock.current = false; }
    }}>{busy ? "Siliniyor…" : "Hesabımı kalıcı olarak sil"}</button></Sheet>
    <Sheet open={logoutOpen} onClose={() => setLogoutOpen(false)} title="Çıkış yap?"><p className="text-sm text-ink-soft mb-5">Eşyaların ve mesajların hesabında güvende kalacak. Tekrar giriş yaparak devam edebilirsin.</p><button className="app-button app-button-primary w-full" onClick={() => { clearAuthTokens(); router.replace("/login"); }}>Evet, çıkış yap</button></Sheet>
  </div>;
}

