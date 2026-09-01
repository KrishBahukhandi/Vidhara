import Link from "next/link";
import type { ReactNode } from "react";

import { AccountLink } from "@/components/account-link";
import { MobileNav } from "@/components/mobile-nav";
import { NavLink } from "@/components/nav-link";
import { SearchPalette } from "@/components/search-palette";
import { MAIN_CONTENT_ID, NAV_LINKS } from "@/lib/nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-content items-center justify-between px-5 sm:px-6">
        <Link
          href="/"
          className="font-serif text-h3 font-semibold tracking-tight text-text transition-opacity hover:opacity-80">
          Vidhara
        </Link>

        {/* Search sits outside the nav list: it is not a destination, it is the
            way to every destination, and on a corpus whose every ranking query
            is a section lookup it is the most-used control on the page. */}
        <div className="ml-auto mr-3 flex items-center md:ml-0 md:mr-0 md:order-2">
          <SearchPalette />
        </div>

        <nav className="hidden items-center gap-6 md:flex md:order-3" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              className="text-small font-medium text-text-muted transition-colors hover:text-text"
              activeClassName="!text-text underline decoration-brand decoration-2 underline-offset-8">
              {link.label}
            </NavLink>
          ))}
          <AccountLink className="text-small font-medium text-text-muted transition-colors hover:text-text" />
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
          {/* Advocate track (D-028): reachable, but deliberately out of the
              primary nav so the student/aspirant message stays sharp. */}
          <Link href="/cite" className="text-small text-text-muted transition-colors hover:text-text">
            Quick cite — for advocates
          </Link>
          <Link href="/diary" className="text-small text-text-muted transition-colors hover:text-text">
            Case diary
          </Link>
          <Link
            href="/limitation"
            className="text-small text-text-muted transition-colors hover:text-text">
            Limitation worksheet
          </Link>
          <Link
            href="/feedback"
            className="text-small text-text-muted transition-colors hover:text-text">
            Suggest an improvement
          </Link>
          <Link
            href="/verification"
            className="text-small text-text-muted transition-colors hover:text-text">
            How we verify
          </Link>
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
    // pb-24 clears the fixed FeedbackFab, which otherwise sits on top of the
    // last line of every page. `id` is the skip link's destination: the header
    // holds a search control and five links, and a keyboard or screen-reader
    // user should not walk them again on every page of a 5,600-page corpus.
    <main
      id={MAIN_CONTENT_ID}
      className="mx-auto w-full max-w-content flex-1 px-5 pt-10 pb-24 scroll-mt-20 sm:px-6">
      {children}
    </main>
  );
}

/**
 * The first thing in the tab order, and invisible until it is focused.
 *
 * Not decoration: the sticky header is the same on all 5,600 pages, so without
 * this every keyboard reader tabs past the logo, the search control and five
 * nav links before reaching the statute they came for.
 */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:border focus:border-brand focus:bg-surface focus:px-4 focus:py-2 focus:text-small focus:font-medium focus:text-text">
      Skip to content
    </a>
  );
}
