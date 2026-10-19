"use client";
import dynamic from "next/dynamic";
import { ResponsiveAccountPage } from "@/components/dashboard/ResponsiveAccountPage";
const DesktopPage = dynamic(() => import("@/components/dashboard/desktop/MessagesPage"));
const MobilePage = dynamic(() => import("@/components/dashboard/mobile/MessagesPage"));
export default function MessagesPage() { return <ResponsiveAccountPage desktop={<DesktopPage />} mobile={<MobilePage />} />; }
