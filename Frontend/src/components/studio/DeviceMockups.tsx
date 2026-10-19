"use client";

import React from "react";
import { Sparkles, Laptop, Luggage, Heart, Smartphone } from "lucide-react";

interface MockupProps {
  children: React.ReactNode;
  activeTab: "sticker" | "macbook" | "luggage" | "pet" | "airpods";
}

export const DeviceMockupsContainer: React.FC<MockupProps> = ({ children, activeTab }) => {
  if (activeTab === "sticker") {
    return <div className="w-full flex items-center justify-center p-2">{children}</div>;
  }

  if (activeTab === "macbook") {
    return (
      <div className="w-full max-w-[440px] mx-auto py-4 select-none">
        {/* MacBook Lid Mockup */}
        <div className="relative aspect-[16/10] bg-gradient-to-br from-[#2D2A2E] via-[#242226] to-[#181719] rounded-[22px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)_inset] flex items-center justify-center overflow-hidden border border-white/10">
          
          {/* Subtle aluminum brushed highlight */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent pointer-events-none" />

          {/* Minimal Apple Logo Silhouette in center-top */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none">
            <svg className="w-6 h-6 fill-white" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.7-7.92-12-14.64-5.87-9.14-10.37-19.7-13.48-31.67-3.11-11.97-4.67-23.2-4.67-33.68 0-14.15 3.57-26 10.7-35.54 7.13-9.54 16.38-14.42 27.75-14.65 4.58 0 9.8 1.2 15.68 3.6 5.88 2.4 9.49 3.67 10.83 3.8 2.4-.41 6.21-1.78 11.44-4.1 5.23-2.33 10.15-3.4 14.76-3.23 8.27.38 15.71 2.93 22.32 7.64 6.61 4.71 11.22 11.06 13.83 19.04-12.41 7.51-18.49 17.65-18.23 30.43.26 10.02 4.09 18.34 11.49 24.96 7.4 6.62 16.14 10.33 26.23 11.13-2.29 6.84-4.8 13.06-7.53 18.66zM119.22 31.84c0-7.39 2.66-14.28 7.97-20.67 5.31-6.39 11.87-10.42 19.68-12.09.22 1.3.33 2.5.33 3.6 0 7.39-2.78 14.43-8.33 21.13-5.55 6.7-12.28 10.66-20.19 11.88-.33-1.3-.46-2.6-.46-3.85z" />
            </svg>
          </div>

          {/* Applied Sticker on MacBook */}
          <div className="relative z-10 transform scale-[0.80] sm:scale-[0.88] hover:scale-[0.92] transition-transform duration-300 drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]">
            {children}
          </div>

          {/* Laptop Hinge Bottom Bar */}
          <div className="absolute bottom-0 inset-x-0 h-2 bg-gradient-to-r from-[#181719] via-[#3A373D] to-[#181719] border-t border-white/5" />
        </div>

        <div className="text-center text-[11px] font-bold text-ink-soft mt-3 flex items-center justify-center gap-1.5">
          <Laptop className="w-3.5 h-3.5 text-gold-dark" />
          <span>Space Gray MacBook Pro Arka Kapak Simülasyonu</span>
        </div>
      </div>
    );
  }

  if (activeTab === "luggage") {
    return (
      <div className="w-full max-w-[440px] mx-auto py-4 select-none">
        {/* Ribbed Polycarbonate Rimowa Luggage Mockup */}
        <div className="relative aspect-[16/11] bg-[#1E2022] rounded-[24px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.45)] flex items-center justify-center overflow-hidden border-2 border-[#323639]">
          
          {/* Vertical Ribbed Luggage Grooves */}
          <div className="absolute inset-0 flex justify-between px-6 opacity-30 pointer-events-none">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="w-3 h-full bg-gradient-to-r from-black/60 via-white/10 to-black/60" />
            ))}
          </div>

          {/* Luggage Reinforced Corner Plate */}
          <div className="absolute top-2 left-2 w-8 h-8 rounded-tl-xl border-t-2 border-l-2 border-zinc-500 opacity-60 pointer-events-none" />
          <div className="absolute top-2 right-2 w-8 h-8 rounded-tr-xl border-t-2 border-r-2 border-zinc-500 opacity-60 pointer-events-none" />

          {/* Hanging Luggage Tag / Sticker */}
          <div className="relative z-10 transform scale-[0.82] sm:scale-[0.90] hover:scale-[0.94] transition-transform duration-300 drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)]">
            {children}
          </div>
        </div>

        <div className="text-center text-[11px] font-bold text-ink-soft mt-3 flex items-center justify-center gap-1.5">
          <Luggage className="w-3.5 h-3.5 text-gold-dark" />
          <span>Rimowa Kabin Boy Seyahat Valizi Simülasyonu</span>
        </div>
      </div>
    );
  }

  if (activeTab === "pet") {
    return (
      <div className="w-full max-w-[440px] mx-auto py-4 select-none">
        {/* Leather Pet Collar Mockup */}
        <div className="relative aspect-[16/11] bg-gradient-to-b from-[#F2ECE1] to-[#E5DCB] rounded-[24px] p-6 shadow-xl flex flex-col items-center justify-center overflow-hidden border border-ink/15">
          
          {/* Horizontal Stitched Tan Leather Band */}
          <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-16 bg-gradient-to-r from-[#6B3E19] via-[#854D20] to-[#6B3E19] shadow-md flex items-center justify-between px-4 border-y-2 border-[#522F13]">
            <div className="w-full h-[1px] border-b border-dashed border-amber-200/50" />
          </div>

          {/* Brass Collar Ring & Rivet */}
          <div className="relative z-10 w-9 h-9 rounded-full border-[3px] border-amber-500 bg-amber-200/20 shadow-md flex items-center justify-center mb-[-12px]">
            <div className="w-4 h-4 rounded-full border-2 border-amber-600 bg-transparent" />
          </div>

          {/* Hanging Collar Badge / Medallion */}
          <div className="relative z-20 transform scale-[0.80] sm:scale-[0.88] hover:scale-[0.92] transition-transform duration-300 drop-shadow-[0_16px_32px_rgba(0,0,0,0.25)]">
            {children}
          </div>
        </div>

        <div className="text-center text-[11px] font-bold text-ink-soft mt-3 flex items-center justify-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-rose-600" />
          <span>Dikişli Deri Evcil Hayvan Tasma Madalyonu Simülasyonu</span>
        </div>
      </div>
    );
  }

  if (activeTab === "airpods") {
    return (
      <div className="w-full max-w-[440px] mx-auto py-4 select-none">
        {/* AirPods Pro Glossy White Case Mockup */}
        <div className="relative aspect-[16/11] bg-gradient-to-b from-[#EBE6DC] to-[#DDD5C7] rounded-[24px] p-6 shadow-xl flex items-center justify-center overflow-hidden border border-ink/15">
          
          {/* White Glossy Case Body */}
          <div className="relative w-56 h-44 bg-white rounded-[42px] shadow-[0_16px_40px_rgba(0,0,0,0.18),0_1px_2px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center p-4 border border-zinc-200">
            {/* Case Lid Cutout Line */}
            <div className="absolute top-12 inset-x-0 h-[1px] bg-zinc-300" />
            
            {/* LED Status Light Indicator */}
            <div className="absolute top-[54px] w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10B981]" />

            {/* Nano Sticker on Case */}
            <div className="relative z-10 mt-6 transform scale-[0.70] sm:scale-[0.76] hover:scale-[0.80] transition-transform duration-300 drop-shadow-md">
              {children}
            </div>
          </div>
        </div>

        <div className="text-center text-[11px] font-bold text-ink-soft mt-3 flex items-center justify-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
          <span>AirPods & Küçük Aksesuar Nano Sticker Simülasyonu</span>
        </div>
      </div>
    );
  }

  return <div>{children}</div>;
};
