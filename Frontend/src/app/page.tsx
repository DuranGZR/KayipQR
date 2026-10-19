import React from "react";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeatureBento } from "@/components/landing/FeatureBento";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen dot-grid-pattern text-ink">
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <FeatureBento />
      <UseCasesSection />
      <ComparisonSection />
      <FaqSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
