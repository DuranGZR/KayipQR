"use client";
import dynamic from "next/dynamic";
import { ResponsiveAccountPage } from "@/components/dashboard/ResponsiveAccountPage";
const DesktopPage = dynamic(() => import("@/components/dashboard/desktop/DashboardPage"));
const MobilePage = dynamic(() => import("@/components/dashboard/mobile/DashboardPage"));
export default function DashboardPage() { return <ResponsiveAccountPage desktop={<DesktopPage />} mobile={<MobilePage />} />; }
