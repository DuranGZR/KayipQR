"use client";
import { useOlderMessages } from "@/lib/useOlderMessages";
import { mergeChatDetails } from "@/lib/api";
import { OlderMessages } from "@/components/ui/OlderMessages";
import { ChatImage } from "@/components/ui/ChatImage";
import { startVisiblePolling } from "@/lib/visiblePolling";
import { CHAT_WEBSOCKETS_ENABLED } from "@/lib/api";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  QrCode,
  ShieldCheck,
  Send,
  MapPin,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Loader2,
  Gift,
  Camera,
  Globe,
  Trash2,
  Maximize2,
  Info,
  X,
  ExternalLink,
  Check,
  CheckCheck,
  RotateCcw,
} from "lucide-react";
import {
  WobblyBoxFrame,
} from "@/components/ui/SketchBorders";
import {
  publicApi,
  getWebSocketChatUrl,
  getMediaUrl,
  PublicItemData,
  ConversationDetailData,
  MessageData,
} from "@/lib/api";
import { AccountSketchStyles } from "@/components/dashboard/AccountSketchStyles";
import { useToast } from "@/components/ui/ToastProvider";
import { haptic } from "@/lib/haptics";
import { decodeHtmlEntities, parseMessageMedia } from "@/lib/utils";


type Lang = "tr" | "en";

const I18N = {
  tr: {
    anonymous_session: "Gizli Oturum",
    badge_lost: "🚨 Kayıp Bildirildi",
    badge_safe: "✓ Sahibi Kayıtlı",
    owner_label: "Sahip",
    category_label: "Kategori",
    owner_note_title: "Sahibinin Notu",
    finder_prompt: "Telefon numaranız otomatik paylaşılmaz. Mesaja yazdığınız bilgiler eşya sahibine görünür.",
    quick_chips_title: "Hızlı Mesajlar:",
    chips: [
      "📍 Eşyayı buldum, güvende.",
      "🏢 Güvenlik / Danışmaya bıraktım.",
      "☕ Kafe / Mağaza çalışanına verdim.",
      "📦 İletişime geçerseniz kargolarım.",
      "🤝 Uygun yerde teslim edebilirim.",
    ],
    message_label: "Mesajınız",
    message_placeholder: "Örn: Merhaba, eşyanızı metro çıkışında buldum...",
    photo_title: "Fotoğraf",
    photo_hint: "Fotoğraf Ekle",
    photo_uploading: "Yükleniyor...",
    photo_attached: "Fotoğraf eklendi",
    location_title: "Konum",
    location_gps_btn: "GPS Ekle",
    location_gps_active: "GPS Eklendi ✓",
    location_manual_placeholder: "Veya yer notu yazın (Örn: Danışma)",
    privacy_badge: "Telefon numaranız otomatik paylaşılmaz; mesajınızda paylaştığınız bilgiler karşı tarafa görünür.",
    safety_title: "Güvenlik Tavsiyesi",
    safety_desc: "Eşyayı teslim ederken metro, AVM veya kafe gibi kalabalık kamu alanlarını tercih edin.",
    btn_submit: "Sahibine Güvenle Gönder",
    btn_submitting: "İletiliyor...",
    chat_active_badge: "Canlı Sohbet",
    chat_owner_label: "Sahip",
    chat_you_label: "Sen",
    chat_waiting: "Mesajınız sahibine iletildi. Yanıt bekleniyor...",
    chat_reply_placeholder: "Sahibine mesaj yazın...",
    chat_reply_btn: "Gönder",
    chat_footer_note: "🔒 Bu linki tekrar açtığınızda sohbete devam edebilirsiniz.",
    error_not_found: "QR Kodu Bulunamadı",
    error_not_found_desc: "Bu QR kod geçersiz veya sistemden kaldırılmış olabilir.",
    error_inactive: "QR Kodu Devre Dışı",
    error_inactive_desc: "Eşya sahibi bildirimi geçici olarak durdurdu.",
    btn_home: "Ana Sayfaya Git",
    verifying: "KayıpQR Bilgileri Doğrulanıyor...",
    view_map: "Haritada Gör",
  },
  en: {
    anonymous_session: "Private Session",
    badge_lost: "🚨 Reported Lost",
    badge_safe: "✓ Registered Item",
    owner_label: "Owner",
    category_label: "Category",
    owner_note_title: "Owner's Note",
    finder_prompt: "Your phone number is not shared automatically. Information you write in your message is visible to the owner.",
    quick_chips_title: "Quick messages:",
    chips: [
      "📍 Found your item, it is safe.",
      "🏢 Left with Security / Info desk.",
      "☕ Left with cafe / store staff.",
      "📦 Can ship/mail to you if needed.",
      "🤝 Can meet in public for return.",
    ],
    message_label: "Your Message",
    message_placeholder: "E.g.: Hi, I found your item at the station...",
    photo_title: "Photo",
    photo_hint: "Add Photo",
    photo_uploading: "Uploading...",
    photo_attached: "Photo added",
    location_title: "Location",
    location_gps_btn: "Add GPS",
    location_gps_active: "GPS Added ✓",
    location_manual_placeholder: "Or write location note (e.g. Info desk)",
    privacy_badge: "Your phone number is not shared automatically; information you share in your message is visible to the owner.",
    safety_title: "Safety Tip",
    safety_desc: "Prefer crowded public spaces (malls, cafes, stations) for handover. Never share private home addresses.",
    btn_submit: "Send Safely to Owner",
    btn_submitting: "Sending...",
    chat_active_badge: "Live Chat",
    chat_owner_label: "Owner",
    chat_you_label: "You",
    chat_waiting: "Message delivered. Waiting for owner's reply...",
    chat_reply_placeholder: "Write a message...",
    chat_reply_btn: "Send",
    chat_footer_note: "🔒 Revisit this link anytime to resume this conversation.",
    error_not_found: "QR Code Not Found",
    error_not_found_desc: "This QR code may be invalid or removed.",
    error_inactive: "QR Code Disabled",
    error_inactive_desc: "The owner has temporarily disabled this QR.",
    btn_home: "Go to Home",
    verifying: "Verifying KayıpQR Code...",
    view_map: "View on Map",
  },
};

export default function PublicFinderPage() {
  const params = useParams();
  const toast = useToast();
  const itemCode = typeof params?.code === "string" ? params.code.trim() : "";

  const [lang, setLang] = useState<Lang>("tr");
  const t = I18N[lang];

  const [item, setItem] = useState<PublicItemData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // First contact form states
  const [message, setMessage] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>("");
  const [showLocationInput, setShowLocationInput] = useState(false);

  // Photo upload states
  const [attachedPhotoUrl, setAttachedPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);

  // Live Chat state for finder
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationDetailData | null>(null);
  const latestChat = useRef(conversation);
  const latestSession = useRef<string | null>(null);
  useEffect(() => { latestChat.current = conversation; }, [conversation]);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [ownerIsTyping, setOwnerIsTyping] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const older = useOlderMessages(conversation, setConversation, cursor => publicApi.getOlderFinderMessages(sessionToken!, cursor));
  const atBottom = useRef(true);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect language
  useEffect(() => {
    const saved = localStorage.getItem("kq_lang") as Lang;
    if (saved && (saved === "tr" || saved === "en")) {
      setLang(saved);
    } else if (typeof navigator !== "undefined" && navigator.language && !navigator.language.startsWith("tr")) {
      setLang("en");
    }
  }, []);

  const handleToggleLang = () => {
    const nextLang = lang === "tr" ? "en" : "tr";
    setLang(nextLang);
    localStorage.setItem("kq_lang", nextLang);
  };

  // 1. Fetch item data and check for existing finder session
  const loadItem = async () => {
    if (!itemCode) return;
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await publicApi.getByQrCode(itemCode);
      setItem(data);

      const savedToken = typeof window !== "undefined" ? localStorage.getItem(`kq_finder_token_${itemCode}`) : null;
      if (savedToken) {
        setSessionToken(savedToken);
        loadFinderChat(savedToken);
      }
    } catch (err: any) {
      console.error("Item load error:", err);
      setErrorMessage(err.message || "Eşya bilgisi yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Load finder chat messages
  const loadFinderChat = async (token: string) => {
    try {
      const previous = latestSession.current === token ? latestChat.current : null;
      latestSession.current = token;
      const convData = await publicApi.getFinderConversation(token, previous);
      if (latestSession.current !== token) return;
      setConversation(previous => mergeChatDetails(previous, convData));
    } catch (err) {
      console.error("Finder chat load error:", err);
      if ((err as { status?: number }).status !== 404) return;
      // If session was deleted by owner, reset to fresh contact form
      localStorage.removeItem(`kq_finder_token_${itemCode}`);
      setSessionToken(null);
      setConversation(null);
    }
  };

  useEffect(() => {
    loadItem();
  }, [itemCode]);

  // WebSocket real-time connection for finder (with 25s heartbeat, error handling & auto-reconnect)
  useEffect(() => {
    if (!CHAT_WEBSOCKETS_ENABLED || !conversation?.id || !sessionToken) return;

    const wsUrl = getWebSocketChatUrl(conversation.id);
    let ws: WebSocket | null = null;
    let pingInterval: NodeJS.Timeout | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isDisposed = false;

    const connectWs = () => {
      if (isDisposed) return;
      try {
        ws = new WebSocket(wsUrl, ["kayipqr", `finder.${sessionToken}`]);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isDisposed) return;
          setIsWsConnected(true);
          ws?.send(JSON.stringify({ type: "read_ack" }));
          if (pingInterval) clearInterval(pingInterval);
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 25000);
        };

        ws.onclose = () => {
          setIsWsConnected(false);
          if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
          }
          if (!isDisposed) {
            reconnectTimeout = setTimeout(connectWs, 3000);
          }
        };

        ws.onmessage = (event) => {
          if (isDisposed) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === "pong") {
              const current = latestChat.current;
              if (current && ((data.last_message_id && !current.messages.some(message => message.id === data.last_message_id)) || (data.status && current.status !== data.status))) {
                void loadFinderChat(sessionToken);
              }
              return;
            }
            if (data.type === "error" && data.detail) {
              toast.error(String(data.detail));
              return;
            }
            if (data.type === "new_message" && data.message) {
              setOwnerIsTyping(false);
              setConversation((prev) => {
                if (!prev) return prev;
                const exists = prev.messages.some((m) => m.id === data.message.id);
                if (exists) return prev;
                return { ...prev, messages: [...prev.messages, data.message] };
              });
              if (data.message.sender_type === "owner") {
                ws?.send(JSON.stringify({ type: "read_ack" }));
              }
            } else if (data.type === "typing" && data.sender_type === "owner") {
              setOwnerIsTyping(Boolean(data.is_typing));
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              if (data.is_typing) {
                typingTimeoutRef.current = setTimeout(() => setOwnerIsTyping(false), 4000);
              }
            } else if (data.type === "read_ack" && data.reader === "owner") {
              setConversation((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  messages: prev.messages.map((m) =>
                    m.sender_type === "finder" ? { ...m, is_read: true } : m
                  ),
                };
              });
            } else if (data.type === "status_update") {
              setConversation((prev) => (prev ? { ...prev, status: data.status } : prev));
            }
          } catch (e) {
            console.error("Finder WS Parse error:", e);
          }
        };
      } catch (err) {
        console.error("Finder WS failed:", err);
      }
    };

    connectWs();

    return () => {
      isDisposed = true;
      setIsWsConnected(false);
      setOwnerIsTyping(false);
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (ws) ws.close();
    };
  }, [conversation?.id, sessionToken]);

  // Fallback Polling every 8 seconds ONLY when WebSocket is disconnected
  useEffect(() => {
    if (!sessionToken || isWsConnected) return;

    return startVisiblePolling(() => loadFinderChat(sessionToken), 15000, false);
  }, [sessionToken, isWsConnected]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (atBottom.current) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.id, conversation?.messages[conversation.messages.length - 1]?.id, ownerIsTyping]);

  const handleReplyInputChange = (val: string) => {
    setReplyText(val);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "typing", is_typing: val.trim().length > 0 })
      );
    }
  };

  const handleResetFinderSession = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`kq_finder_token_${itemCode}`);
    }
    setSessionToken(null);
    setConversation(null);
  };

  // HTML5 Geolocation Handler
  const handleGetLocation = () => {
    if (locationCoords) {
      setLocationCoords(null);
      setLocationStatus("");
      return;
    }

    if (!navigator.geolocation) {
      setLocationStatus(lang === "tr" ? "Tarayıcınız konumu desteklemiyor." : "Geolocation not supported.");
      return;
    }

    setIsGettingLocation(true);
    setLocationStatus(lang === "tr" ? "GPS alınıyor..." : "Getting GPS...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(5));
        const lng = parseFloat(pos.coords.longitude.toFixed(5));
        setLocationCoords({ lat, lng, address: `GPS: ${lat}, ${lng}` });
        setLocationStatus(`✓ GPS (${lat}, ${lng})`);
        setIsGettingLocation(false);
      },
      (err) => {
        console.warn("Geolocation error:", err);
        setLocationStatus(lang === "tr" ? "Konum izni verilmedi." : "Location permission denied.");
        setIsGettingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Photo Upload Handler for First Contact Form
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const resp = await publicApi.uploadImage(file);
      setAttachedPhotoUrl(resp.url);
      toast.success(lang === "tr" ? "Fotoğraf eklendi." : "Photo attached.");
    } catch (err: any) {
      toast.error(err.message || (lang === "tr" ? "Fotoğraf yüklenemedi." : "Failed to upload photo."));
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Photo Upload Handler for Live Chat
  const handleChatPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionToken) return;

    try {
      const resp = await publicApi.uploadImage(file);
      const photoMessage = `📷 [Fotoğraf / Photo](${resp.url})`;
      const newMsg = await publicApi.sendFinderMessage(sessionToken, photoMessage);
      setConversation((prev) => {
        if (!prev) return prev;
        if (prev.messages.some((m) => m.id === newMsg.id)) return prev;
        return { ...prev, messages: [...prev.messages, newMsg] };
      });
      toast.success(lang === "tr" ? "Fotoğraf gönderildi." : "Photo sent.");
    } catch (err: any) {
      toast.error(err.message || (lang === "tr" ? "Fotoğraf gönderilemedi." : "Failed to send photo."));
    } finally {
      if (chatFileInputRef.current) chatFileInputRef.current.value = "";
    }
  };

  // Quick message chip click
  const handleChipClick = (chipText: string) => {
    haptic.lightTap();
    setMessage((prev) => (prev ? `${prev} ${chipText}` : chipText));
  };

  // Submit initial message
  const handleFirstMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !attachedPhotoUrl && !locationCoords && !manualLocation.trim()) return;

    haptic.lightTap();
    setIsSending(true);
    try {
      let finalContent =
        message.trim() ||
        (!attachedPhotoUrl
          ? lang === "en"
            ? "📍 Location shared"
            : "📍 Konum paylaşıldı"
          : "");
      if (attachedPhotoUrl) {
        finalContent = finalContent
          ? `${finalContent}\n\n📷 [Fotoğraf / Photo](${attachedPhotoUrl})`
          : `📷 [Fotoğraf / Photo](${attachedPhotoUrl})`;
      }

      const finalAddress = locationCoords?.address || (manualLocation.trim() ? manualLocation.trim() : undefined);

      const resp = await publicApi.contactOwner(itemCode, {
        message: finalContent,
        location_lat: locationCoords?.lat,
        location_lng: locationCoords?.lng,
        location_address: finalAddress,
      });

      haptic.success();
      toast.success(lang === "tr" ? "Mesajınız sahibine iletildi!" : "Message sent to owner!");

      if (resp.finder_session_token) {
        localStorage.setItem(`kq_finder_token_${itemCode}`, resp.finder_session_token);
        setSessionToken(resp.finder_session_token);
        await loadFinderChat(resp.finder_session_token);
      }
    } catch (err: any) {
      haptic.error();
      toast.error(err.message || (lang === "tr" ? "Mesaj iletilemedi. Lütfen tekrar deneyin." : "Failed to send message. Please retry."));
    } finally {
      setIsSending(false);
    }
  };

  // Send follow-up message as finder
  const handleSendFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !sessionToken) return;

    haptic.lightTap();
    setIsSendingReply(true);
    try {
      const newMsg = await publicApi.sendFinderMessage(sessionToken, replyText.trim());
      haptic.success();
      setConversation((prev) => {
        if (!prev) return prev;
        if (prev.messages.some((m) => m.id === newMsg.id)) return prev;
        return { ...prev, messages: [...prev.messages, newMsg] };
      });
      setReplyText("");
    } catch (err: any) {
      haptic.error();
      toast.error(err.message || (lang === "tr" ? "Mesaj gönderilemedi." : "Failed to send message."));
    } finally {
      setIsSendingReply(false);
    }
  };

  // Helper to extract image URL from message content
  const extractPhotoUrl = (text: string): string | null => {
    return parseMessageMedia(text).image;
  };

  const displayItemName =
    item?.show_name_to_finder === false
      ? lang === "en"
        ? "Registered Item"
        : "Kayıtlı Eşya"
      : decodeHtmlEntities(item?.name) || (lang === "en" ? "Registered Item" : "Kayıtlı Eşya");

  const displayOwnerName = decodeHtmlEntities(item?.owner_display_name) || t.chat_owner_label;
  const decodedDesc =
    item?.show_desc_to_finder === false ? "" : decodeHtmlEntities(item?.description).trim();
  const decodedReward = decodeHtmlEntities(item?.reward_text).trim();
  const hasDistinctReward = Boolean(decodedReward && decodedReward !== decodedDesc);
  const ownerNoteText = decodedDesc || decodedReward;

  return (
    <main className={`finder-page app-shell w-full max-w-lg mx-auto flex flex-col px-4 sm:px-6 py-4 text-ink ${sessionToken ? "h-[100dvh] min-h-0" : "min-h-[100dvh]"}`}>
      
      <AccountSketchStyles />
      {/* Shared site header */}
      <header className="w-full shrink-0 flex items-center justify-between gap-2 px-1 py-1">
        <Link href="/" className="inline-flex items-center gap-1.5 group">
          <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center text-ink shadow-[0_1.5px_0px_#33302B] -rotate-2 group-hover:rotate-0 transition-transform relative">
            <WobblyBoxFrame stroke="#33302B" strokeWidth={1.3} />
            <QrCode className="w-3.5 h-3.5 relative z-10" />
          </div>
          <span className="font-bold text-base tracking-tight text-ink">
            kayıp<span className="text-gold-dark">qr</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleLang}
            className="app-button !min-h-11 !px-3 !py-2 !text-xs"
            title="Dili değiştir"
          >
            <Globe className="w-3 h-3 text-ink-soft" />
            <span>{lang === "tr" ? "EN 🇬🇧" : "TR 🇹🇷"}</span>
          </button>

          <div className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
            <Lock className="w-2.5 h-2.5 text-emerald-700" />
            <span className="hidden xs:inline">{t.anonymous_session}</span>
          </div>
        </div>
      </header>

      {/* Center Dynamic Area (Fits precisely in 100dvh) */}
      <div className={`w-full flex flex-col relative mt-5 mb-4 ${sessionToken ? "flex-1 min-h-0" : ""}`}>
        
        {/* Loading State */}
        {isLoading ? (
          <div className="app-card text-center space-y-4 !py-10">
            <Loader2 className="w-7 h-7 mx-auto text-gold-dark animate-spin" />
            <h3 className="font-bold text-xs sm:text-sm text-ink">{t.verifying}</h3>
            <p className="text-[11px] text-ink-soft font-mono">#{itemCode}</p>
          </div>
        ) : errorMessage ? (
          <div className="app-card text-center space-y-4 !py-10">
            <div className="w-10 h-10 mx-auto rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-ink">{t.error_not_found}</h3>
              <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                {errorMessage || t.error_not_found_desc}
              </p>
            </div>
            <Link
              href="/"
              className="app-button app-button-primary"
            >
              {t.btn_home}
            </Link>
          </div>
        ) : !item?.is_active ? (
          <div className="app-card text-center space-y-4 !py-10">
            <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-ink">{t.error_inactive}</h3>
              <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                {t.error_inactive_desc}
              </p>
            </div>
          </div>
        ) : sessionToken ? (
          /* ================= 100DVH LIVE CHAT APP VIEW ================= */
          <div className="app-card h-full min-h-0 !p-0 flex flex-col">
            
            {/* Chat Header */}
            <div className="shrink-0 px-4 py-4 border-b border-ink/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {item.image_url ? (
                  <img
                    src={getMediaUrl(item.image_url)}
                    alt={displayItemName}
                    onClick={() => setPreviewImageModal(getMediaUrl(item.image_url!))}
                    className="w-8 h-8 rounded-xl object-cover border border-ink shrink-0 cursor-pointer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-gold border border-ink flex items-center justify-center text-xs font-black text-ink shrink-0">
                    {displayItemName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="leading-tight min-w-0">
                  <h1 className="text-xs sm:text-sm font-extrabold text-ink truncate">
                    {displayItemName}
                  </h1>
                  <p className="text-[10px] text-ink-soft truncate">
                    {ownerIsTyping ? (
                      <span className="text-emerald-700 font-extrabold animate-pulse">
                        ✍️ {t.chat_owner_label} yazıyor...
                      </span>
                    ) : (
                      <>
                        {t.owner_label}: <strong className="text-ink">{displayOwnerName}</strong>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  {t.chat_active_badge}
                </span>
                <button
                  type="button"
                  onClick={handleResetFinderSession}
                  className="p-1.5 rounded-lg bg-paper-hover border border-ink/15 text-ink-soft hover:text-ink text-[10px] font-bold"
                  title="Yeni konuşma başlat"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Resolved Celebration Banner */}
            {conversation?.status === "resolved" && (
              <div className="shrink-0 px-3.5 py-2 bg-emerald-100 border-b border-emerald-300 text-[11px] font-bold text-emerald-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  🎉 Eşya sahibi eşyayı teslim aldığını onayladı. Duyarlılığınız için teşekkür ederiz!
                </span>
              </div>
            )}

            {/* Closed / Blocked Warning Banner */}
            {(conversation?.status === "closed" || conversation?.status === "blocked") && (
              <div className="shrink-0 px-3.5 py-2 bg-rose-100 border-b border-rose-300 text-[11px] font-bold text-rose-950 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>
                    {conversation?.status === "blocked"
                      ? "Bu oturum eşya sahibi tarafından sınırlandırılmıştır."
                      : "Bu konuşma oturumu eşya sahibi tarafından kapatılmıştır."}
                  </span>
                </div>
                {conversation?.status === "closed" && (
                  <button
                    type="button"
                    onClick={handleResetFinderSession}
                    className="px-2 py-0.5 rounded-md bg-white border border-rose-400 text-[10px] font-extrabold text-rose-900 hover:bg-rose-50 shrink-0 cursor-pointer"
                  >
                    Yeni Oturum
                  </button>
                )}
              </div>
            )}

            {/* Scrollable Messages Area */}
            <div ref={older.container} onScroll={() => { const element = older.container.current; if (element) atBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120; older.onScroll(); }} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3">
              <OlderMessages hasMore={!!conversation?.next_cursor} english={lang === "en"} {...older} />
              {conversation?.messages && conversation.messages.length > 0 ? (
                conversation.messages.map((msg) => {
                  const isFinder = msg.sender_type === "finder";
                  const decodedContent = decodeHtmlEntities(msg.content);
                  const photoUrl = extractPhotoUrl(decodedContent);
                  const cleanText = parseMessageMedia(decodedContent).text
                    .replace(
                      "📍 Location shared",
                      lang === "en" ? "📍 Location shared" : "📍 Konum paylaşıldı"
                    )
                    .trim();

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-1.5 ${isFinder ? "justify-end" : "justify-start"}`}
                    >
                      {!isFinder && (
                        <div className="w-6 h-6 rounded-full bg-ink text-white font-bold text-[9px] flex items-center justify-center shrink-0 shadow-2xs">
                          {t.chat_owner_label.charAt(0)}
                        </div>
                      )}

                      <div
                        className={`max-w-[82%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-2xs border ${
                          isFinder
                            ? "bg-gold text-ink border-ink/25 rounded-br-xs font-medium"
                            : "bg-white text-ink border-ink/15 rounded-bl-xs"
                        }`}
                      >
                        {cleanText && <p className="whitespace-pre-wrap">{cleanText}</p>}

                        {/* Photo in chat */}
                        {photoUrl && (
                          <div
                            className="mt-1.5 rounded-lg overflow-hidden border border-ink/20 relative group cursor-pointer"
                            onClick={() => setPreviewImageModal(getMediaUrl(photoUrl))}
                          >
                            <ChatImage refresh={async () => { const refreshed = await publicApi.getFinderMessage(sessionToken!, msg.id); setConversation(previous => previous?.id === refreshed.conversation_id ? { ...previous, messages: previous.messages.map(entry => entry.id === refreshed.id ? refreshed : entry) } : previous); }}
                              src={getMediaUrl(photoUrl)}
                              alt="Shared"
                              className="w-full max-h-36 object-cover rounded-lg"
                            />
                            <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-white font-bold flex items-center gap-0.5">
                              <Maximize2 className="w-2.5 h-2.5" /> Büyüt
                            </div>
                          </div>
                        )}

                        {/* Location pin */}
                        {msg.location_lat && msg.location_lng && (
                          <a
                            href={`https://maps.google.com/?q=${msg.location_lat},${msg.location_lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1.5 pt-1 border-t border-ink/10 text-[10px] font-bold text-emerald-900 flex items-center gap-1 hover:underline"
                          >
                            <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                            <span>{t.view_map}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        )}

                        {msg.location_address && !msg.location_lat && (
                          <div className="mt-1 pt-0.5 border-t border-ink/10 text-[10px] font-medium text-ink-soft flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-ink-soft shrink-0" />
                            <span>{decodeHtmlEntities(msg.location_address)}</span>
                          </div>
                        )}

                        <div className="mt-0.5 flex items-center justify-end gap-1 text-[8.5px] opacity-65">
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isFinder && (
                            <span title={msg.is_read ? "Okundu" : "İletildi"}>
                              {msg.is_read ? (
                                <CheckCheck className="w-3 h-3 text-emerald-800" />
                              ) : (
                                <Check className="w-2.5 h-2.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-ink-soft">
                  {t.chat_waiting}
                </div>
              )}

              {ownerIsTyping && (
                <div className="flex items-center gap-1.5 text-xs text-ink-soft pl-1">
                  <div className="px-2.5 py-1 rounded-2xl bg-white border border-ink/15 text-[10.5px] font-bold text-ink-soft inline-flex items-center gap-1 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-dark animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-dark animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-dark animate-bounce [animation-delay:300ms]" />
                    <span className="ml-1">{t.chat_owner_label} yazıyor...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Sticky Bottom Input */}
            <div className="shrink-0 p-3 border-t border-ink/10">
              <form onSubmit={handleSendFollowUp} className="flex items-center gap-1.5">
                <input
                  type="file"
                  ref={chatFileInputRef}
                  onChange={handleChatPhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={conversation?.status === "closed" || conversation?.status === "blocked"}
                  onClick={() => chatFileInputRef.current?.click()}
                  className="app-button !min-h-11 !p-3 shrink-0"
                  title={t.photo_title}
                >
                  <Camera className="w-4 h-4 text-ink" />
                </button>

                <input
                  type="text"
                  disabled={conversation?.status === "closed" || conversation?.status === "blocked"}
                  value={replyText}
                  onChange={(e) => handleReplyInputChange(e.target.value)}
                  placeholder={
                    conversation?.status === "closed" || conversation?.status === "blocked"
                      ? "Bu konuşma oturumu sona erdirildi"
                      : t.chat_reply_placeholder
                  }
                  aria-label={t.chat_reply_placeholder}
                  className="app-input flex-1 min-w-0 !min-h-11 !py-2 disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={
                    isSendingReply ||
                    !replyText.trim() ||
                    conversation?.status === "closed" ||
                    conversation?.status === "blocked"
                  }
                  aria-label={t.chat_reply_btn}
                  className="app-button app-button-primary !min-h-11 !p-3 shrink-0"
                >
                  {isSendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>

          </div>
        ) : (
          /* ================= 100DVH INITIAL FINDER CONTACT FORM ================= */
          <div className="app-card !p-5 sm:!p-6">

            <form onSubmit={handleFirstMessageSubmit} className="flex flex-col gap-5 relative z-10">
              
              {/* Item Summary Bar (Top) */}
              <div className="shrink-0 pb-4 border-b border-ink/10">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                      item.status === "lost"
                        ? "bg-amber-100 text-amber-950 border-amber-300 animate-pulse"
                        : "bg-gold/40 text-amber-900 border-ink/20"
                    }`}
                  >
                    {item.status === "lost" ? t.badge_lost : t.badge_safe}
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowSafetyModal(true)}
                    className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-900 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-700" />
                    <span>Güvenli İletişim</span>
                  </button>
                </div>

                <div className="flex flex-col items-start gap-2 mt-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.image_url && (
                      <img
                        src={getMediaUrl(item.image_url)}
                        alt={displayItemName}
                        onClick={() => setPreviewImageModal(getMediaUrl(item.image_url!))}
                        className="w-9 h-9 rounded-xl object-cover border border-ink/25 shrink-0 cursor-pointer shadow-2xs"
                      />
                    )}
                    <h1 className="text-2xl font-extrabold text-ink tracking-tight break-words min-w-0">
                      {displayItemName}
                    </h1>
                  </div>
                  <span className="text-sm text-ink-soft break-words">
                    {t.owner_label}: <strong className="text-ink">{displayOwnerName}</strong>
                  </span>
                </div>

                {ownerNoteText && (
                  <div className="mt-4 p-3 rounded-lg bg-[#F5EFE0] text-sm leading-relaxed text-ink flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-gold-dark shrink-0 mt-0.5" />
                    <span className="whitespace-pre-wrap break-words">
                      <strong>{t.owner_note_title}:</strong> {ownerNoteText}
                    </span>
                  </div>
                )}

                {hasDistinctReward && decodedDesc && (
                  <div className="mt-1 px-2.5 py-1 rounded-lg bg-amber-100/80 border border-amber-300 text-[10.5px] font-bold text-amber-950 flex items-center gap-1.5">
                    <Gift className="w-3 h-3 text-amber-700 shrink-0" />
                    <span className="truncate">{decodedReward}</span>
                  </div>
                )}
              </div>

              {/* Scrollable Quick Suggestion Chips */}
              <div className="shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {t.chips.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleChipClick(chip)}
                      className="app-chip shrink-0 !text-xs !px-3"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Center Main Text Area */}
              <div className="flex flex-col gap-2">
                <label htmlFor="finder-message" className="text-sm font-bold">{t.message_label}</label>
                <textarea
                  id="finder-message"
                  required={!attachedPhotoUrl && !locationCoords && !manualLocation.trim()}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t.message_placeholder}
                  className="app-input min-h-[144px] resize-y leading-relaxed"
                />
              </div>

              {/* Multi-action attachment bar (Camera + GPS/Location) */}
              <div className="shrink-0 space-y-3">
                <div className="flex items-center gap-1.5">
                  
                  {/* Photo Action */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {!attachedPhotoUrl ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="app-button flex-1 !text-xs !px-2"
                    >
                      {isUploadingPhoto ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-dark" />
                          <span>{t.photo_uploading}</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-3.5 h-3.5 text-ink-soft" />
                          <span>{t.photo_title}</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center justify-between px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-[10.5px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <img
                          src={getMediaUrl(attachedPhotoUrl)}
                          alt="Thumb"
                          className="w-5 h-5 object-cover rounded border border-ink/20"
                        />
                        <span className="font-bold text-emerald-900 truncate">{t.photo_attached}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachedPhotoUrl(null)}
                        className="text-rose-600 hover:text-rose-800 p-0.5 ml-1"
                        title="Kaldır"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* GPS / Location Action */}
                  <button
                    type="button"
                    onClick={() => {
                      haptic.lightTap();
                      handleGetLocation();
                    }}
                    disabled={isGettingLocation}
                    className={`app-button flex-1 !text-xs !px-2 ${
                      locationCoords
                        ? "[--sketch-surface:#e3edea] text-emerald-900"
                        : "bg-white hover:bg-paper-hover text-ink border-ink/20"
                    }`}
                    title="Onay verirseniz GPS konumunuz eşya sahibiyle paylaşılır"
                  >
                    <MapPin className={`w-3.5 h-3.5 ${locationCoords ? "text-emerald-700" : "text-ink-soft"}`} />
                    <span>
                      {isGettingLocation
                        ? "..."
                        : locationCoords
                        ? t.location_gps_active
                        : t.location_gps_btn}
                    </span>
                  </button>

                  {/* Toggle Manual Location Note */}
                  <button
                    type="button"
                    onClick={() => {
                      haptic.lightTap();
                      setShowLocationInput(!showLocationInput);
                    }}
                    className={`app-button !px-3 text-ink ${
                      showLocationInput || manualLocation.trim()
                        ? "[--sketch-surface:#F2B63C]"
                        : "bg-white hover:bg-paper-hover border-ink/20"
                    }`}
                    title="Yazılı yer notu ekle"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Micro GPS Privacy Reassurance */}
                {isGettingLocation && (
                  <p className="text-[10px] text-emerald-900 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 flex items-center gap-1 animate-pulse">
                    <Lock className="w-2.5 h-2.5 text-emerald-700" />
                    <span>İzin verirseniz GPS konumunuz eşya sahibiyle paylaşılır.</span>
                  </p>
                )}

                {/* Optional Manual Location Field */}
                {showLocationInput && (
                  <input
                    type="text"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    placeholder={t.location_manual_placeholder}
                    aria-label={t.location_manual_placeholder}
                    className="app-input"
                  />
                )}
              </div>

              {/* Submit Button & Reassurance */}
              <div className="shrink-0 pt-1 space-y-3">
                <button
                  type="submit"
                  disabled={isSending}
                  className="app-button app-button-primary w-full"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                  ) : (
                    <Send className="w-3.5 h-3.5 relative z-10" />
                  )}
                  <span className="relative z-10">
                    {isSending ? t.btn_submitting : t.btn_submit}
                  </span>
                </button>

                <p className="text-xs text-center text-ink-soft flex items-center justify-center gap-1.5 leading-relaxed">
                  <Lock className="w-2.5 h-2.5" />
                  <span>{t.privacy_badge}</span>
                </p>
              </div>

            </form>
          </div>
        )}

      </div>

      {/* Safety Info Modal */}
      {showSafetyModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3 backdrop-blur-xs"
          onClick={() => setShowSafetyModal(false)}
        >
          <div
            className="app-card w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-ink/10">
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>{t.safety_title}</span>
              </div>
              <button
                onClick={() => setShowSafetyModal(false)}
                className="p-1 rounded-lg hover:bg-paper-hover text-ink-soft"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">
              {t.safety_desc}
            </p>
            <div className="p-2 rounded-lg bg-emerald-50 text-[10.5px] font-semibold text-emerald-950 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>{t.finder_prompt}</span>
            </div>
            <button
              onClick={() => setShowSafetyModal(false)}
              className="app-button app-button-primary w-full"
            >
              Anladım
            </button>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="relative max-w-md max-h-[85vh] p-2 bg-white rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center shadow-lg hover:bg-ink-soft transition-colors z-20"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewImageModal}
              alt="Full size preview"
              className="max-h-[75vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Ultra Compact Footer */}
      <footer className="w-full shrink-0 text-center text-xs text-ink-soft py-2 mt-auto">
        © {new Date().getFullYear()} KayıpQR · Anonim Güvenli İletişim
      </footer>
    </main>
  );
}
