"use client";
import { useEffect } from "react";
export function useVisualViewport(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const viewport = window.visualViewport;
    const update = () => {
      document.documentElement.style.setProperty("--chat-height", `${viewport?.height || window.innerHeight}px`);
      document.documentElement.style.setProperty("--chat-top", `${viewport?.offsetTop || 0}px`);
    };
    update(); viewport?.addEventListener("resize", update); viewport?.addEventListener("scroll", update); window.addEventListener("resize", update);
    return () => { viewport?.removeEventListener("resize", update); viewport?.removeEventListener("scroll", update); window.removeEventListener("resize", update); document.documentElement.style.removeProperty("--chat-height"); document.documentElement.style.removeProperty("--chat-top"); };
  }, [enabled]);
}
