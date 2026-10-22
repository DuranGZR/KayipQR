"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { notificationsApi, getAuthToken } from "./api";
import { usePagedList } from "./usePagedList";
import { startVisiblePolling } from "./visiblePolling";
import { decodeHtmlEntities } from "./utils";

export function useNotifications() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const seen = useRef<Set<string> | null>(null);
  const page = usePagedList(String(unreadOnly), offset => notificationsApi.list(offset, unreadOnly));
  const count = useCallback(async () => {
    if (!getAuthToken()) return;
    try { setUnreadCount(await notificationsApi.unreadCount()); setActionError(""); }
    catch (cause) { setActionError((cause as Error).message); }
  }, []);
  useEffect(() => startVisiblePolling(async () => { await count(); await page.refresh(true); }, 60000, false), [count, page.refresh]);
  useEffect(() => { count(); }, [count]);
  useEffect(() => {
    if (page.loading || page.error) return;
    // Only the latest page can trigger an alert; loading history must stay quiet.
    const latest = page.items.slice(0, 20);
    if (seen.current && !unreadOnly && "Notification" in window && Notification.permission === "granted") {
      latest.forEach(item => { if (!item.is_read && !seen.current!.has(item.id)) {
        try { new Notification(decodeHtmlEntities(item.title), { body: decodeHtmlEntities(item.body) }); } catch {}
      } });
    }
    seen.current = new Set([...(seen.current || []), ...page.items.map(item => item.id)]);
  }, [page.items, page.loading, page.error, unreadOnly]);
  const mark = async (id?: string) => {
    if (busy) return false;
    setBusy(true);
    try {
      if (id) await notificationsApi.markAsRead(id); else await notificationsApi.markAllAsRead();
      await Promise.all([page.refresh(), count()]);
      return true;
    } catch (cause) { setActionError((cause as Error).message); return false; }
    finally { setBusy(false); }
  };
  return { ...page, error: page.error || actionError, unreadOnly, setUnreadOnly, unreadCount, busy, mark,
    reload: async () => { await Promise.all([page.refresh(), count()]); } };
}
