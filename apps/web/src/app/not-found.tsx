import type { Metadata } from "next";
import Link from "next/link";

import { SearchBox } from "@/components/search-box";
import { PageShell } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Page not found",
  // A 404 that Google has already crawled should not be re-listed, but the
  // links on it are still worth following back into the corpus.
  robots: { index: false, follow: true },
};

/**
 * The 404 this site did not have.
 *
 * Next's default is a bare "404 | This page could not be found" with no header,
 * no footer and no way onward, and it is what every reader saw who mistyped a
 * section number, followed a stale link, or asked for a section this corpus has
 * not ingested — which on a 5,600-page library of numbered pages is the single
 * most likely wrong turn there is. A dead end there sends them to a competitor
 * rather than to the section they meant.
 *
 * So: the search box first, because the reader arrived here with a citation in
 * mind and the box resolves one directly ("420 IPC" goes to the section, not to
 * a results page), and then the four routes that answer nearly every reason
 * anyone is on this site at all.
 */
export default function NotFound() {
  return (
    <PageShell>
      <p className="font-mono text-small font-bold text-brand">404</p>
      <h1 className="mt-2 max-w-measure font-serif text-h1 font-semibold text-text">
        That page isn’t here.
      </h1>
      <p className="mt-3 max-w-measure text-body text-text-muted">
        The link may be old, the section number may have a letter in it (301A, 65B), or the act may
        be one we have not ingested yet. Look it up directly — a citation like{" "}
        <span className="font-mono text-text">420 IPC</span> or{" "}
        <span className="font-mono text-text">BNS 103</span> goes straight to the section.
      </p>

      <div className="mt-6 max-w-measure">
        <SearchBox />
      </div>

      <nav aria-label="Where to go next" className="mt-10 grid gap-3 sm:grid-cols-2">
        {[
          {
            href: "/acts",
            title: "Bare Acts library",
            body: "Every act we carry, shelved by subject and searchable section by section.",
          },
          {
            href: "/mapping",
            title: "IPC ⇄ BNS mapping",
            body: "The official old-law ⇄ new-law concordance, with what-changed notes.",
          },
          {
            href: "/search",
            title: "Full-text search",
            body: "Search the corpus by concept — “cheating”, “anticipatory bail”, “dowry death”.",
          },
          {
            href: "/feedback",
            title: "Tell us what is missing",
            body: "If a section should be here and is not, say so — that is how the corpus grows.",
          },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="lift rounded-md border border-border bg-surface p-4 hover:border-brand">
            <span className="block font-medium text-text">{card.title}</span>
            <span className="mt-1 block text-small text-text-muted">{card.body}</span>
          </Link>
        ))}
      </nav>
    </PageShell>
  );
}
