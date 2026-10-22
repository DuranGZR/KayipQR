"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function usePagedList<T extends { id: string }>(key: string, fetchPage: (offset: number) => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const source = useRef(fetchPage); source.current = fetchPage;
  const generation = useRef(0);
  const count = useRef(0);
  const busy = useRef(false);
  const refresh = useCallback(async (silent = false) => {
    const version = ++generation.current;
    if (!silent) setLoading(true);
    try {
      // Refresh only pages explicitly opened by the user, never the whole account.
      const visiblePages = silent ? Math.max(1, Math.ceil(count.current / 20)) : 1;
      const pages = await Promise.all(Array.from({ length: visiblePages }, (_, index) => source.current(index * 20)));
      if (version !== generation.current) return;
      const records = pages.flat();
      setItems(Array.from(new Map(records.map(item => [item.id, item])).values()));
      count.current = records.length;
      setHasMore(pages[pages.length - 1].length === 20);
      setError("");
    } catch (cause) { if (version === generation.current) setError((cause as Error).message); }
    finally { if (version === generation.current) setLoading(false); }
  }, []);
  useEffect(() => {
    setItems([]); count.current = 0; setError(""); setHasMore(false);
    setLoading(true);
    const timer = setTimeout(() => refresh(), 250);
    return () => { clearTimeout(timer); generation.current++; };
  }, [key, refresh]);
  const loadMore = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; setLoadingMore(true);
    const version = generation.current;
    try {
      const page = await source.current(count.current);
      if (version !== generation.current) return;
      count.current += page.length;
      setItems(previous => Array.from(new Map([...previous, ...page].map(item => [item.id, item])).values()));
      setHasMore(page.length === 20); setError("");
    } catch (cause) { if (version === generation.current) setError((cause as Error).message); }
    finally { busy.current = false; setLoadingMore(false); }
  }, []);
  return { items, setItems, loading, error, hasMore, loadingMore, refresh, loadMore };
}
