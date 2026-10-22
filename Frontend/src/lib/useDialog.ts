"use client";
import { useEffect, useRef } from "react";

/** Keeps existing desktop frames while giving dialogs a single keyboard contract. */
export function useDialog(open: boolean, close: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close); closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focus = () => panel.current?.focus();
    const timer = requestAnimationFrame(focus);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const elements = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]') || []).filter(el => el.getClientRects().length > 0);
      const first = elements[0], last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
    };
    const trap = (event: FocusEvent) => { if (panel.current && !panel.current.contains(event.target as Node)) focus(); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", trap);
    return () => {
      cancelAnimationFrame(timer); document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey); document.removeEventListener("focusin", trap);
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return panel;
}
