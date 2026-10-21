"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Lock,
  Bell,
  ShieldCheck,
  Check,
  AlertCircle,
  Save,
  KeyRound,
  Eye,
  EyeOff,
  LogOut,
  Loader2,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  WobblyCardFrame,
  WobblyBoxFrame,
  WobblyButtonFrame,
} from "@/components/ui/SketchBorders";
import { Sidebar } from "./Sidebar";
import { authApi, getAuthToken, clearAuthTokens, User as UserType } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import {
  staggerContainer,
  fadeInUp,
  fadeInScale,
  shakeAnimation,
} from "@/lib/animations";

export default function SettingsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Profile Form States
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailOnMessage, setEmailOnMessage] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");
  const [profileErrorMsg, setProfileErrorMsg] = useState("");

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState("");
  const [passwordErrorMsg, setPasswordErrorMsg] = useState("");

  // Account deletion states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    haptic.warning();
    if (deleteConfirmText.trim().toLowerCase() !== "hesabımı sil") return;
    setIsDeletingAccount(true);
    try {
      await authApi.deleteAccount();
      clearAuthTokens();
      setShowDeleteModal(false);
      router.push("/");
    } catch (err: any) {
      setProfileErrorMsg(err.message || "Hesap silinirken bir hata oluştu.");
      setShowDeleteModal(false);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const user = await authApi.getMe(token);
      setCurrentUser(user);
      setFullName(user.full_name || "");
      setPhoneNumber(user.phone_number || "");
      setEmailOnMessage(user.email_on_message ?? true);
    } catch (err: any) {
      console.error("Failed to load user settings:", err);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg("");
    setProfileErrorMsg("");
    setIsSavingProfile(true);

    try {
      const updated = await authApi.updateProfile({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        email_on_message: emailOnMessage,
      });

      setCurrentUser(updated);
      if (localStorage.getItem("kayipqr_token")) {
        localStorage.setItem("kayipqr_user", JSON.stringify(updated));
      }
      sessionStorage.setItem("kayipqr_user", JSON.stringify(updated));
      setProfileSuccessMsg("Profil ve bildirim tercihleriniz başarıyla güncellendi!");
      setTimeout(() => setProfileSuccessMsg(""), 4000);
    } catch (err: any) {
      setProfileErrorMsg(err.message || "Profil güncellenirken bir hata oluştu.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg("");
    setPasswordErrorMsg("");

    if (newPassword.length < 6) {
      setPasswordErrorMsg("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg("Yeni şifreler birbiriyle eşleşmiyor.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setPasswordSuccessMsg("Şifreniz başarıyla değiştirildi!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccessMsg(""), 4000);
    } catch (err: any) {
      setPasswordErrorMsg(err.message || "Mevcut şifre hatalı veya bir sorun oluştu.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    clearAuthTokens();
    router.push("/login");
  };

  return (
    <div className="min-h-screen dot-grid-pattern text-ink flex flex-col md:flex-row selection:bg-gold selection:text-ink pb-20 md:pb-0">
      
      {/* Shared Left Sidebar */}
      <Sidebar />

      {/* Main Settings Area */}
      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 min-w-0 p-3.5 sm:p-8 lg:p-12 overflow-y-auto"
      >
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2.5">
              <span>Hesap & Güvenlik Ayarları</span>
              <span className="text-[11px] font-bold bg-gold/40 px-2.5 py-0.5 rounded-full border border-ink/20 text-ink">
                KVKK & Gizlilik Korumalı
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-ink-soft mt-1">
              Kişisel bilgilerinizi, güvenlik parolalarınızı ve e-posta bildirim tercihlerinizi yönetin.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 border border-ink/20 text-ink-soft hover:text-rose-700 font-bold text-xs transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Oturumu Kapat</span>
          </motion.button>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-xs font-bold text-ink-soft animate-pulse flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-gold-dark" />
            <span>Kullanıcı ayarları yükleniyor...</span>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer(0.08)}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-6xl"
          >
            
            {/* Left Column: Profile Info & Email Notification Preferences (7 cols) */}
            <motion.div variants={fadeInUp} className="lg:col-span-7 space-y-6">
              
              {/* Profile Card */}
              <div className="relative bg-paper-card p-6 sm:p-7 rounded-[20px] shadow-xs">
                <WobblyCardFrame stroke="#33302B" strokeWidth={1.6} />

                <div className="relative z-10">
                  <div className="flex items-center gap-2 pb-3 mb-4 border-b border-ink/10">
                    <User className="w-4 h-4 text-gold-dark" />
                    <h3 className="font-bold text-base text-ink">1. Kişisel Bilgiler</h3>
                  </div>

                  <AnimatePresence>
                    {profileSuccessMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-2"
                      >
                        <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>{profileSuccessMsg}</span>
                      </motion.div>
                    )}

                    {profileErrorMsg && (
                      <motion.div
                        variants={shakeAnimation}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0 }}
                        className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                        <span>{profileErrorMsg}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" /> Ad Soyad
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Adınız ve Soyadınız"
                          className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-ink/25 text-ink font-semibold text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-gold transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" /> Telefon (Gizli Kalır)
                        </label>
                        <input
                          type="text"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="05XX XXX XX XX"
                          className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-ink/25 text-ink font-semibold text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-gold transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> Kayıtlı E-posta Adresi
                      </label>
                      <input
                        type="email"
                        disabled
                        value={currentUser?.email || ""}
                        className="w-full px-3.5 py-2.5 bg-paper-hover rounded-xl border border-ink/15 text-ink-soft text-xs sm:text-sm font-mono cursor-not-allowed"
                      />
                      <p className="text-[10.5px] text-ink-soft mt-1">
                        🔒 E-posta adresiniz güvenlik sebebiyle kilitlidir ve kimseyle paylaşılmaz.
                      </p>
                    </div>

                    {/* Notification Toggles */}
                    <div className="pt-3 border-t border-ink/10 space-y-3">
                      <div className="flex items-center gap-2 pb-1">
                        <Bell className="w-4 h-4 text-gold-dark" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-ink">
                          E-posta Bildirim Tercihleri
                        </h4>
                      </div>



                      <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-ink/20 shadow-xs">
                        <input
                          type="checkbox"
                          id="emailOnMessage"
                          checked={emailOnMessage}
                          onChange={(e) => setEmailOnMessage(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded border-ink text-gold focus:ring-gold accent-gold cursor-pointer"
                        />
                        <label htmlFor="emailOnMessage" className="text-xs leading-relaxed cursor-pointer">
                          <strong className="block text-ink font-bold">Yeni Konuşmanın İlk Mesajı</strong>
                          <span className="text-ink-soft text-[11px]">
                            Her yeni konuşmada yalnızca ilk mesaj için e-posta alın. QR taramalarında ve sonraki mesajlarda e-posta gönderilmez.
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="pt-2">
                      <motion.button
                        type="submit"
                        disabled={isSavingProfile}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="relative inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-ink font-bold text-xs rounded-[10px] px-5 py-3 shadow-[0_2px_0px_#33302B] active:translate-y-[1px] transition-all cursor-pointer disabled:opacity-75"
                      >
                        <WobblyButtonFrame stroke="#33302B" strokeWidth={1.5} />
                        <Save className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">
                          {isSavingProfile ? "Kaydediliyor..." : "Bilgileri & Tercihleri Kaydet"}
                        </span>
                      </motion.button>
                    </div>
                  </form>
                </div>
              </div>

            </motion.div>

            {/* Right Column: Password Change & Security Info (5 cols) */}
            <motion.div variants={fadeInUp} className="lg:col-span-5 space-y-6">
              
              {/* Password Change Card */}
              <div className="relative bg-paper-card p-6 sm:p-7 rounded-[20px] shadow-xs">
                <WobblyCardFrame stroke="#33302B" strokeWidth={1.6} />

                <div className="relative z-10">
                  <div className="flex items-center gap-2 pb-3 mb-4 border-b border-ink/10">
                    <KeyRound className="w-4 h-4 text-gold-dark" />
                    <h3 className="font-bold text-base text-ink">2. Şifre Değiştir</h3>
                  </div>

                  <AnimatePresence>
                    {passwordSuccessMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-2"
                      >
                        <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>{passwordSuccessMsg}</span>
                      </motion.div>
                    )}

                    {passwordErrorMsg && (
                      <motion.div
                        variants={shakeAnimation}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0 }}
                        className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                        <span>{passwordErrorMsg}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {currentUser?.has_password === false && <p className="text-sm leading-relaxed mb-4">Google ile giriş yapıyorsun. E-posta ile giriş için <a className="underline" href="/forgot-password">şifre belirleme bağlantısı isteyebilirsin</a>.</p>}
                  <form hidden={currentUser?.has_password === false} onSubmit={handleChangePassword} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" /> Mevcut Şifre
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-ink/25 text-ink font-semibold text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-gold transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" /> Yeni Şifre
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="En az 6 karakter"
                        className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-ink/25 text-ink font-semibold text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-gold transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" /> Yeni Şifre (Tekrar)
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-ink/25 text-ink font-semibold text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-gold transition-all"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-xs text-ink-soft hover:text-ink flex items-center gap-1 font-medium transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showPassword ? "Şifreleri Gizle" : "Şifreleri Göster"}</span>
                      </button>
                    </div>

                    <div className="pt-2">
                      <motion.button
                        type="submit"
                        disabled={isChangingPassword}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="relative w-full inline-flex items-center justify-center gap-2 bg-paper-hover hover:bg-gold text-ink font-bold text-xs rounded-[10px] py-3 border border-ink/30 shadow-xs transition-colors cursor-pointer disabled:opacity-75"
                      >
                        <WobblyButtonFrame stroke="#33302B" strokeWidth={1.4} />
                        <span className="relative z-10">
                          {isChangingPassword ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                        </span>
                      </motion.button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Privacy Guarantee Box */}
              <div className="relative bg-paper-card p-5 rounded-[18px] shadow-xs">
                <WobblyBoxFrame stroke="#33302B" strokeWidth={1.4} />
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>Gizlilik & Güvenlik Garantisi</span>
                  </div>
                  <p className="text-[11.5px] text-ink-soft leading-relaxed">
                    KayıpQR üzerinde oluşturduğunuz hiçbir QR kodda telefon numaranız, e-postanız veya gerçek kimliğiniz saklanmaz. Tüm iletişim çift taraflı şifreli anonim katmanda gerçekleşir.
                  </p>
                </div>
              </div>

              {/* Danger Zone (Account Deletion) */}
              <div className="relative bg-rose-50/70 p-5 rounded-[18px] border border-rose-200/80 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Tehlikeli Bölge</span>
                </div>
                <p className="text-[11.5px] text-rose-800 leading-relaxed">
                  Hesabınızı ve buna bağlı tüm QR kodları kalıcı olarak sistemden kaldırabilirsiniz.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    haptic.warning();
                    setShowDeleteModal(true);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-white hover:bg-rose-600 hover:text-white text-rose-700 font-bold text-xs border border-rose-300 shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hesabımı Sil</span>
                </button>
              </div>

            </motion.div>

          </motion.div>
        )}

      </motion.main>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-ink/20 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-ink/10">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Hesabı Kalıcı Olarak Sil</span>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 rounded-lg hover:bg-paper-hover text-ink-soft"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-ink-soft leading-relaxed">
              Bu işlem geri alınamaz. Tüm kayıtlı eşyalarınız, QR kodlarınız ve mesajlaşma geçmişiniz kalıcı olarak silinecektir.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-ink">
                Onaylamak için <span className="font-mono text-rose-600 font-extrabold select-all">hesabımı sil</span> yazın:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="hesabımı sil"
                className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 bg-rose-50/50 text-xs font-mono text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-paper-hover hover:bg-paper-card border border-ink/20 text-xs font-bold text-ink"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.trim().toLowerCase() !== "hesabımı sil" || isDeletingAccount}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-40"
              >
                {isDeletingAccount ? "Siliniyor..." : "Hesabı Sil"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
