"use client";

import { ReactNode, useSyncExternalStore } from "react";

const desktopQuery = "(min-width: 768px)";
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const getSnapshot = () => window.matchMedia(desktopQuery).matches;
const getServerSnapshot = () => null;

/** Mount only the active layout, so hidden pages cannot open duplicate connections or forms. */
export function ResponsiveAccountPage({ desktop, mobile }: { desktop: ReactNode; mobile: ReactNode }) {
  const isDesktop = useSyncExternalStore<boolean | null>(subscribe, getSnapshot, getServerSnapshot);
  if (isDesktop === null) return <div className="min-h-screen dot-grid-pattern flex items-center justify-center"><p role="status" className="text-sm text-ink-soft">Yükleniyor…</p></div>;
  return isDesktop ? desktop : mobile;
}
