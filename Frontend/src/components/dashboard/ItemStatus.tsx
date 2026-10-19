import { Check, Flag, CheckCheck } from "lucide-react";
export const itemStates = {
  safe: { label: "Güvende", hint: "Eşyan yanında, QR’ın hazır.", color: "bg-[#e8eee2] text-[#47623b]", Icon: Check },
  lost: { label: "Kayıp", hint: "Bulan kişiler sana mesaj gönderebilir.", color: "bg-[#fbe5d5] text-[#a24a23]", Icon: Flag },
  resolved: { label: "Teslim alındı", hint: "Eşyan sana geri döndü.", color: "bg-[#e3edea] text-[#1E7E75]", Icon: CheckCheck },
};
export function ItemStatus({ status }: { status: keyof typeof itemStates }) {
  const state = itemStates[status];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${state.color}`}><state.Icon size={13} />{state.label}</span>;
}
