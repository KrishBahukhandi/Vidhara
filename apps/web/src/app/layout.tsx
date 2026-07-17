import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import type { ReactNode } from "react";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { AnalyticsProvider } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Bundled per design.md: serif for statute text, Inter for UI. Exposed as CSS
// variables that the web tailwind config maps onto the token preset's
// font-serif/font-sans (the preset's literal family names stay as fallbacks).
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

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
    <html lang="en" suppressHydrationWarning className={`${serif.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
        <AnalyticsProvider />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
