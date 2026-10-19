"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, Info, X, Sparkles } from "lucide-react";
import { WobblyCardFrame, WobblyBoxFrame } from "./SketchBorders";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    custom: (item: Omit<ToastItem, "id">) => void;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((item: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { ...item, id };
    
    setToasts((prev) => [...prev.slice(-4), newToast]); // Keep at most 5 toasts

    const duration = item.duration || 4000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const toastMethods = {
    success: (message: string, title?: string) => addToast({ type: "success", message, title }),
    error: (message: string, title?: string) => addToast({ type: "error", message, title }),
    info: (message: string, title?: string) => addToast({ type: "info", message, title }),
    warning: (message: string, title?: string) => addToast({ type: "warning", message, title }),
    custom: addToast,
  };

  return (
    <ToastContext.Provider value={{ toast: toastMethods }}>
      {children}

      {/* Floating Toast Portal Container */}
      <div aria-live="polite" aria-atomic="false" className="fixed top-[calc(72px+env(safe-area-inset-top))] md:top-auto md:bottom-5 inset-x-4 md:left-auto md:right-5 z-[110] flex flex-col gap-2.5 md:max-w-sm pointer-events-none">
        {toasts.map((t) => {
          const isSuccess = t.type === "success";
          const isError = t.type === "error";
          const isWarning = t.type === "warning";

          const Icon = isSuccess
            ? CheckCircle2
            : isError
            ? AlertTriangle
            : isWarning
            ? AlertTriangle
            : Info;

          return (
            <div
              key={t.id}
              className={`pointer-events-none relative p-3.5 sm:p-4 rounded-2xl shadow-xl transition-all duration-300 animate-in slide-in-from-bottom-3 fade-in ${
                isSuccess
                  ? "bg-[#F0FDF4] border border-emerald-300 text-emerald-950"
                  : isError
                  ? "bg-[#FEF2F2] border border-rose-300 text-rose-950"
                  : isWarning
                  ? "bg-[#FFFBEB] border border-amber-300 text-amber-950"
                  : "bg-paper-card border border-ink/25 text-ink"
              }`}
            >
              <WobblyCardFrame
                stroke={
                  isSuccess
                    ? "#059669"
                    : isError
                    ? "#DC2626"
                    : isWarning
                    ? "#D97706"
                    : "#33302B"
                }
                strokeWidth={1.4}
              />

              <div className="relative z-10 flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    isSuccess
                      ? "bg-emerald-200/80 text-emerald-800"
                      : isError
                      ? "bg-rose-200/80 text-rose-800"
                      : isWarning
                      ? "bg-amber-200/80 text-amber-800"
                      : "bg-gold text-ink"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 pr-2">
                  {t.title && (
                    <h5 className="font-bold text-xs leading-tight mb-0.5">
                      {t.title}
                    </h5>
                  )}
                  <p className="text-xs font-medium leading-relaxed">
                    {t.message}
                  </p>
                </div>

                <button
                  onClick={() => removeToast(t.id)}
                  className="w-6 h-6 rounded-full hover:bg-black/5 flex items-center justify-center text-ink-soft shrink-0"
                  aria-label="Bildirimi kapat"
                  style={{ pointerEvents: "auto" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context.toast;
}
