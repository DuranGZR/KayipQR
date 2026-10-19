// Pause hidden/offline tabs, prevent overlapping requests, refresh on return.
export function startVisiblePolling(task: () => Promise<unknown>, delay: number, immediate = true) {
  let stopped = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout>;
  const refresh = async () => {
    clearTimeout(timer);
    if (stopped || running) return;
    if (!document.hidden && navigator.onLine) {
      running = true;
      try { await task(); } catch { /* Callers own their error UI. */ }
      finally { running = false; }
    }
    if (!stopped) timer = setTimeout(refresh, delay);
  };
  const resume = () => { if (!document.hidden) void refresh(); };
  if (immediate) void refresh(); else timer = setTimeout(refresh, delay);
  document.addEventListener("visibilitychange", resume);
  window.addEventListener("online", resume);
  return () => {
    stopped = true; clearTimeout(timer);
    document.removeEventListener("visibilitychange", resume);
    window.removeEventListener("online", resume);
  };
}
