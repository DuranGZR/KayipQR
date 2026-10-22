"use client";

export function OlderMessages({ hasMore, loading, error, load, english = false }: {
  hasMore: boolean; loading: boolean; error: string; load: () => Promise<void>; english?: boolean;
}) {
  if (!hasMore) return null;
  return <div className="text-center py-2">
    <button type="button" disabled={loading} onClick={() => void load()}
      className="text-xs font-bold underline underline-offset-4 min-h-10 px-4 disabled:opacity-60">
      {loading ? (english ? "Loading…" : "Yükleniyor…") : (english ? "Load earlier messages" : "Önceki mesajları yükle")}
    </button>
    {error && <p role="alert" className="text-xs text-red-700">{english ? "Messages could not be loaded. Please try again." : error}</p>}
  </div>;
}
