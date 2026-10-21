const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
export const CHAT_WEBSOCKETS_ENABLED = process.env.NEXT_PUBLIC_CHAT_TRANSPORT !== "polling";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone_number?: string;
  avatar_url?: string;
  is_active: boolean;
  email_on_scan?: boolean;
  email_on_message?: boolean;
  email_verified?: boolean;
  has_password?: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface QRCodeData {
  id: string;
  unique_code: string;
  public_url: string;
  color_dark: string;
  color_light: string;
  pattern_style: string;
  frame_type: string;
  frame_text?: string;
  total_scans: number;
}

export interface ItemData {
  id: string;
  name: string;
  category: string;
  description?: string;
  owner_display_name?: string;
  image_url?: string | null;
  status: "safe" | "lost" | "resolved";
  is_active: boolean;
  reward_text?: string;
  show_name_to_finder?: boolean;
  show_desc_to_finder?: boolean;
  created_at: string;
  updated_at: string;
  qr_code?: QRCodeData;
  total_scans?: number;
  unread_messages_count?: number;
}

export interface MessageData {
  id: string;
  conversation_id: string;
  sender_type: "owner" | "finder";
  content: string;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  is_read: boolean;
  created_at: string;
}

export interface ConversationItemSummary {
  id: string;
  name: string;
  category: string;
  image_url?: string | null;
  status: string;
  unique_code?: string;
  description?: string;
  reward_text?: string;
}

export interface ConversationData {
  id: string;
  item_id: string;
  finder_alias: string;
  status: "active" | "closed" | "blocked" | "resolved";
  created_at: string;
  updated_at: string;
  item?: ConversationItemSummary;
  last_message?: MessageData;
  unread_count?: number;
}

export interface ConversationDetailData extends ConversationData {
  messages: MessageData[];
  next_cursor?: string | null;
  read_through?: string | null;
}

export interface PublicItemData {
  unique_code: string;
  name: string;
  category: string;
  description?: string;
  owner_display_name?: string;
  image_url?: string | null;
  status: "safe" | "lost" | "resolved";
  is_active: boolean;
  reward_text?: string;
  show_name_to_finder?: boolean;
  show_desc_to_finder?: boolean;
  created_at: string;
}

export interface PublicContactResponse {
  conversation_id: string;
  finder_session_token: string;
  message: string;
  status: string;
}

export interface DashboardStats {
  total_items: number;
  safe_items: number;
  lost_items: number;
  resolved_items: number;
  total_scans: number;
  active_conversations: number;
  total_messages: number;
  unread_messages: number;
  recent_scans: any[];
}

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  body: string;
  item_id?: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface QRScanData {
  id: string;
  item_id: string;
  scanned_at: string;
  device_type: string;
  approximate_city?: string;
  approximate_country?: string;
  latitude?: number;
  longitude?: number;
}

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("kayipqr_token") ||
    sessionStorage.getItem("kayipqr_token")
  );
};

export const getStoredUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const raw =
    localStorage.getItem("kayipqr_user") ||
    sessionStorage.getItem("kayipqr_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const setAuthSession = (
  token: string,
  user: User,
  rememberMe: boolean = true
): void => {
  if (typeof window === "undefined") return;
  const userJson = JSON.stringify(user);
  sessionStorage.setItem("kayipqr_token", token);
  sessionStorage.setItem("kayipqr_user", userJson);
  if (rememberMe) {
    localStorage.setItem("kayipqr_token", token);
    localStorage.setItem("kayipqr_user", userJson);
  } else {
    localStorage.removeItem("kayipqr_token");
    localStorage.removeItem("kayipqr_user");
  }
};

export const clearAuthTokens = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("kayipqr_token");
  localStorage.removeItem("kayipqr_user");
  sessionStorage.removeItem("kayipqr_token");
  sessionStorage.removeItem("kayipqr_user");
};

const getHeaders = (token?: string) => {
  const t = token || getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
};

const handleAuthFailureIfNeeded = (res: Response) => {
  if (res.status === 401) {
    clearAuthTokens();
  }
};

export const getPublicAppUrl = (): string => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return "https://kayipqr.com";
};

async function authAction<T>(path: string, data: object): Promise<T> {
  const response = await fetch(`${API_BASE}/auth/${path}`, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(data) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(typeof result.detail === "string" ? result.detail : "İşlem tamamlanamadı."), {retryAfter: Number(response.headers.get("Retry-After")) || 0});
  return result;
}

export const googleAuthApi = {
  config: async (): Promise<{enabled: boolean}> => { const response = await fetch(`${API_BASE}/auth/google/config`); if (!response.ok) return {enabled:false}; return response.json(); },
  startUrl: (redirect: string) => `${API_BASE}/auth/google/start?redirect=${encodeURIComponent(redirect)}`,
  exchange: (token: string) => authAction<AuthResponse>("google/exchange", {token}),
};

export const authApi = {
  verifyEmail: (token: string) => authAction<AuthResponse>("verify-email", {token}),
  resendVerification: (email: string) => authAction<{message: string; retry_after: number}>("resend-verification", {email}),
  register: async (data: { email: string; password: string; full_name?: string; phone_number?: string }): Promise<{message: string; email: string; verification_required: boolean}> => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.detail || "Kayıt işlemi başarısız oldu.");
    }
    return body;
  },

  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.detail || "E-posta veya şifre hatalı.");
    }
    return body;
  },

  getMe: async (token?: string): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(token),
    });

    handleAuthFailureIfNeeded(res);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.detail || "Oturum süresi doldu.");
    }
    return body;
  },

  updateProfile: async (data: {
    full_name?: string;
    phone_number?: string;
    avatar_url?: string;
    email_on_scan?: boolean;
    email_on_message?: boolean;
  }): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    handleAuthFailureIfNeeded(res);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.detail || "Profil güncellenemedi.");
    }
    return body;
  },

  deleteAccount: async (): Promise<void> => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    handleAuthFailureIfNeeded(res);
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: "Hesap silinemedi." }));
      throw new Error(body.detail || "Hesap silinemedi.");
    }
  },

  changePassword: async (data: {
    current_password: string;
    new_password: string;
  }): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    handleAuthFailureIfNeeded(res);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.detail || "Şifre değiştirilemedi.");
    }
    if (body.access_token) {
      sessionStorage.setItem("kayipqr_token", body.access_token);
      if (localStorage.getItem("kayipqr_token")) localStorage.setItem("kayipqr_token", body.access_token);
    }
    return body;
  },

  forgotPassword: async (email: string): Promise<{ message: string; retry_after: number }> => {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw Object.assign(new Error(body.detail || "Şifre sıfırlama isteği gönderilemedi."), { retryAfter: Number(res.headers.get("Retry-After")) || 0 });
    }
    return body;
  },

  resetPassword: async (token: string, new_password: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.detail || "Şifre sıfırlanamadı.");
    }
    return body;
  },
};

export const getWebSocketChatUrl = (conversationId: string): string => {
  let wsBase = "";
  if (process.env.NEXT_PUBLIC_WS_URL) {
    wsBase = process.env.NEXT_PUBLIC_WS_URL
      .replace(/^http/, "ws")
      .replace(/\/api\/v1\/?$/, "")
      .replace(/\/+$/, "");
  } else {
    const rawApiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
    if (rawApiBase.startsWith("/")) {
      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : "http://127.0.0.1:8000";
      wsBase = origin.replace(/^http/, "ws").replace(/\/+$/, "");
    } else {
      wsBase = rawApiBase
        .replace(/^http/, "ws")
        .replace(/\/api\/v1\/?$/, "")
        .replace(/\/+$/, "");
    }
  }

  return `${wsBase}/ws/chat/${conversationId}`;
};


// Keep the existing screens intact while bounding every backend response.
async function fetchListPages<T extends { id: string }>(path: string, errorMessage: string): Promise<T[]> {
  const records = new Map<string, T>();
  let offset = 0;
  while (true) {
    const res = await fetch(`${API_BASE}${path}${path.includes("?") ? "&" : "?"}limit=100&offset=${offset}`, { headers: getHeaders() });
    handleAuthFailureIfNeeded(res);
    if (!res.ok) throw new Error(errorMessage);
    const page: T[] = await res.json();
    page.forEach(record => records.set(record.id, record));
    if (page.length < 100) return Array.from(records.values());
    offset += page.length;
  }
}

async function fetchConversationHistory(path: string, authenticated: boolean, previous?: ConversationDetailData | null): Promise<ConversationDetailData> {
  // Refresh expiring image capabilities occasionally, rather than every polling round.
  if (previous?.messages.some(message => Array.from(message.content.matchAll(/[?&]expires=(\d+)/g)).some(match => Number(match[1]) * 1000 < Date.now() + 60000))) previous = null;
  const incremental = !!previous?.messages.length;
  let first: ConversationDetailData | undefined;
  const pages: MessageData[][] = [];
  const visited = new Set<string>();
  let cursor: string | null | undefined = incremental ? previous!.messages[previous!.messages.length - 1].id : undefined;
  do {
    const params = new URLSearchParams({ limit: "100" });
    if (cursor) params.set(incremental ? "after" : "before", cursor);
    const res = await fetch(`${API_BASE}${path}?${params}`, authenticated ? { headers: getHeaders() } : {});
    if (authenticated) handleAuthFailureIfNeeded(res);
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw Object.assign(new Error(typeof error.detail === "string" ? error.detail : "Sohbet yüklenemedi."), { status: res.status });
    }
    const page: ConversationDetailData = await res.json();
    first ??= page;
    pages.push(page.messages);
    cursor = page.next_cursor;
    if (cursor && visited.has(cursor)) throw new Error("Sohbet sayfalaması tamamlanamadı.");
    if (cursor) visited.add(cursor);
  } while (cursor);
  const incoming = (incremental ? pages : pages.reverse()).flat();
  const byId = new Map((incremental ? previous!.messages : []).map(message => [message.id, message]));
  incoming.forEach(message => byId.set(message.id, message));
  const ownSender = authenticated ? "owner" : "finder";
  const messages = Array.from(byId.values()).map(message => first?.read_through && message.sender_type === ownSender &&
    new Date(message.created_at).getTime() <= new Date(first.read_through).getTime() ? { ...message, is_read: true } : message);
  return { ...first!, messages, next_cursor: null };
}

export const itemsApi = {
  list: async (statusFilter?: string, searchQuery?: string): Promise<ItemData[]> => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
    if (searchQuery) params.append("search", searchQuery);

    return fetchListPages<ItemData>(`/items?${params.toString()}`, "Eşyalar yüklenemedi.");
  },

  get: async (itemId: string): Promise<ItemData> => {
    const res = await fetch(`${API_BASE}/items/${itemId}`, {
      headers: getHeaders(),
    });

    handleAuthFailureIfNeeded(res);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Eşya bulunamadı." }));
      throw new Error(err.detail || "Eşya bulunamadı.");
    }
    return res.json();
  },

  create: async (data: {
    name: string;
    category: string;
    description?: string;
    owner_display_name?: string;
    reward_text?: string;
    image_url?: string | null;
    show_name_to_finder?: boolean;
    show_desc_to_finder?: boolean;
    qr_color_dark?: string;
    qr_color_light?: string;
    qr_pattern_style?: string;
    qr_frame_type?: string;
    qr_frame_text?: string;
  }): Promise<ItemData> => {
    const res = await fetch(`${API_BASE}/items`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    handleAuthFailureIfNeeded(res);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Eşya oluşturulamadı." }));
      throw new Error(err.detail || "Eşya oluşturulamadı.");
    }
    return res.json();
  },

  update: async (
    itemId: string,
    data: {
      name?: string;
      category?: string;
      description?: string;
      owner_display_name?: string;
      reward_text?: string;
      image_url?: string | null;
      show_name_to_finder?: boolean;
      show_desc_to_finder?: boolean;
      qr_color_dark?: string;
      qr_color_light?: string;
      qr_pattern_style?: string;
      qr_frame_type?: string;
      qr_frame_text?: string;
    }
  ): Promise<ItemData> => {
    const res = await fetch(`${API_BASE}/items/${itemId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    handleAuthFailureIfNeeded(res);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Eşya güncellenemedi." }));
      throw new Error(err.detail || "Eşya güncellenemedi.");
    }
    return res.json();
  },

  updateStatus: async (itemId: string, newStatus: "safe" | "lost" | "resolved"): Promise<ItemData> => {
    const res = await fetch(`${API_BASE}/items/${itemId}/status`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });

    handleAuthFailureIfNeeded(res);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Durum güncellenemedi." }));
      throw new Error(err.detail || "Durum güncellenemedi.");
    }
    return res.json();
  },

  toggleActive: async (itemId: string): Promise<ItemData> => {
    const res = await fetch(`${API_BASE}/items/${itemId}/toggle-active`, {
      method: "PATCH",
      headers: getHeaders(),
    });

    handleAuthFailureIfNeeded(res);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Aktiflik durumu değiştirilemedi." }));
      throw new Error(err.detail || "Aktiflik durumu değiştirilemedi.");
    }
    return res.json();
  },

  delete: async (itemId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/items/${itemId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    handleAuthFailureIfNeeded(res);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Eşya silinemedi." }));
      throw new Error(err.detail || "Eşya silinemedi.");
    }
  },

  getStats: async (): Promise<DashboardStats> => {
    const res = await fetch(`${API_BASE}/dashboard/stats`, {
      headers: getHeaders(),
    });

    handleAuthFailureIfNeeded(res);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "İstatistikler alınamadı." }));
      throw new Error(err.detail || "İstatistikler alınamadı.");
    }
    return res.json();
  },
};

export const chatApi = {
  list: async (statusFilter?: string): Promise<ConversationData[]> => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

    return fetchListPages<ConversationData>(`/conversations?${params.toString()}`, "Konuşmalar yüklenemedi.");
  },

  getDetails: async (conversationId: string, previous?: ConversationDetailData | null): Promise<ConversationDetailData> => {
    return fetchConversationHistory(`/conversations/${conversationId}`, true, previous?.id === conversationId ? previous : null);
  },

  sendMessage: async (
    conversationId: string,
    content: string,
    location?: { lat?: number; lng?: number; address?: string }
  ): Promise<MessageData> => {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        content,
        location_lat: location?.lat,
        location_lng: location?.lng,
        location_address: location?.address,
      }),
    });

    handleAuthFailureIfNeeded(res);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Mesaj gönderilemedi." }));
      throw new Error(err.detail || "Mesaj gönderilemedi.");
    }
    return res.json();
  },

  updateStatus: async (
    conversationId: string,
    status: "active" | "closed" | "blocked" | "resolved"
  ): Promise<ConversationData> => {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/status`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });

    handleAuthFailureIfNeeded(res);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Konuşma durumu güncellenemedi." }));
      throw new Error(err.detail || "Konuşma durumu güncellenemedi.");
    }
    return res.json();
  },

  delete: async (conversationId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    handleAuthFailureIfNeeded(res);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Konuşma silinemedi." }));
      throw new Error(err.detail || "Konuşma silinemedi.");
    }
  },
};

export const getMediaUrl = (path?: string | null): string => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
  const rawApiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
  const backendBase = rawApiBase.startsWith("/")
    ? ""
    : rawApiBase.replace(/\/api\/v1\/?$/, "");
  return `${backendBase}${path.startsWith("/") ? "" : "/"}${path}`;
};

async function prepareUpload(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("JPG, PNG veya WebP fotoğraf seçin.");
  if (file.size > 20 * 1024 * 1024) throw new Error("Fotoğraf en fazla 20 MB olabilir.");
  if (file.size <= 3 * 1024 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 25_000_000) throw new Error("Fotoğrafın çözünürlüğü çok yüksek.");
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Fotoğraf işlenemedi.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      value => value ? resolve(value) : reject(new Error("Fotoğraf küçültülemedi.")), "image/webp", 0.8,
    ));
    if (blob.size > 3 * 1024 * 1024) throw new Error("Daha küçük bir fotoğraf seçin.");
    return new File([blob], "photo.webp", { type: blob.type });
  } finally { bitmap.close(); }
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  file = await prepareUpload(file);
  const form = new FormData(); form.append("file", file);
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/uploads`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
  handleAuthFailureIfNeeded(response);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || "Fotoğraf yüklenemedi.");
  return body;
}

export const publicApi = {
  getByQrCode: async (uniqueCode: string): Promise<PublicItemData> => {
    const res = await fetch(`${API_BASE}/public/q/${encodeURIComponent(uniqueCode)}`);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Eşya bilgisi bulunamadı." }));
      throw new Error(err.detail || "Eşya bilgisi bulunamadı.");
    }
    return res.json();
  },

  uploadImage: async (file: File): Promise<{ url: string }> => {
    file = await prepareUpload(file);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/public/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Fotoğraf yüklenemedi." }));
      throw new Error(err.detail || "Fotoğraf yüklenemedi.");
    }
    return res.json();
  },

  contactOwner: async (
    uniqueCode: string,
    data: {
      message: string;
      location_lat?: number;
      location_lng?: number;
      location_address?: string;
      approximate_city?: string;
      approximate_country?: string;
    }
  ): Promise<PublicContactResponse> => {
    const res = await fetch(`${API_BASE}/public/q/${encodeURIComponent(uniqueCode)}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Mesaj iletilemedi." }));
      throw new Error(err.detail || "Mesaj iletilemedi.");
    }
    return res.json();
  },

  getFinderConversation: async (sessionToken: string, previous?: ConversationDetailData | null): Promise<ConversationDetailData> => {
    return fetchConversationHistory(`/conversations/finder/${encodeURIComponent(sessionToken)}`, false, previous);
  },

  sendFinderMessage: async (
    sessionToken: string,
    content: string,
    location?: { lat?: number; lng?: number; address?: string }
  ): Promise<MessageData> => {
    const res = await fetch(`${API_BASE}/conversations/finder/${encodeURIComponent(sessionToken)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        location_lat: location?.lat,
        location_lng: location?.lng,
        location_address: location?.address,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Mesaj gönderilemedi." }));
      throw new Error(err.detail || "Mesaj gönderilemedi.");
    }
    return res.json();
  },
};

export const notificationsApi = {
  list: async (): Promise<NotificationData[]> => {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getHeaders(),
    });

    handleAuthFailureIfNeeded(res);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Bildirimler alınamadı." }));
      throw new Error(err.detail || "Bildirimler alınamadı.");
    }
    return res.json().catch(() => []);
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
      method: "PATCH",
      headers: getHeaders(),
    });

    handleAuthFailureIfNeeded(res);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Bildirim okundu olarak işaretlenemedi." }));
      throw new Error(err.detail || "Bildirim okundu olarak işaretlenemedi.");
    }
  },

  markAllAsRead: async (): Promise<void> => {
    const res = await fetch(`${API_BASE}/notifications/mark-all-read`, {
      method: "PATCH",
      headers: getHeaders(),
    });

    handleAuthFailureIfNeeded(res);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Bildirimler okundu olarak işaretlenemedi." }));
      throw new Error(err.detail || "Bildirimler okundu olarak işaretlenemedi.");
    }
  },
};

export const scansApi = {
  getItemScans: async (itemId: string): Promise<QRScanData[]> => {
    const res = await fetch(`${API_BASE}/scans/item/${itemId}`, {
      headers: getHeaders(),
    });

    handleAuthFailureIfNeeded(res);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Tarama geçmişi alınamadı." }));
      throw new Error(err.detail || "Tarama geçmişi alınamadı.");
    }
    return res.json().catch(() => []);
  },

  getRecent: async (limit: number = 20): Promise<QRScanData[]> => {
    const res = await fetch(`${API_BASE}/scans/recent?limit=${limit}`, {
      headers: getHeaders(),
    });

    handleAuthFailureIfNeeded(res);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Son taramalar alınamadı." }));
      throw new Error(err.detail || "Son taramalar alınamadı.");
    }
    return res.json().catch(() => []);
  },
};


