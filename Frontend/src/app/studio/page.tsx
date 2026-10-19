"use client";
import dynamic from "next/dynamic";
import { ResponsiveAccountPage } from "@/components/dashboard/ResponsiveAccountPage";
const DesktopPage = dynamic(() => import("@/components/dashboard/desktop/StudioPage"));
const MobilePage = dynamic(() => import("@/components/dashboard/mobile/StudioPage"));
export default function StudioPage() { return <ResponsiveAccountPage desktop={<DesktopPage />} mobile={<MobilePage />} />; }
