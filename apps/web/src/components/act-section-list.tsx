"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ChapterListItem, SectionListItem } from "@/features/acts/queries";

/**
 * Section list for an act page: grouped under chapter headings when browsing,
 * flat when filtering (matches jump across chapters). Filter matches section
 * number OR marginal note — "420" and "cheating" both work. A 500-section act
 * (BNSS: 531) is a punishing scroll otherwise.
 */
export function ActSectionList({
  slug,
  sections,
  chapters,
}: {
  slug: string;
  sections: SectionListItem[];
  chapters: ChapterListItem[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter(
      (s) => s.number.toLowerCase().includes(q) || s.marginal_note.toLowerCase().includes(q),
    );
  }, [query, sections]);

  const groups = useMemo(() => {
    const byChapter = new Map<string | null, SectionListItem[]>();
    for (const s of sections) {
      const key = s.chapter_id;
      byChapter.set(key, [...(byChapter.get(key) ?? []), s]);
    }
    const ordered: { chapter: ChapterListItem | null; sections: SectionListItem[] }[] = [];
    // Preliminary sections without a chapter come first.
    if (byChapter.has(null)) ordered.push({ chapter: null, sections: byChapter.get(null)! });
    for (const ch of chapters) {
      const secs = byChapter.get(ch.id);
      if (secs?.length) ordered.push({ chapter: ch, sections: secs });
    }
    return ordered;
  }, [sections, chapters]);

  const isFiltering = query.trim().length > 0;

  const rows = (items: SectionListItem[]) => (
    <ul className="divide-y divide-border rounded-md border border-border bg-surface">
      {items.map((section) => (
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
  );

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

      {isFiltering ? (
        filtered.length === 0 ? (
          <p className="rounded-md border border-border bg-surface p-4 text-body text-text-muted">
            No section matches “{query}”. Try a number like 420, or a word from the heading.
          </p>
        ) : (
          rows(filtered)
        )
      ) : groups.length > 1 ? (
        <div className="space-y-8">
          {groups.map(({ chapter, sections: secs }) => (
            <section key={chapter?.id ?? "prelim"}>
              {chapter ? (
                <h2 className="mb-3 text-small font-semibold uppercase tracking-wide text-text-muted">
                  <span className="font-mono text-brand">Ch. {chapter.number}</span> ·{" "}
                  {chapter.title}
                </h2>
              ) : null}
              {rows(secs)}
            </section>
          ))}
        </div>
      ) : (
        rows(sections)
      )}
    </div>
  );
}
