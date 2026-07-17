import Link from "next/link";
import type { ReactNode } from "react";

import { MobileNav } from "@/components/mobile-nav";
import { NAV_LINKS } from "@/lib/nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-content items-center justify-between px-5 sm:px-6">
        <Link
          href="/"
          className="font-serif text-h3 font-semibold tracking-tight text-text transition-opacity hover:opacity-80">
          Vidhara
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-small font-medium text-text-muted transition-colors hover:text-text">
              {link.label}
            </Link>
          ))}
          <span className="rounded-md bg-brand px-3 py-1.5 text-small font-medium text-on-brand">
            Coming to Google Play
          </span>
        </nav>

        <MobileNav />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-content flex-col gap-6 px-5 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <p className="font-serif text-h3 font-semibold text-text">Vidhara</p>
          <p className="mt-2 text-small text-text-muted">
            Bare acts and the official old⇄new criminal-law mapping, built for Indian law students
            and judiciary aspirants. Free, no sign-up.
          </p>
        </div>

        <nav className="flex flex-col gap-2" aria-label="Footer">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-small text-text-muted transition-colors hover:text-text">
              {link.label}
            </Link>
          ))}
          <Link href="/privacy" className="text-small text-text-muted transition-colors hover:text-text">
            Privacy
          </Link>
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-content px-5 py-5 sm:px-6">
          <p className="text-micro text-text-faint">
            ⚖️ Reference only — verify against the official Gazette of India. Not legal advice. ·{" "}
            {new Date().getFullYear()} Vidhara · a Bahukhandi Labs project
          </p>
        </div>
      </div>
    </footer>
  );
}

/** Standard content column for SEO pages. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-content flex-1 px-5 py-10 sm:px-6">{children}</main>
  );
}
