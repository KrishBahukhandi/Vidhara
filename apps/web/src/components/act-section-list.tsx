"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { SectionListItem } from "@/features/acts/queries";

/**
 * Section list with a client-side filter — a 500-section act (BNSS: 531) is a
 * punishing scroll otherwise. Matches on section number OR marginal note, so
 * "420" and "cheating" both work.
 */
export function ActSectionList({ slug, sections }: { slug: string; sections: SectionListItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter(
      (s) => s.number.toLowerCase().includes(q) || s.marginal_note.toLowerCase().includes(q),
    );
  }, [query, sections]);

  return (
    <div className="mt-6">
      {sections.length > 12 ? (
        <input
          type="search"
          inputMode="search"
          placeholder={`Filter ${sections.length} sections — number or keyword`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-4 h-11 w-full rounded-md border border-border bg-surface px-4 text-body text-text placeholder:text-text-faint focus:border-brand focus:outline-none"
        />
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-md border border-border bg-surface p-4 text-body text-text-muted">
          No section matches “{query}”. Try a number like 420, or a word from the heading.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-surface">
          {filtered.map((section) => (
            <li key={section.id}>
              <Link
                href={`/acts/${slug}/${encodeURIComponent(section.number)}?via=browse`}
                className="flex items-baseline gap-4 px-4 py-3 transition-colors hover:bg-bg">
                <span className="min-w-14 font-mono text-small font-bold text-brand">
                  §{section.number}
                </span>
                <span className="font-medium text-text">{section.marginal_note}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
