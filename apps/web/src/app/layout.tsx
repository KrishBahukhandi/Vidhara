import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "NexLex — India's legal learning platform",
  description:
    "Bare acts, IPC⇄BNS · CrPC⇄BNSS · Evidence⇄BSA mapping, and an AI legal tutor — built for Indian law students, judiciary aspirants, and advocates.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
