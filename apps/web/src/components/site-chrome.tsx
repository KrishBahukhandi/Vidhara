import Link from "next/link";
import type { ReactNode } from "react";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-content items-center justify-between px-6">
        <Link href="/" className="font-serif text-h3 font-semibold text-text">
          Vidhara
        </Link>
        <nav className="flex items-center gap-6" aria-label="Primary">
          <Link href="/acts" className="text-small font-medium text-text-muted hover:text-text">
            Bare Acts
          </Link>
          <Link href="/mapping" className="text-small font-medium text-text-muted hover:text-text">
            IPC ⇄ BNS Mapping
          </Link>
          <span className="hidden rounded-md bg-brand px-3 py-1.5 text-small font-medium text-on-brand sm:inline">
            Coming to Google Play
          </span>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-content flex-col gap-2 px-6 py-8">
        <p className="text-small text-text-faint">
          ⚖️ Reference only — verify against the official Gazette of India. Not legal advice.
        </p>
        <p className="text-small text-text-faint">
          {new Date().getFullYear()} Vidhara ·{" "}
          <Link href="/privacy" className="hover:text-text">
            Privacy
          </Link>
        </p>
      </div>
    </footer>
  );
}

/** Standard content column for SEO pages. */
export function PageShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-content flex-1 px-6 py-10">{children}</main>;
}
