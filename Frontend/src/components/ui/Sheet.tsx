"use client";
import { ReactNode, useId } from "react";
import { useDialog } from "@/lib/useDialog";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const titleId = useId();
  const panel = useDialog(open, onClose);
  if (!open || typeof document === "undefined") return null;
  return createPortal(<div className="sheet-backdrop app-shell" onClick={onClose}>
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="sheet-panel" onClick={event => event.stopPropagation()}>
      <div className="sheet-handle" aria-hidden="true" />
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-ink/10">
        <h2 id={titleId} className="text-lg font-extrabold">{title}</h2>
        <button type="button" className="app-icon-button" onClick={onClose} aria-label="Kapat"><X size={20} /></button>
      </header><div className="sheet-content">{children}</div>
    </div></div>, document.body);
}
