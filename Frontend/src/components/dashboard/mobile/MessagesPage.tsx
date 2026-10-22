"use client";
import { useOlderMessages } from "@/lib/useOlderMessages";
import { mergeChatDetails } from "@/lib/api";
import { OlderMessages } from "@/components/ui/OlderMessages";
import { ChatImage } from "@/components/ui/ChatImage";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePagedList } from "@/lib/usePagedList";
import { useResponsiveState } from "@/lib/responsiveState";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowDown, Plus, MessageCircle, Search, Send, MoreHorizontal, Camera, MapPin, Check, CheckCheck, Loader2, X, ShieldCheck, ExternalLink, Package } from "lucide-react";
import { MobileAccountMenu } from "@/components/dashboard/MobileAccountMenu";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useVisualViewport } from "@/lib/useVisualViewport";
import { chatApi, getAuthToken, getMediaUrl, getWebSocketChatUrl, ConversationData, ConversationDetailData, MessageData, uploadImage } from "@/lib/api";
import { decodeHtmlEntities, parseMessageMedia } from "@/lib/utils";
import { startVisiblePolling } from "@/lib/visiblePolling";
import { CHAT_WEBSOCKETS_ENABLED } from "@/lib/api";

function time(value: string) { return new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }); }

function MessagesContent() {
  const router = useRouter();
  const params = useSearchParams();
  const activeId = params.get("id");
  const toast = useToast();

  const [details, setDetails] = useState<ConversationDetailData | null>(null);
  const latestChat = useRef(details);
  useEffect(() => { latestChat.current = details; }, [details]);

  const [loadingChat, setLoadingChat] = useState(false);

  const [chatError, setChatError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const page = usePagedList(`${filter}:${query}`, offset => chatApi.list(filter, query, offset));
  const { items: list, setItems: setList, loading, error: listError } = page;
  const [text, setText] = useResponsiveState(`reply:${activeId || "none"}`, "");
  const [sending, setSending] = useResponsiveState(`replybusy:${activeId || "none"}`, false);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [actions, setActions] = useState(false);
  const [attachments, setAttachments] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [location, setLocation] = useResponsiveState<{ lat?: number; lng?: number; address?: string }>(`replylocation:${activeId || "none"}`, {});
  const [gpsBusy, setGpsBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [newBelow, setNewBelow] = useState(false);
  const socket = useRef<WebSocket | null>(null);
  const activeRef = useRef(activeId);
  activeRef.current = activeId;
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const typingSentAt = useRef(0);
  const older = useOlderMessages(details, setDetails, cursor => chatApi.getOlderMessages(activeId!, cursor));
  const history = older.container;
  const atBottom = useRef(true);
  const photoInput = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const sendingLock = useRef(false);
  useVisualViewport(!!activeId);

  const scrollBottom = useCallback((force = false) => {
    requestAnimationFrame(() => {
      if (force || atBottom.current) {
        history.current?.scrollTo({ top: history.current.scrollHeight, behavior: force ? "auto" : "smooth" });
        setNewBelow(false);
      } else setNewBelow(true);
    });
  }, []);
  useEffect(() => {
    const element = input.current;
    if (element) { element.style.height = "auto"; element.style.height = Math.min(element.scrollHeight, 128) + "px"; }
  }, [text, activeId]);
  useEffect(() => {
    if (!activeId) return;
    const resize = () => { if (atBottom.current) scrollBottom(true); };
    window.visualViewport?.addEventListener("resize", resize);
    return () => window.visualViewport?.removeEventListener("resize", resize);
  }, [activeId, scrollBottom]);
  const loadList = page.refresh;
  useEffect(() => startVisiblePolling(() => loadList(true), 30000, false), [loadList]);

  const loadDetails = useCallback(async (id: string, initial = false) => {
    if (initial) setLoadingChat(true);
    try {
      const next = await chatApi.getDetails(id, initial ? null : latestChat.current);
      if (activeRef.current !== id) return;
      const hasNewMessages = next.messages.some(message => !latestChat.current?.messages.some(existing => existing.id === message.id));
      setDetails(previous => initial ? next : mergeChatDetails(previous, next)); setChatError("");
      setList(previous => previous.map(item => item.id === id ? { ...item, unread_count: 0 } : item));
      if (initial) scrollBottom(true); else if (hasNewMessages) scrollBottom();
    } catch (error) { if (activeRef.current === id) setChatError((error as Error).message); }
    finally { if (activeRef.current === id) setLoadingChat(false); }
  }, [scrollBottom]);
  useEffect(() => {
    setDetails(null); setChatError("");
    setNewBelow(false); atBottom.current = true;
    if (activeId) loadDetails(activeId, true);
  }, [activeId, loadDetails]);

  useEffect(() => {
    if (!CHAT_WEBSOCKETS_ENABLED || !activeId) return;
    let disposed = false;
    let ws: WebSocket | null = null;
    let reconnect: ReturnType<typeof setTimeout>;
    let heartbeat: ReturnType<typeof setInterval>;
    const connect = () => {
      if (disposed) return;
      ws = new WebSocket(getWebSocketChatUrl(activeId), ["kayipqr", `auth.${getAuthToken() || ""}`]);
      socket.current = ws;
      ws.onopen = () => {
        if (disposed) return;
        setConnected(true);
        // Fetch anything that arrived while disconnected, preserving the reading position.
        loadDetails(activeId);
        heartbeat = setInterval(() => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" })); }, 25000);
      };
      ws.onclose = () => { if (heartbeat) clearInterval(heartbeat); if (!disposed) { setConnected(false); reconnect = setTimeout(connect, 3000); } };
      ws.onmessage = event => {
        if (disposed) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "pong") {
            const current = latestChat.current;
            if (current && ((data.last_message_id && !current.messages.some(message => message.id === data.last_message_id)) || (data.status && current.status !== data.status))) {
              void loadDetails(activeId);
            }
            return;
          }
          if (data.type === "new_message") {
            setTyping(false);
            setDetails(previous => previous?.id === activeId && !previous.messages.some(message => message.id === data.message.id) ? { ...previous, messages: [...previous.messages, data.message] } : previous);
            if (data.message.sender_type === "finder" && !document.hidden) ws?.send(JSON.stringify({ type: "read_ack" }));
            scrollBottom(); loadList();
          } else if (data.type === "typing" && data.sender_type === "finder") {
            setTyping(!!data.is_typing); clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => setTyping(false), 3500);
          } else if (data.type === "read_ack" && data.reader === "finder") {
            setDetails(previous => previous ? { ...previous, messages: previous.messages.map(message => message.sender_type === "owner" ? { ...message, is_read: true } : message) } : previous);
          } else if (data.type === "status_update") {
            setDetails(previous => previous ? { ...previous, status: data.status } : previous); loadList();
          }
        } catch {}
      };
    };
    connect();
    return () => { disposed = true; clearTimeout(reconnect); clearInterval(heartbeat); clearTimeout(typingTimer.current); ws?.close(); socket.current = null; setConnected(false); setTyping(false); };
  }, [activeId, loadDetails, loadList, scrollBottom]);
  useEffect(() => {
    if (!activeId) return;
    return startVisiblePolling(async () => { if (!connected) await loadDetails(activeId); }, 15000, false);
  }, [activeId, connected, loadDetails]);

  const sendContent = async (content: string, sharedLocation = location) => {
    if (!activeId || sendingLock.current || sending) return;
    const conversationId = activeId;
    sendingLock.current = true; setSending(true);
    try {
      const message = await chatApi.sendMessage(conversationId, content, sharedLocation);
      if (activeRef.current === conversationId) {
        setText(""); setLocation({});
        setDetails(previous => previous && !previous.messages.some(entry => entry.id === message.id) ? { ...previous, messages: [...previous.messages, message] } : previous);
        scrollBottom(true);
      }
      loadList();
    } catch (error) { toast.error((error as Error).message || "Mesaj gönderilemedi."); }
    finally { sendingLock.current = false; setSending(false); }
  };
  const changeStatus = async (status: ConversationData["status"]) => {
    if (!activeId || actionBusy) return;
    setActionBusy(true);
    try { await chatApi.updateStatus(activeId, status); setDetails(previous => previous ? { ...previous, status } : previous); setActions(false); loadList(); toast.success(status === "resolved" ? "Eşya teslim alındı olarak işaretlendi." : "Konuşma durumu güncellendi."); }
    catch (error) { toast.error((error as Error).message); }
    finally { setActionBusy(false); }
  };
  const unread = list.reduce((sum, item) => sum + (item.unread_count || 0), 0);
  const filtered = list;
  const closed = details?.status === "closed" || details?.status === "blocked";
  const renderMessage = (message: MessageData) => {
    const own = message.sender_type === "owner";
    const media = parseMessageMedia(decodeHtmlEntities(message.content));
    return <div key={message.id} className={`flex mb-3 ${own ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[86%] md:max-w-[75%] px-4 py-3 rounded-[20px] text-[15px] leading-relaxed break-words ${own ? "bg-[#F4CB70] rounded-br-md" : "bg-white border border-ink/10 rounded-bl-md"}`}>
        {media.text && <p className="whitespace-pre-wrap">{media.text}</p>}
        {media.image && <button onClick={() => setPreview(getMediaUrl(media.image))} className="block mt-1" aria-label="Fotoğrafı büyüt"><ChatImage refresh={async () => { const refreshed = await chatApi.getMessage(details!.id, message.id); setDetails(previous => previous?.id === refreshed.conversation_id ? { ...previous, messages: previous.messages.map(entry => entry.id === refreshed.id ? refreshed : entry) } : previous); }} src={getMediaUrl(media.image)} alt="Paylaşılan eşya fotoğrafı" className="rounded-xl max-h-56 object-cover" onLoad={() => { if (atBottom.current) scrollBottom(); }} /></button>}
        {message.location_lat != null && message.location_lng != null && <a className="flex items-center gap-2 rounded-xl bg-white/60 p-3 mt-2 font-bold text-sm" href={`https://maps.google.com/?q=${message.location_lat},${message.location_lng}`} target="_blank" rel="noreferrer"><MapPin size={18} /><span>{message.location_address || "Paylaşılan konum"}</span><ExternalLink size={15} /></a>}
        {message.location_address && message.location_lat == null && <p className="flex gap-2 mt-2 text-sm"><MapPin size={17} className="shrink-0" />{message.location_address}</p>}
        <div className="flex justify-end items-center gap-1 mt-1 text-[11px] text-ink/60"><time>{time(message.created_at)}</time>{own && (message.is_read ? <CheckCheck size={15} aria-label="Okundu" className="text-[#1E7E75]" /> : <Check size={14} aria-label="İletildi" />)}</div>
      </div>
    </div>;
  };
  return <div className="app-shell min-h-screen flex flex-col md:flex-row">
    <Sidebar unreadCount={unread} hideMobileHeader={!!activeId} />
    <main className={`app-main md:h-dvh md:flex md:flex-col ${activeId ? "app-chat-screen" : ""}`}>
      <header className={`${activeId ? "hidden md:flex" : "flex"} items-end justify-between mb-6`}><div><p className="app-eyebrow mb-2">İLETİŞİM</p><h1 className="text-[28px] font-extrabold tracking-tight">Mesajların</h1><p className="text-sm text-ink-soft mt-2">Eşyana kavuşmaya bir mesaj daha yakın.</p></div><span className="text-sm font-bold text-[#1E7E75]">{unread ? `${unread} yeni` : ""}</span></header>
      <div className="app-conversations flex-1 min-h-0 md:flex">
        <aside className={`${activeId ? "hidden md:flex" : "flex"} flex-col md:w-[300px] lg:w-[340px] md:shrink-0 md:border-r md:border-ink/10`}>
          <div className="p-0 md:p-5 space-y-3 pb-4">
            <div className="relative"><Search size={19} className="absolute left-4 top-4 text-ink-soft" /><input className="app-input !pl-11" aria-label="Konuşmalarda ara" placeholder="Eşya veya mesaj ara" maxLength={100} value={query} onChange={event => setQuery(event.target.value)} /></div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{[["all", "Tümü"], ["unread", "Okunmamış"], ["active", "Aktif"], ["resolved", "Çözüldü"], ["closed", "Kapalı"]].map(([key, label]) => <button key={key} className="app-chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div>
          </div>
          {listError && <div role="alert" className="app-error m-3">{listError}<button className="underline block mt-2" onClick={() => loadList()}>Yeniden dene</button></div>}
          <div className="md:overflow-y-auto flex-1">
            {page.hasMore && <button className="app-button w-full" disabled={page.loadingMore} onClick={page.loadMore}>Daha fazla konuşma</button>}
            {loading ? <p className="py-12 text-center text-ink-soft" role="status">Konuşmalar yükleniyor…</p> : listError && !list.length ? null : filtered.length ? filtered.map(item => <Link key={item.id} href={`/messages?id=${item.id}`} className={`flex gap-3 px-1 md:px-5 py-5 border-b border-ink/10 ${activeId === item.id ? "bg-gold/10" : ""}`}>
              <span className="w-12 h-12 rounded-2xl bg-[#e6ede5] text-[#1E7E75] shrink-0 flex items-center justify-center overflow-hidden">{item.item?.image_url ? <img src={getMediaUrl(item.item.image_url)} alt="" className="w-full h-full object-cover" /> : <Package size={23} />}</span>
              <span className="flex-1 min-w-0"><span className="flex justify-between items-center gap-2"><strong className="text-[15px] truncate">{decodeHtmlEntities(item.item?.name) || "Kayıp eşya"}</strong><time className="text-[11px] text-ink-soft shrink-0">{time(item.updated_at)}</time></span><span className="block text-sm text-ink-soft truncate mt-1">{item.last_message ? (item.last_message.sender_type === "owner" ? "Sen: " : "") + (parseMessageMedia(decodeHtmlEntities(item.last_message.content)).image ? "Fotoğraf gönderildi" : decodeHtmlEntities(item.last_message.content)) : "Yeni konuşma"}</span><span className="flex justify-between items-center mt-2"><span className="text-xs text-ink-soft">{item.finder_alias} · {item.status === "resolved" ? "Teslim alındı" : item.status === "active" ? "Aktif" : "Kapalı"}</span>{!!item.unread_count && <span className="rounded-full bg-[#1E7E75] text-white text-xs font-bold px-2 py-0.5">{item.unread_count}</span>}</span></span>
            </Link>) : <div className="text-center px-6 py-14"><MessageCircle size={36} className="mx-auto text-ink/25 mb-4" /><h2 className="font-bold">{(filter !== "all" || query) ? "Konuşma bulunamadı" : "Henüz mesajın yok"}</h2><p className="text-sm leading-relaxed text-ink-soft mt-2">{(filter !== "all" || query) ? "Başka bir arama veya filtre deneyebilirsin." : "Birisi QR etiketin üzerinden yazdığında konuşmanız burada görünecek."}</p>{(filter !== "all" || !!query) && <button className="app-button mt-4" onClick={() => { setFilter("all"); setQuery(""); }}>Filtreleri temizle</button>}</div>}
          </div>
        </aside>
        <section className={`${activeId ? "flex" : "hidden md:flex"} flex-col flex-1 min-w-0 min-h-0 h-full bg-[#F5F1E8]`}>
          {activeId ? <>
            <header className="shrink-0 flex items-center gap-2 p-3 md:px-5 bg-paper-card border-b border-ink/10">
              <Link href="/messages" className="app-icon-button md:hidden" aria-label="Konuşma listesine dön"><ArrowLeft size={22} /></Link>
              <div className="min-w-0 flex-1"><h2 className="font-extrabold truncate text-base">{decodeHtmlEntities(details?.item?.name) || "Konuşma"}</h2><p className="text-xs text-ink-soft mt-1">{typing ? "Bulan kişi yazıyor…" : !CHAT_WEBSOCKETS_ENABLED ? "Mesajlar düzenli güncellenir · Bilgilerin gizli" : connected ? "Canlı bağlantı · Bilgilerin gizli" : "Bağlantı yenileniyor…"}</p></div>
              <button className="app-icon-button" onClick={() => setActions(true)} aria-label="Konuşma işlemleri"><MoreHorizontal size={23} /></button><div className="md:hidden"><MobileAccountMenu unreadCount={unread} /></div>
            </header>
            {details?.status === "resolved" && <div className="px-5 py-3 bg-[#e5eee4] text-[#28654b] text-sm flex gap-2"><CheckCheck size={18} />Eşya teslim alındı. Teşekkürler!</div>}
            {closed && <div className="px-5 py-3 bg-gold/15 text-sm">Bu konuşma {details?.status === "blocked" ? "engellendi" : "kapatıldı"}. <button className="underline font-bold" onClick={() => changeStatus("active")}>Yeniden aç</button></div>}
            <div ref={history} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 md:p-6" onScroll={() => { const element = history.current; if (element) { atBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 100; if (atBottom.current) setNewBelow(false); } older.onScroll(); }}>
              <p className="flex justify-center gap-1.5 text-[11px] text-ink-soft mb-6"><ShieldCheck size={14} />Telefonun ve e-postan karşı tarafa gösterilmez.</p>
              {loadingChat && <p role="status" className="text-center py-10 text-sm">Mesajlar yükleniyor…</p>}
              {chatError && <div role="alert" className="app-error">{chatError}<button className="underline block mt-2" onClick={() => loadDetails(activeId, true)}>Yeniden dene</button></div>}
              <OlderMessages hasMore={!!details?.next_cursor} {...older} />
              {details?.messages.map(renderMessage)}
              {typing && <p className="text-xs text-ink-soft py-2">Bulan kişi yazıyor…</p>}
            </div>
            {newBelow && <button className="app-button self-center !min-h-10 !py-2 mb-2 bg-white shadow-md" onClick={() => scrollBottom(true)}><ArrowDown size={16} />Yeni mesajlar</button>}
            <div className="shrink-0 border-t border-ink/10 bg-paper-card p-3 md:p-4 pb-[max(12px,env(safe-area-inset-bottom))]">
              {!closed && details && <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">{["Çok teşekkürler!", "Nereden teslim alabilirim?", "Ortak bir yerde buluşalım."].map(reply => <button key={reply} className="text-xs whitespace-nowrap min-h-9 px-3 border border-ink/10 rounded-full" onClick={() => { setText(previous => previous ? previous + " " + reply : reply); input.current?.focus(); }}>{reply}</button>)}</div>}
              {(location.address || location.lat != null) && <div className="flex gap-2 items-center mb-2 p-2 rounded-xl bg-[#e6eee5] text-sm"><MapPin size={17} /><span className="truncate flex-1">{location.address || "GPS konumun eklendi"}</span><button className="app-icon-button" aria-label="Konumu kaldır" onClick={() => setLocation({})}><X size={17} /></button></div>}
              <form className="flex items-end gap-2" onSubmit={event => { event.preventDefault(); if (!closed && (text.trim() || location.address || location.lat != null)) sendContent(text.trim() || "Buluşma konumumu paylaştım."); }}>
                <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async event => {
                  const file = event.target.files?.[0]; event.target.value = ""; if (!file || !activeId) return;
                  setPhotoBusy(true); try { const result = await uploadImage(file); if (activeRef.current === activeId) await sendContent(`📷 [Fotoğraf](${result.url})`, {}); else toast.info("Konuşma değiştiği için fotoğraf gönderilmedi."); } catch (error) { toast.error((error as Error).message); } finally { setPhotoBusy(false); }
                }} />
                <button type="button" className="app-icon-button bg-[#eee8db] !h-12 !w-12" disabled={closed || !details || photoBusy} onClick={() => setAttachments(true)} aria-label="Fotoğraf veya konum ekle">{photoBusy ? <Loader2 className="animate-spin" size={20} /> : <Plus size={23} />}</button>
                <textarea ref={input} rows={1} maxLength={2000} className="app-input resize-none !min-h-12 max-h-32" placeholder={closed ? "Konuşma kapalı" : "Mesajını yaz…"} aria-label="Mesajın" disabled={closed || !details} value={text} onChange={event => {
                  setText(event.target.value); event.target.style.height = "auto"; event.target.style.height = Math.min(event.target.scrollHeight, 128) + "px";
                  if (Date.now() - typingSentAt.current > 800 && socket.current?.readyState === WebSocket.OPEN) { socket.current.send(JSON.stringify({ type: "typing", is_typing: !!event.target.value.trim() })); typingSentAt.current = Date.now(); }
                }} />
                <button className="app-icon-button bg-gold !h-12 !w-12" aria-label="Mesajı gönder" disabled={closed || !details || (!text.trim() && !location.address && location.lat == null) || sending}><Send size={21} /></button>
              </form>
            </div>
          </> : <div className="m-auto text-center p-10 max-w-md"><MessageCircle size={44} className="mx-auto text-[#1E7E75] mb-5" /><h2 className="text-xl font-bold">Bir konuşma seç</h2><p className="text-ink-soft mt-3 leading-relaxed">Eşyalarını bulan kişilerle buradan güvenle iletişim kurabilirsin.</p></div>}
        </section>
      </div>
    </main>
    <Sheet open={actions} onClose={() => setActions(false)} title="Konuşma işlemleri">
      <div className="space-y-2">
        {details?.item && <Link className="app-button w-full" href={`/dashboard/${details.item.id}`}><Package size={19} />Eşyayı görüntüle</Link>}
        <button className="app-button w-full" disabled={actionBusy} onClick={() => changeStatus("resolved")}><CheckCheck size={19} />Teslim aldım</button>
        <button className="app-button w-full" disabled={actionBusy} onClick={() => changeStatus(closed ? "active" : "closed")}><MessageCircle size={19} />{closed ? "Konuşmayı yeniden aç" : "Konuşmayı kapat"}</button>
        <button className="app-button w-full text-rose-700 !mt-6" onClick={() => { setActions(false); setDeleteOpen(true); }}>Konuşmayı sil</button>
      </div>
    </Sheet>
    <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Konuşmayı sil?"><p className="text-sm leading-relaxed text-ink-soft mb-5">Bu konuşma ve mesaj geçmişi kalıcı olarak silinecek. Bu işlem geri alınamaz.</p><button className="app-button app-button-danger w-full text-white" disabled={actionBusy} onClick={async () => {
      if (!activeId) return; setActionBusy(true); try { await chatApi.delete(activeId); setDeleteOpen(false); router.push("/messages"); loadList(); } catch (error) { toast.error((error as Error).message); } finally { setActionBusy(false); }
    }}>{actionBusy ? "Siliniyor…" : "Evet, konuşmayı sil"}</button></Sheet>
    <Sheet open={attachments} onClose={() => setAttachments(false)} title="Mesajına ekle"><div className="space-y-3"><button className="app-button w-full" onClick={() => { setAttachments(false); photoInput.current?.click(); }}><Camera size={21} />Fotoğraf gönder</button><button className="app-button w-full" onClick={() => { setAttachments(false); setLocationOpen(true); }}><MapPin size={21} />Buluşma konumu ekle</button></div></Sheet>
    <Sheet open={locationOpen} onClose={() => setLocationOpen(false)} title="Buluşma konumu"><p className="text-sm text-ink-soft leading-relaxed mb-5">Bir yer adı yazabilir veya bulunduğun GPS konumunu paylaşabilirsin. Gönderdiğinde karşı taraf bu konumu görebilir.</p><label className="app-label" htmlFor="meeting">Yer veya buluşma notu</label><input id="meeting" className="app-input mb-4" maxLength={255} value={location.address || ""} placeholder="Örn. Merkez kütüphane danışması" onChange={event => setLocation(previous => ({ ...previous, address: event.target.value }))} /><button className="app-button w-full mb-3" disabled={gpsBusy} onClick={() => {
      if (!navigator.geolocation) { toast.error("Tarayıcın konum paylaşımını desteklemiyor."); return; } setGpsBusy(true);
      navigator.geolocation.getCurrentPosition(position => { setLocation(previous => ({ ...previous, lat: position.coords.latitude, lng: position.coords.longitude })); setGpsBusy(false); }, () => { toast.error("Konum alınamadı. Yer adını yazarak devam edebilirsin."); setGpsBusy(false); }, { timeout: 10000 });
    }}><MapPin size={18} />{gpsBusy ? "Konum alınıyor…" : location.lat != null ? "GPS konumun eklendi ✓" : "GPS konumumu ekle"}</button><button className="app-button app-button-primary w-full" disabled={!location.address && location.lat == null} onClick={() => setLocationOpen(false)}>Mesaja ekle</button></Sheet>
    <Sheet open={!!preview} onClose={() => setPreview(null)} title="Paylaşılan fotoğraf">{preview && <img src={preview} alt="Paylaşılan fotoğrafın büyük görünümü" className="w-full rounded-xl" />}</Sheet>
  </div>;
}
export default function MessagesPage() { return <Suspense fallback={<div className="p-10 text-center">Mesajlar yükleniyor…</div>}><MessagesContent /></Suspense>; }

