"use client";

import React, { useState, useEffect, useRef, Suspense, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  MessageCircle,
  Send,
  MapPin,
  Lock,
  Search,
  Check,
  CheckCheck,
  Loader2,
  Camera,
  Maximize2,
  X,
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  Trash2,
  RotateCcw,
  Navigation,
  Info,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { AccountSketchStyles } from "@/components/dashboard/AccountSketchStyles";
import { Sidebar } from "./Sidebar";
import { useToast } from "@/components/ui/ToastProvider";
import { MessageListSkeleton } from "@/components/ui/Skeleton";
import { haptic } from "@/lib/haptics";
import {
  chatApi,
  publicApi,
  getMediaUrl,
  getWebSocketChatUrl,
  getAuthToken,
  clearAuthTokens,
  ConversationData,
  ConversationDetailData,
} from "@/lib/api";
import { decodeHtmlEntities } from "@/lib/utils";

function formatSmartTime(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 45) return "Az önce";
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlConvId = searchParams.get("id");
  const toast = useToast();

  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(urlConvId);
  const [activeConvDetails, setActiveConvDetails] = useState<ConversationDetailData | null>(null);
  const latestChat = useRef(activeConvDetails);
  useEffect(() => { latestChat.current = activeConvDetails; }, [activeConvDetails]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  // Location sharing in owner reply
  const [ownerLocationNote, setOwnerLocationNote] = useState("");
  const [showLocationBar, setShowLocationBar] = useState(false);
  const [ownerGpsCoords, setOwnerGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingGps, setIsGettingGps] = useState(false);

  // Real-time WebSocket & Typing states
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [finderIsTyping, setFinderIsTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mobile state: toggle between list view and chat view
  const [mobileView, setMobileView] = useState<"list" | "chat">(urlConvId ? "chat" : "list");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const ownerFileInputRef = useRef<HTMLInputElement | null>(null);

  const extractPhotoUrl = (text: string): string | null => {
    const match = text.match(/\[(?:Fotoğraf|Photo)\]\(([^)]+)\)/i);
    if (match && match[1]) return match[1];
    if (
      text.startsWith("/uploads/") ||
      (text.startsWith("http") && text.match(/\.(jpeg|jpg|png|webp)/i))
    ) {
      return text;
    }
    return null;
  };

  // Sync deep-linked ?id= param
  useEffect(() => {
    if (urlConvId) {
      setActiveConvId(urlConvId);
      setMobileView("chat");
    }
  }, [urlConvId]);

  // Load conversations list
  const loadConversations = useCallback(
    async (silent = false) => {
      try {
        const token = getAuthToken();
        if (!token) {
          router.push("/login");
          return;
        }

        const list = await chatApi.list("all");
        setConversations(list);

        // Auto-select first conversation on desktop if none selected
        if (
          list.length > 0 &&
          !activeConvId &&
          !urlConvId &&
          typeof window !== "undefined" &&
          window.innerWidth >= 768
        ) {
          setActiveConvId(list[0].id);
        }
      } catch (err: any) {
        if (!silent) console.error("Failed to load conversations:", err);
        if (
          err.message?.includes("Oturum") ||
          err.message?.includes("token") ||
          err.message?.includes("401")
        ) {
          clearAuthTokens();
          router.push("/login");
        }
      } finally {
        if (!silent) setIsLoadingList(false);
      }
    },
    [activeConvId, urlConvId, router]
  );

  useEffect(() => {
    loadConversations(false);
    const interval = setInterval(() => loadConversations(true), 6000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Load conversation details when active conversation changes
  const fetchActiveDetails = useCallback(async (convId: string, showSpinner = true) => {
    if (showSpinner) setIsLoadingDetails(true);
    try {
      const details = await chatApi.getDetails(convId);
      setActiveConvDetails(details);
      // Clear unread badge locally in list
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
      );
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    } catch (err) {
      console.error("Failed to load conversation details:", err);
    } finally {
      if (showSpinner) setIsLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (!activeConvId) {
      setActiveConvDetails(null);
      return;
    }
    fetchActiveDetails(activeConvId, true);
  }, [activeConvId, fetchActiveDetails]);

  // Connect Owner WebSocket for Real-Time Messages, Typing Indicator, Read Receipts, Heartbeat & Auto-Reconnect
  useEffect(() => {
    if (!activeConvId || typeof window === "undefined") return;
    const token = getAuthToken();
    if (!token) return;

    const wsUrl = getWebSocketChatUrl(activeConvId);
    let ws: WebSocket | null = null;
    let pingInterval: NodeJS.Timeout | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isDisposed = false;

    const connectWs = () => {
      if (isDisposed) return;
      try {
        ws = new WebSocket(wsUrl, ["kayipqr", `auth.${token}`]);
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
                void fetchActiveDetails(activeConvId, false);
              }
              return;
            }
            if (data.type === "error" && data.detail) {
              toast.error(String(data.detail));
              return;
            }
            if (data.type === "new_message" && data.message) {
              setFinderIsTyping(false);
              setActiveConvDetails((prev) => {
                if (!prev) return prev;
                const exists = prev.messages.some((m) => m.id === data.message.id);
                if (exists) return prev;
                return { ...prev, messages: [...prev.messages, data.message] };
              });
              // If incoming message is from finder while owner has chat open, mark read immediately
              if (data.message.sender_type === "finder") {
                ws?.send(JSON.stringify({ type: "read_ack" }));
              }
              loadConversations(true);
              setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 80);
            } else if (data.type === "typing" && data.sender_type === "finder") {
              setFinderIsTyping(Boolean(data.is_typing));
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              if (data.is_typing) {
                typingTimeoutRef.current = setTimeout(() => setFinderIsTyping(false), 4000);
              }
            } else if (data.type === "read_ack" && data.reader === "finder") {
              setActiveConvDetails((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  messages: prev.messages.map((m) =>
                    m.sender_type === "owner" ? { ...m, is_read: true } : m
                  ),
                };
              });
            } else if (data.type === "status_update" && data.status) {
              setActiveConvDetails((prev) => (prev ? { ...prev, status: data.status } : prev));
              loadConversations(true);
            }
          } catch (err) {
            console.error("Owner WS parse error:", err);
          }
        };
      } catch (err) {
        console.error("Owner WS connection error:", err);
      }
    };

    connectWs();

    return () => {
      isDisposed = true;
      setIsWsConnected(false);
      setFinderIsTyping(false);
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (ws) ws.close();
    };
  }, [activeConvId, loadConversations]);

  // Fallback periodic refresh for active conversation in case WS drops
  useEffect(() => {
    if (!activeConvId) return;
    const timer = setInterval(() => {
      if (!isWsConnected) {
        fetchActiveDetails(activeConvId, false);
      }
    }, 7000);
    return () => clearInterval(timer);
  }, [activeConvId, isWsConnected, fetchActiveDetails]);

  const handleSelectConv = (id: string) => {
    haptic.lightTap();
    setActiveConvId(id);
    setMobileView("chat");
  };

  // Emit typing event when owner types
  const handleReplyTextChange = (val: string) => {
    setReplyText(val);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "typing", is_typing: val.trim().length > 0 })
      );
    }
  };

  const handleOwnerPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;

    try {
      const resp = await publicApi.uploadImage(file);
      const photoMessage = `📷 [Fotoğraf / Photo](${resp.url})`;
      const newMsg = await chatApi.sendMessage(activeConvId, photoMessage);
      setActiveConvDetails((prev) => {
        if (!prev) return prev;
        if (prev.messages.some((m) => m.id === newMsg.id)) return prev;
        return { ...prev, messages: [...prev.messages, newMsg] };
      });
      loadConversations(true);
      toast.success("Fotoğraf gönderildi.");
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    } catch (err: any) {
      toast.error(err.message || "Fotoğraf gönderilemedi.");
    } finally {
      if (ownerFileInputRef.current) ownerFileInputRef.current.value = "";
    }
  };

  const handleGetOwnerGps = () => {
    if (ownerGpsCoords) {
      setOwnerGpsCoords(null);
      return;
    }
    if (!navigator.geolocation) {
      toast.error("Tarayıcınız konum paylaşımını desteklemiyor.");
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOwnerGpsCoords({
          lat: parseFloat(pos.coords.latitude.toFixed(5)),
          lng: parseFloat(pos.coords.longitude.toFixed(5)),
        });
        setShowLocationBar(true);
        setIsGettingGps(false);
        toast.success("GPS buluşma konumu eklendi.");
      },
      () => {
        setIsGettingGps(false);
        setShowLocationBar(true);
        toast.info("GPS izni alınamadı, buluşma yerini metin olarak yazabilirsiniz.");
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || (!replyText.trim() && !ownerGpsCoords && !ownerLocationNote.trim()) || isSending)
      return;

    const text =
      replyText.trim() ||
      (ownerLocationNote.trim()
        ? `📍 Buluşma / Teslim Noktası: ${ownerLocationNote.trim()}`
        : "📍 Buluşma konumumu paylaştım.");

    setIsSending(true);

    try {
      const newMsg = await chatApi.sendMessage(activeConvId, text, {
        lat: ownerGpsCoords?.lat,
        lng: ownerGpsCoords?.lng,
        address: ownerLocationNote.trim() || undefined,
      });
      setReplyText("");
      setOwnerGpsCoords(null);
      setOwnerLocationNote("");
      setShowLocationBar(false);

      setActiveConvDetails((prev) => {
        if (!prev) return prev;
        if (prev.messages.some((m) => m.id === newMsg.id)) return prev;
        return { ...prev, messages: [...prev.messages, newMsg] };
      });
      loadConversations(true);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    } catch (err: any) {
      toast.error(err.message || "Mesaj gönderilemedi.");
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: "active" | "resolved" | "closed") => {
    if (!activeConvId) return;
    try {
      await chatApi.updateStatus(activeConvId, newStatus);
      setActiveConvDetails((prev) => (prev ? { ...prev, status: newStatus } : prev));
      loadConversations(true);
      toast.success(
        newStatus === "resolved"
          ? "🎉 Eşya teslim alındı ve konuşma çözüldü olarak işaretlendi!"
          : newStatus === "active"
          ? "Konuşma yeniden aktif edildi."
          : "Konuşma kapatıldı."
      );
    } catch (err: any) {
      toast.error(err.message || "Durum güncellenemedi.");
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    if (!window.confirm("Bu konuşmayı ve mesaj geçmişini silmek istediğinize emin misiniz?")) {
      return;
    }
    try {
      await chatApi.delete(convId);
      toast.success("Konuşma silindi.");
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);
      if (activeConvId === convId) {
        setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
        setMobileView("list");
      }
    } catch (err: any) {
      toast.error(err.message || "Konuşma silinemedi.");
    }
  };

  // Counts per tab
  const totalCount = conversations.length;
  const activeCount = conversations.filter((c) => c.status === "active").length;
  const resolvedCount = conversations.filter((c) => c.status === "resolved").length;
  const unreadTotal = conversations.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);

  const filteredConversations = conversations.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = c.item?.name.toLowerCase().includes(q);
    const aliasMatch = c.finder_alias?.toLowerCase().includes(q);
    const msgMatch = c.last_message?.content.toLowerCase().includes(q);
    return nameMatch || aliasMatch || msgMatch;
  });


  return (
    <div className="app-shell min-h-screen dot-grid-pattern text-ink flex flex-col md:flex-row selection:bg-gold selection:text-ink pb-16 md:pb-0">
      <AccountSketchStyles />
      {/* Shared account navigation */}
      <Sidebar unreadCount={unreadTotal} />

      {/* Main Messages Container */}
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex-1 min-w-0 p-3 sm:p-5 lg:p-8 flex flex-col justify-start md:h-screen md:overflow-hidden"
      >
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-ink tracking-tight">
                Mesajların
              </h1>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                <Lock className="w-3 h-3 text-emerald-700" />
                <span>Telefon numaran paylaşılmaz</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
              Eşyalarını bulan kişilerle buradan iletişim kur, teslim için birlikte anlaş.
            </p>
          </div>


        </div>

        {/* Two sketch panels share the site frame geometry. */}
        <div className="flex-1 flex flex-col md:flex-row gap-5 min-h-[calc(100dvh-9.5rem)] md:min-h-0">
          {/* ================= LEFT COLUMN: CONVERSATION LIST ================= */}
          <div
            className={`app-card !p-2 w-full md:w-[300px] lg:w-[340px] flex flex-col min-h-0 shrink-0 ${
              mobileView === "chat" ? "hidden md:flex" : "flex"
            }`}
          >
            {/* List Top Controls */}
            <div className="px-5 pt-7 pb-4 border-b border-ink/10 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold text-sm text-ink flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center border border-ink shadow-[0_1.5px_0px_#33302B]">
                    <MessageCircle className="w-3.5 h-3.5 text-ink" />
                  </div>
                  <span>Gelen Kutusu</span>
                </h2>

                <div className="flex items-center gap-1.5">
                  {unreadTotal > 0 && (
                    <span className="text-[10.5px] font-extrabold bg-rose-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                      {unreadTotal} Yeni
                    </span>
                  )}
                  <span className="text-[11px] font-extrabold bg-[#EFE9DC] px-2.5 py-0.5 rounded-full border border-ink/20 text-ink">
                    {totalCount} Konuşma
                  </span>
                </div>
              </div>

              {/* Status Filter Tabs with Counts */}
              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`app-chip !min-h-10 !px-1 !py-2 transition-all ${
                    statusFilter === "all"
                      ? "[--sketch-surface:#F2B63C] text-ink"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Tümü ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  className={`app-chip !min-h-10 !px-1 !py-2 transition-all ${
                    statusFilter === "active"
                      ? "[--sketch-surface:#1E7E75] text-white"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Aktif ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("resolved")}
                  className={`app-chip !min-h-10 !px-1 !py-2 transition-all ${
                    statusFilter === "resolved"
                      ? "[--sketch-surface:#33302B] text-paper"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  Çözüldü ({resolvedCount})
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Eşya adı, bulan kişi veya mesaj ara..."
                  aria-label="Konuşmalarda ara"
                  className="app-input !pl-9 !pr-8 !text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Conversation List Items */}
            <div className="divide-y divide-ink/10 overflow-y-auto flex-1 min-h-0">
              {isLoadingList ? (
                <MessageListSkeleton />
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => {
                  const isSelected = activeConvId === conv.id;
                  const isUnread = (conv.unread_count || 0) > 0;
                  const isResolved = conv.status === "resolved";
                  const isClosed = conv.status === "closed" || conv.status === "blocked";
                  const rawPreview = decodeHtmlEntities(
                    conv.last_message?.content || "Yeni konuşma başlatıldı"
                  );
                  const hasPhoto = extractPhotoUrl(rawPreview) !== null;
                  const cleanPreview = rawPreview
                    .replace(/📷\s*\[(?:Fotoğraf|Photo)\]\([^)]+\)/gi, "📷 Fotoğraf gönderildi")
                    .replace("📍 Location shared", "📍 Konum paylaşıldı")
                    .trim();

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => handleSelectConv(conv.id)}
                      className={`w-full text-left p-3.5 transition-all flex items-start gap-3 cursor-pointer relative ${
                        isSelected
                          ? "bg-white border-l-4 border-l-gold shadow-xs"
                          : isUnread
                          ? "bg-[#FFFDF7] hover:bg-white"
                          : "hover:bg-paper-card/80"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 font-black text-xs shadow-2xs relative ${
                          isSelected
                            ? "bg-gold text-ink border-ink"
                            : isResolved
                            ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                            : "bg-white text-ink border-ink/20"
                        }`}
                      >
                        <QrCode className="w-4 h-4" />
                        {isUnread && (
                          <span className="w-3 h-3 rounded-full bg-rose-600 absolute -top-1 -right-1 ring-2 ring-white animate-pulse" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <h4 className="font-extrabold text-xs sm:text-[13px] text-ink truncate">
                            {decodeHtmlEntities(conv.item?.name) || "Kayıp Eşya"}
                          </h4>
                          <span className="text-[10px] font-semibold text-ink-soft shrink-0">
                            {formatSmartTime(conv.last_message?.created_at || conv.updated_at)}
                          </span>
                        </div>

                        <p
                          className={`text-xs truncate mt-0.5 ${
                            isUnread ? "font-extrabold text-ink" : "text-ink-soft"
                          }`}
                        >
                          {conv.last_message?.sender_type === "owner" ? "Siz: " : ""}
                          {cleanPreview || (hasPhoto ? "📷 Fotoğraf" : "Yeni mesaj")}
                        </p>

                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px]">
                          <span className="inline-flex items-center gap-1 font-bold text-ink-soft bg-black/5 px-2 py-0.5 rounded-md truncate">
                            <span>👤 {decodeHtmlEntities(conv.finder_alias) || "Bulan Kişi"}</span>
                          </span>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {conv.last_message?.location_lat && (
                              <span
                                className="inline-flex items-center gap-0.5 text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-bold"
                                title="GPS Konumu Paylaşıldı"
                              >
                                <MapPin className="w-2.5 h-2.5" /> GPS
                              </span>
                            )}
                            {isResolved ? (
                              <span className="text-emerald-900 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded font-extrabold">
                                ✓ Teslim Alındı
                              </span>
                            ) : isClosed ? (
                              <span className="text-ink-soft bg-black/5 px-1.5 py-0.5 rounded font-bold">
                                Kapalı
                              </span>
                            ) : (
                              <span className="text-amber-950 bg-gold/40 px-1.5 py-0.5 rounded font-extrabold">
                                ● Aktif
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                /* Rich Left Sidebar Empty State */
                <div className="p-6 text-center space-y-3 my-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-ink/20 shadow-2xs flex items-center justify-center mx-auto text-gold-dark">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-ink">
                      {searchQuery
                        ? "Aramaya Uygun Mesaj Yok"
                        : statusFilter !== "all"
                        ? "Bu Filtrede Konuşma Yok"
                        : "Henüz Gelen Mesajınız Yok"}
                    </h4>
                    <p className="text-xs text-ink-soft leading-relaxed">
                      {searchQuery
                        ? "Farklı bir anahtar kelime deneyin."
                        : "Eşyanızın üzerindeki QR kod birisi tarafından okutulup mesaj yazıldığında anında burada belirecek."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* ================= RIGHT COLUMN: ACTIVE CHAT OR OVERVIEW ================= */}
          <div
            className={`app-card !p-2 flex-1 min-w-0 flex flex-col justify-between min-h-0 ${
              mobileView === "list" ? "hidden md:flex" : "flex"
            }`}
          >
            {activeConvDetails ? (
              <>
                {/* Chat Top Header */}
                <div className="px-3.5 py-3 sm:px-5 sm:py-3.5 border-b border-ink/10 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      type="button"
                      onClick={() => setMobileView("list")}
                      className="md:hidden p-2 rounded-xl bg-white border border-ink/20 text-ink hover:bg-gold shadow-2xs cursor-pointer"
                      title="Listeye Dön"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="w-9 h-9 rounded-xl bg-gold/40 border border-ink/25 flex items-center justify-center font-black text-sm text-ink shrink-0">
                      {(decodeHtmlEntities(activeConvDetails.item?.name) || "E").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-xs sm:text-sm text-ink truncate">
                          {decodeHtmlEntities(activeConvDetails.item?.name) || "Kayıp Eşya"}
                        </h3>
                        {activeConvDetails.item?.unique_code && (
                          <Link
                            href={`/q/${activeConvDetails.item.unique_code}`}
                            target="_blank"
                            className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-ink/20 text-ink-soft hover:text-ink hover:border-ink"
                            title="Bu eşyanın bulan kişi ekranını aç"
                          >
                            <span>#{activeConvDetails.item.unique_code}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-ink-soft truncate mt-0.5">
                        <span>
                          Muhatap: <strong className="text-ink">{decodeHtmlEntities(activeConvDetails.finder_alias)}</strong>
                        </span>
                        <span>·</span>
                        {finderIsTyping ? (
                          <span className="text-emerald-700 font-extrabold animate-pulse">
                            ✍️ Bulan kişi yazıyor...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-800 font-bold">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isWsConnected ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                            />
                            <span>Anonim Köprü Aktif</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Conversation Status & Delete Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {activeConvDetails.status !== "resolved" ? (
                      <button
                        type="button"
                        onClick={() => handleStatusChange("resolved")}
                        className="app-button !min-h-10 !px-3 !py-2 !text-xs [--sketch-surface:#1E7E75] text-white"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Teslim Aldım</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStatusChange("active")}
                        className="app-button !min-h-10 !px-3 !py-2 !text-xs [--sketch-surface:#e3edea] text-emerald-950"
                        title="Yeniden aktif konuşma yap"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Teslim Alındı</span>
                      </button>
                    )}
                    {activeConvDetails.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => handleStatusChange("closed")}
                        className="app-button !min-h-10 !px-3 !py-2 !text-xs"
                      >
                        Kapat
                      </button>
                    ) : activeConvDetails.status === "closed" || activeConvDetails.status === "blocked" ? (
                      <button
                        type="button"
                        onClick={() => handleStatusChange("active")}
                        className="app-button !min-h-10 !px-3 !py-2 !text-xs"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Yeniden Aç</span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleDeleteConversation(activeConvDetails.id)}
                      title="Bu konuşmayı sil"
                      className="app-button !min-h-10 !p-3 text-ink-soft hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {/* Optional Owner Note Banner */}
                {(activeConvDetails.item?.reward_text || activeConvDetails.item?.description) && (
                  <div className="px-4 py-2 bg-[#F5EFE0] border-b border-ink/10 flex items-center justify-between gap-2 text-[11px] text-ink shrink-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <Info className="w-3.5 h-3.5 text-gold-dark shrink-0" />
                      <span className="truncate">
                        <strong>Bulan Kişiye Notunuz:</strong>{" "}
                        {decodeHtmlEntities(activeConvDetails.item?.description || activeConvDetails.item?.reward_text)}
                      </span>
                    </div>
                    <span className="text-[10px] text-ink-soft shrink-0 hidden sm:inline">
                      QR Ekranında Görünür
                    </span>
                  </div>
                )}
                {/* Chat Bubble Messages Container */}
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-3">
                  {/* Privacy assurance pill at top of thread */}
                  <div className="text-center my-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFE9DC] border border-ink/15 text-[10.5px] font-bold text-ink-soft">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>
                        Telefon numaran ve hesap e-postan karşı tarafa gösterilmez.
                      </span>
                    </span>
                  </div>
                  {isLoadingDetails ? (
                    <div className="py-12 text-center text-xs text-ink-soft animate-pulse flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gold-dark" />
                      <span>Mesaj geçmişi yükleniyor...</span>
                    </div>
                  ) : activeConvDetails.messages && activeConvDetails.messages.length > 0 ? (
                    activeConvDetails.messages.map((msg) => {
                      const isOwner = msg.sender_type === "owner";
                      const decodedContent = decodeHtmlEntities(msg.content);
                      const photoUrl = extractPhotoUrl(decodedContent);
                      const cleanText = decodedContent
                        .replace(/📷\s*\[(?:Fotoğraf|Photo)\]\([^)]+\)/gi, "")
                        .replace("📍 Location shared", "📍 Konum paylaşıldı")
                        .trim();
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 ${
                            isOwner ? "justify-end" : "justify-start"
                          }`}
                        >
                          {!isOwner && (
                            <div
                              className="w-7 h-7 rounded-full bg-gold/50 border border-ink/30 flex items-center justify-center font-black text-[10px] text-ink shrink-0 shadow-2xs"
                              title={decodeHtmlEntities(activeConvDetails.finder_alias)}
                            >
                              B
                            </div>
                          )}
                          <div
                            className={`max-w-[82%] sm:max-w-[72%] p-3 rounded-2xl text-xs leading-relaxed shadow-2xs border ${
                              isOwner
                                ? "bg-gold text-ink border-ink/30 rounded-br-xs font-medium"
                                : "bg-white text-ink border-ink/15 rounded-bl-xs"
                            }`}
                          >
                            <div className="text-[10px] font-extrabold mb-1 opacity-75 flex items-center justify-between gap-3">
                              <span>
                                {isOwner ? "Siz (Eşya Sahibi)" : decodeHtmlEntities(activeConvDetails.finder_alias)}
                              </span>
                            </div>
                            {cleanText && <p className="whitespace-pre-wrap">{cleanText}</p>}
                            {/* Photo preview */}
                            {photoUrl && (
                              <div
                                onClick={() => setPreviewImageModal(getMediaUrl(photoUrl))}
                                className="mt-2 rounded-xl overflow-hidden border border-ink/20 relative group cursor-pointer"
                              >
                                <img
                                  src={getMediaUrl(photoUrl)}
                                  alt="Paylaşılan Fotoğraf"
                                  className="w-full max-h-52 object-cover rounded-xl"
                                />
                                <div className="absolute bottom-1.5 right-1.5 bg-black/70 px-2 py-0.5 rounded-md text-[10px] text-white font-bold flex items-center gap-1">
                                  <Maximize2 className="w-3 h-3" /> Büyüt
                                </div>
                              </div>
                            )}
                            {/* GPS Location Card */}
                            {msg.location_lat && msg.location_lng && (
                              <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-[11px] text-emerald-950 space-y-1.5 shadow-2xs">
                                <div className="flex items-center justify-between font-extrabold">
                                  <span className="flex items-center gap-1 text-emerald-900">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>
                                      {isOwner
                                        ? "Paylaştığınız Buluşma Konumu"
                                        : "Bulan Kişinin Bildirdiği Konum"}
                                    </span>
                                  </span>
                                  <span className="text-[9px] font-mono bg-emerald-200/80 px-1.5 py-0.5 rounded text-emerald-900">
                                    GPS
                                  </span>
                                </div>
                                {msg.location_address && (
                                  <div className="text-[10.5px] font-semibold text-emerald-900">
                                    {decodeHtmlEntities(msg.location_address)}
                                  </div>
                                )}
                                <div className="text-[10px] font-mono text-emerald-800">
                                  {msg.location_lat}, {msg.location_lng}
                                </div>
                                <a
                                  href={`https://maps.google.com/?q=${msg.location_lat},${msg.location_lng}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[10.5px] shadow-2xs transition-colors"
                                >
                                  <span>Google Haritalar&apos;da Aç</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                            {msg.location_address && !msg.location_lat && (
                              <div className="mt-1.5 pt-1 border-t border-ink/10 text-[10.5px] font-bold text-ink flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gold-dark shrink-0" />
                                <span>Konum Notu: {decodeHtmlEntities(msg.location_address)}</span>
                              </div>
                            )}
                            {/* Timestamp + Read Receipt */}
                            <div className="mt-1 flex items-center justify-end gap-1 text-[9.5px] opacity-70">
                              <span>
                                {new Date(msg.created_at).toLocaleTimeString("tr-TR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {isOwner && (
                                <span
                                  className="inline-flex items-center"
                                  title={msg.is_read ? "Bulan kişi tarafından okundu" : "İletildi"}
                                >
                                  {msg.is_read ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-emerald-800" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          {isOwner && (
                            <div className="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center font-bold text-[9px] shrink-0 shadow-2xs">
                              Siz
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-xs text-ink-soft">
                      Bu konuşmada henüz mesaj bulunmuyor.
                    </div>
                  )}
                  {finderIsTyping && (
                    <div className="flex items-center gap-2 text-xs text-ink-soft pl-2">
                      <div className="px-3 py-1.5 rounded-2xl bg-white border border-ink/15 text-[11px] font-bold text-ink-soft inline-flex items-center gap-1.5 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold-dark animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-gold-dark animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-gold-dark animate-bounce [animation-delay:300ms]" />
                        <span className="ml-1">{decodeHtmlEntities(activeConvDetails.finder_alias)} yazıyor...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                {/* Message Reply Composer & Quick Chips (Sticky Bottom) */}
                <div className="p-4 border-t border-ink/10 shrink-0 space-y-3">
                  {/* Closed / Blocked Banner */}
                  {(activeConvDetails.status === "closed" || activeConvDetails.status === "blocked") && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-[11px] font-bold text-amber-950">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>
                          Bu konuşma şu an {activeConvDetails.status === "blocked" ? "engellenmiş" : "kapalı"} durumda. Yanıt göndermek için yeniden açın.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStatusChange("active")}
                        className="px-2.5 py-1 rounded-lg bg-gold hover:bg-gold-dark text-ink font-extrabold text-[10.5px] border border-ink/30 shrink-0 cursor-pointer"
                      >
                        Yeniden Aç
                      </button>
                    </div>
                  )}
                  {/* Optional Location Bar when Owner clicks MapPin */}
                  {(showLocationBar || ownerGpsCoords) && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                      <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                      {ownerGpsCoords && (
                        <span className="px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-950 font-mono font-bold text-[10px] shrink-0">
                          GPS: {ownerGpsCoords.lat}, {ownerGpsCoords.lng}
                        </span>
                      )}
                      <input
                        type="text"
                        value={ownerLocationNote}
                        onChange={(e) => setOwnerLocationNote(e.target.value)}
                        placeholder="Buluşma noktası notu yazın (Örn: Kadıköy İskele Meydanı, Starbucks önü)..."
                        className="flex-1 bg-transparent text-xs font-medium text-ink focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowLocationBar(false);
                          setOwnerGpsCoords(null);
                          setOwnerLocationNote("");
                        }}
                        className="text-ink-soft hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {/* Quick Suggested Replies for Item Owner */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {[
                      "Çok teşekkürler! Nereden teslim alabilirim?",
                      "Güvenliğe / danışmaya bıraktığınız için minnettarım.",
                      "Ortak bir noktada buluşup teslim alabilirim.",
                      "Kargo ile gönderirseniz tüm masrafı karşılarım.",
                    ].map((quick, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={
                          activeConvDetails.status === "closed" ||
                          activeConvDetails.status === "blocked"
                        }
                        onClick={() => {
                          haptic.lightTap();
                          handleReplyTextChange(replyText ? `${replyText} ${quick}` : quick);
                        }}
                        className="app-chip !text-xs !min-h-10 shrink-0"
                      >
                        {quick}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={handleSendReply} className="flex items-center gap-1.5 sm:gap-2">
                    <input
                      type="file"
                      ref={ownerFileInputRef}
                      onChange={handleOwnerPhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={
                        activeConvDetails.status === "closed" ||
                        activeConvDetails.status === "blocked"
                      }
                      onClick={() => {
                        haptic.lightTap();
                        ownerFileInputRef.current?.click();
                      }}
                      className="app-button !px-3 shrink-0"
                      title="Fotoğraf Gönder"
                    >
                      <Camera className="w-4 h-4 text-ink" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        haptic.lightTap();
                        if (!showLocationBar && !ownerGpsCoords) {
                          setShowLocationBar(true);
                        } else {
                          handleGetOwnerGps();
                        }
                      }}
                      disabled={
                        isGettingGps ||
                        activeConvDetails.status === "closed" ||
                        activeConvDetails.status === "blocked"
                      }
                      className={`app-button !px-3 shrink-0 ${
                        showLocationBar || ownerGpsCoords
                          ? "[--sketch-surface:#e3edea] text-emerald-900"
                          : "bg-[#F5F0E4] border-ink/20 hover:bg-gold text-ink"
                      }`}
                      title="Buluşma Yeri veya GPS Konumu Ekle"
                    >
                      {isGettingGps ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="text"
                      disabled={
                        activeConvDetails.status === "closed" ||
                        activeConvDetails.status === "blocked"
                      }
                      value={replyText}
                      onChange={(e) => handleReplyTextChange(e.target.value)}
                      placeholder={
                        activeConvDetails.status === "closed" ||
                        activeConvDetails.status === "blocked"
                          ? "Bu konuşma şu an kapalı"
                          : "Bulan kişiye anonim yanıtınızı yazın..."
                      }
                      aria-label="Mesajın"
                      className="app-input min-w-0 flex-1"
                    />
                    <button
                      type="submit"
                      disabled={
                        isSending ||
                        activeConvDetails.status === "closed" ||
                        activeConvDetails.status === "blocked" ||
                        (!replyText.trim() && !ownerGpsCoords && !ownerLocationNote.trim())
                      }
                      className="app-button app-button-primary !px-4 shrink-0"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Gönder</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              /* ================= RICH RIGHT PANEL EMPTY / OVERVIEW STATE ================= */
              <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center overflow-y-auto">
                <div className="max-w-lg w-full space-y-6">
                  <div className="w-14 h-14 rounded-2xl bg-gold/40 border-2 border-ink shadow-[0_3px_0px_#33302B] flex items-center justify-center mx-auto text-ink">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-black text-lg sm:text-xl text-ink tracking-tight">
                      Mesajların burada buluşsun.
                    </h3>
                    <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
                      Bir konuşma seçerek yanıtla. Henüz mesajın yoksa, eşyanı bulan kişi QR üzerinden yazdığında burada görünecek.
                    </p>
                  </div>
                  {/* 3-Step Visual Architecture Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                    <div className="app-card !p-4 space-y-2">
                      <div className="w-7 h-7 rounded-lg bg-gold/40 border border-ink/20 flex items-center justify-center font-black text-xs text-ink">
                        1
                      </div>
                      <h4 className="font-extrabold text-xs text-ink">QR Okutulur</h4>
                      <p className="text-[11px] text-ink-soft leading-snug">
                        Bulan kişi uygulama indirmeden kamerasıyla etiketi okutur ve notunuzu görür.
                      </p>
                    </div>
                    <div className="app-card !p-4 space-y-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center font-black text-xs text-emerald-900">
                        2
                      </div>
                      <h4 className="font-extrabold text-xs text-ink">Konum & Fotoğraf</h4>
                      <p className="text-[11px] text-ink-soft leading-snug">
                        Bulan kişi isterse fotoğraf veya konum ekleyebilir.
                      </p>
                    </div>
                    <div className="app-card !p-4 space-y-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center font-black text-xs text-amber-950">
                        3
                      </div>
                      <h4 className="font-extrabold text-xs text-ink">Site üzerinden sohbet</h4>
                      <p className="text-[11px] text-ink-soft leading-snug">
                        Telefon numaranı paylaşmadan mesajlaş, teslim için birlikte anlaş.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      </motion.main>
      {/* Lightbox Preview Modal */}
      <AnimatePresence>
        {previewImageModal && (
          <div
            onClick={() => setPreviewImageModal(null)}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl max-h-[85vh] p-2 bg-white rounded-2xl shadow-2xl"
            >
              <button
                onClick={() => setPreviewImageModal(null)}
               className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center shadow-lg hover:bg-ink-soft transition-colors z-20 cursor-pointer" >
                
                <X className="w-4 h-4" />
              </button>
              <img
                src={previewImageModal}
                alt="Full size preview"
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen dot-grid-pattern text-ink flex items-center justify-center">
          <div className="p-6 bg-paper-card rounded-2xl border border-ink/20 text-xs font-bold text-ink-soft animate-pulse flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-gold-dark" />
            <span>Mesajların Yükleniyor...</span>
          </div>
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}

