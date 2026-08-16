import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import type { ReactNode } from "react";

import { FeedbackFab } from "@/components/feedback-fab";
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
  // Kept under ~155 characters of *useful* text, because that is roughly where
  // Google truncates: the previous 239-character version spent its tail on
  // "plain-language explanations and a daily quiz. For Indian law students and
  // judiciary aspirants" — copy no searcher ever saw. The corpus count and the
  // named acts are front-loaded instead, since naming only seven of 36 acts
  // made the site invisible for queries it answers well (the same undersell
  // D-032 found in /cite's coverage line).
  description:
    "36 Indian bare acts, free: the official IPC→BNS, CrPC→BNSS and Evidence→BSA mapping, plus the Constitution, Contract Act, CPC, NI, POCSO, Hindu Marriage, Limitation and more — full section text.",
  keywords: [
    "IPC to BNS",
    "CrPC to BNSS",
    "Indian Evidence Act to BSA",
    "bare acts",
    "new criminal laws India",
    "judiciary exam preparation",
    "Constitution of India",
    "Indian Contract Act",
    "Code of Civil Procedure",
    "Negotiable Instruments Act",
    "POCSO Act",
    "Hindu Marriage Act",
    "Limitation Act",
    "Motor Vehicles Act",
  ],
  openGraph: {
    type: "website",
    siteName: "Vidhara",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image" },
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
        <FeedbackFab />
      </body>
    </html>
  );
}
