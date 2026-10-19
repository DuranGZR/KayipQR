"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ResponsiveAccountPage } from "@/components/dashboard/ResponsiveAccountPage";
const MobileDetail = dynamic(() => import("@/components/dashboard/mobile/ItemDetailPage"));
function DesktopDetail() {
  const params = useParams(); const router = useRouter();
  useEffect(() => { router.replace("/dashboard?item=" + encodeURIComponent(String(params.id))); }, [params.id, router]);
  return <p role="status" className="p-8 text-sm text-ink-soft">Eşya açılıyor…</p>;
}
export default function ItemDetailPage() { return <ResponsiveAccountPage desktop={<DesktopDetail />} mobile={<MobileDetail />} />; }
