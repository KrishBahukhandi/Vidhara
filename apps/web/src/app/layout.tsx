import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NexLex — India's legal learning platform",
    template: "%s · NexLex",
  },
  description:
    "Bare acts, IPC⇄BNS · CrPC⇄BNSS · Evidence⇄BSA mapping, and an AI legal tutor — built for Indian law students, judiciary aspirants, and advocates.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
