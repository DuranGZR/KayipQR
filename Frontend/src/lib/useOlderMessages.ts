"use client";
import { Dispatch, SetStateAction, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ConversationDetailData, mergeChatDetails } from "./api";

export function useOlderMessages(
  conversation: ConversationDetailData | null,
  setConversation: Dispatch<SetStateAction<ConversationDetailData | null>>,
  fetchOlder: (cursor: string) => Promise<ConversationDetailData>,
) {
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef(conversation);
  latest.current = conversation;
  const inFlight = useRef(false);
  const lastScrollTop = useRef(0);
  const anchor = useRef<{ id: string; height: number; top: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setError(""); lastScrollTop.current = 0; }, [conversation?.id]);

  useLayoutEffect(() => {
    const position = anchor.current;
    const element = container.current;
    if (position && element && position.id === conversation?.id) {
      element.scrollTop = position.top + element.scrollHeight - position.height;
    }
    anchor.current = null;
  }, [conversation?.id, conversation?.messages[0]?.id]);

  const load = useCallback(async () => {
    const current = latest.current;
    if (!current?.next_cursor || inFlight.current) return;
    inFlight.current = true;
    setLoading(true); setError("");
    try {
      const page = await fetchOlder(current.next_cursor);
      if (latest.current?.id !== current.id || page.id !== current.id) return;
      if (page.next_cursor === current.next_cursor) throw new Error("Mesajlar yüklenemedi. Tekrar deneyin.");
      const element = container.current;
      if (element) anchor.current = { id: current.id, height: element.scrollHeight, top: element.scrollTop };
      setConversation(previous => previous?.id === current.id ? mergeChatDetails(previous, page, true) : previous);
    } catch (cause) {
      if (latest.current?.id === current.id) setError((cause as Error).message);
    } finally { inFlight.current = false; setLoading(false); }
  }, [fetchOlder, setConversation]);

  const onScroll = () => {
    const element = container.current;
    if (!element) return;
    const movingUp = element.scrollTop < lastScrollTop.current;
    lastScrollTop.current = element.scrollTop;
    // Initial scroll-to-bottom and layout changes must not drain older pages.
    if (movingUp && element.scrollTop < 80 && !error) void load();
  };

  return { container, loading, error, load, onScroll };
}
