import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import type { ReactNode } from "react";

import { FeedbackFab } from "@/components/feedback-fab";
import { SiteFooter, SiteHeader, SkipLink } from "@/components/site-chrome";
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

/**
 * Who this site is and how to search it, said once for the whole domain.
 *
 * `WebSite` + `SearchAction` is what a sitelinks search box is built from — for
 * a corpus where the query is nearly always a section reference, being
 * searchable from the result itself is worth more than any single page's
 * ranking. `Organization` gives the brand an entity to attach to, so "Vidhara"
 * resolves to a thing rather than to a word that happens to appear in some
 * titles. Both are on every page because Google reads them per page, and the
 * pages people land on are section pages, not the homepage.
 */
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Vidhara",
      inLanguage: "en-IN",
      description:
        "Indian bare acts, section by section, with the official IPC→BNS, CrPC→BNSS and Evidence→BSA mapping.",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Vidhara",
      url: SITE_URL,
      description:
        "A free, verified reference for Indian central legislation, built by Bahukhandi Labs.",
      parentOrganization: { "@type": "Organization", name: "Bahukhandi Labs" },
      areaServed: { "@type": "Country", name: "India" },
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // lang is en-IN, not en: the corpus is Indian legislation, its spelling and
    // citation conventions are Indian, and the audience searches from India.
    <html
      lang="en-IN"
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <AnalyticsProvider />
        <SkipLink />
        <SiteHeader />
        {children}
        <SiteFooter />
        <FeedbackFab />
      </body>
    </html>
  );
}
