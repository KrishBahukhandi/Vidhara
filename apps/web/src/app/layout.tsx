import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import type { ReactNode } from "react";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { AnalyticsProvider } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Bundled per design.md: serif for statute text, Inter for UI, JetBrains Mono
// for section numbers + citations. Exposed as CSS variables that the web
// tailwind config maps onto font-serif/-sans/-mono (literal families stay as
// fallbacks). `display: swap` so text is never invisible while fonts load.
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Vidhara — India's legal learning platform",
    template: "%s · Vidhara",
  },
  description:
    "Bare acts, IPC⇄BNS · CrPC⇄BNSS · Evidence⇄BSA mapping, and an AI legal tutor — built for Indian law students, judiciary aspirants, and advocates.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        {/* No-JS / crawler fallback: scroll-reveal targets must never stay
            hidden at opacity 0 if the observer never runs. */}
        <noscript>
          <style>{`.reveal{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body className="flex min-h-screen flex-col font-sans">
        <AnalyticsProvider />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
