"use client";
import { Dispatch, SetStateAction } from "react";
import { CUSTOM_QR_DESIGNS } from "@/components/ui/DynamicQrRenderer";
import { ItemData } from "./api";
import { useResponsiveState } from "./responsiveState";

export const EMPTY_STUDIO_FORM = {
  name: "", category: "Kişisel Eşya", owner: "", note: "", showName: true, showNote: true,
  design: CUSTOM_QR_DESIGNS[0].id, foreground: CUSTOM_QR_DESIGNS[0].fgColor,
  background: CUSTOM_QR_DESIGNS[0].bgColor, label: "BENİ TARA",
};
export type StudioForm = typeof EMPTY_STUDIO_FORM;

export function useStudioDraft(id: string | null) {
  const key = `studio:${id || "new"}`;
  const [form, setForm] = useResponsiveState(key + ":form", EMPTY_STUDIO_FORM);
  const [item, setItem] = useResponsiveState<ItemData | null>(key + ":item", null);
  const [step, setStep] = useResponsiveState(key + ":step", 0);
  const [saving, setSaving] = useResponsiveState(key + ":saving", false);
  function field<K extends keyof StudioForm>(name: K): [StudioForm[K], Dispatch<SetStateAction<StudioForm[K]>>] {
    return [form[name], next => setForm(previous => ({ ...previous, [name]: typeof next === "function"
      ? (next as (value: StudioForm[K]) => StudioForm[K])(previous[name]) : next }))];
  }
  return { form, setForm, item, setItem, step, setStep, saving, setSaving, field };
}
