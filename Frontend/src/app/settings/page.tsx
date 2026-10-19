"use client";
import dynamic from "next/dynamic";
import { ResponsiveAccountPage } from "@/components/dashboard/ResponsiveAccountPage";
const DesktopPage = dynamic(() => import("@/components/dashboard/desktop/SettingsPage"));
const MobilePage = dynamic(() => import("@/components/dashboard/mobile/SettingsPage"));
export default function SettingsPage() { return <ResponsiveAccountPage desktop={<DesktopPage />} mobile={<MobilePage />} />; }
