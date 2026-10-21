import { publicMetadata, SITE_DESCRIPTION, SITE_URL } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { GuideLinks } from "@/components/guides/GuideLinks";
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

export const metadata = publicMetadata("Ücretsiz Kayıp Eşya QR Etiketi Oluştur", SITE_DESCRIPTION, "/");

export default function Home() {
  return (
    <main className="min-h-screen dot-grid-pattern text-ink">
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [
        { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "KayıpQR", url: SITE_URL, inLanguage: "tr-TR", description: SITE_DESCRIPTION },
        { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "KayıpQR", url: SITE_URL, logo: `${SITE_URL}/icon.png` },
      ] }} />
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <FeatureBento />
      <UseCasesSection />
      <ComparisonSection />
      <GuideLinks />
      <FaqSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
