"use client";
import { createContext, Dispatch, ReactNode, SetStateAction, useCallback, useContext, useRef, useState } from "react";

type Drafts = Record<string, unknown>;
const DraftContext = createContext<{ values: Drafts; setValues: Dispatch<SetStateAction<Drafts>> } | null>(null);

// Lives above the responsive switch and disappears on route exit. No form or
// password data is written to persistent browser storage.
export function ResponsiveDraftProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Drafts>({});
  return <DraftContext.Provider value={{ values, setValues }}>{children}</DraftContext.Provider>;
}

export function useResponsiveState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const context = useContext(DraftContext);
  const [fallback, setFallback] = useState(initial);
  const initialRef = useRef(initial);
  const setValues = context?.setValues;
  const setValue: Dispatch<SetStateAction<T>> = useCallback(next => {
    if (!setValues) { setFallback(next); return; }
    setValues(previous => {
      const current = key in previous ? previous[key] as T : initialRef.current;
      const updated = typeof next === "function" ? (next as (value: T) => T)(current) : next;
      return Object.is(current, updated) ? previous : { ...previous, [key]: updated };
    });
  }, [key, setValues]);
  const value = context ? (key in context.values ? context.values[key] as T : initial) : fallback;
  return [value, setValue];
}
