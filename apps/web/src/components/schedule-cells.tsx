"use client";

import { useMemo, useState } from "react";

import type { ScheduleArticle } from "@/features/acts/queries";

/**
 * A schedule that is a table of ANY width — the shape 0026 added to the one
 * 0011 built for the Limitation Act's three named columns.
 *
 * The motivating case is the inventory of enclaves annexed to Appendix I of the
 * Constitution: roughly three hundred rows of six columns, each naming a chhit,
 * its number, the police station it lies within on either side of the border,
 * and its area. Nobody reads that in order. Every visit is a lookup — a name, a
 * chhit number, a thana — so the filter is the page, exactly as it is for the
 * Limitation Act's Articles and for the list-shaped schedules.
 *
 * WHY IT IS NOT ScheduleTable. That component renders three columns and the
 * lettered limbs an Article may carry inside them, and its grid is built around
 * both. Here every row is one flat run of cells whose meaning is positional
 * against the schedule's own headings, and the number of them is whatever the
 * print used.
 *
 * NOT A `<table>` ON PHONES, for the reason ScheduleTable records: six columns
 * in a 390px viewport is either a horizontal scroll or unreadable wrapping.
 * Below `md` each row is a card of labelled fields; above it, a real table row.
 * One piece of markup, and the labels are always in the DOM, so a screen reader
 * gets the heading with the value either way.
 */
export function ScheduleCells({
  articles,
  columnLabels,
}: {
  articles: ScheduleArticle[];
  columnLabels: string[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return articles;
    return articles.filter(
      (article) =>
        article.number.toLowerCase() === needle ||
        (article.cells ?? []).some((cell) => cell.toLowerCase().includes(needle)),
    );
  }, [articles, query]);

  // Group headings only make sense while browsing: filtered, the matches are
  // scattered and a heading between single rows is noise. Same reading as
  // ScheduleTable's divisions.
  const groups = useMemo(() => {
    const out: { key: string; heading: string | null; items: ScheduleArticle[] }[] = [];
    for (const article of filtered) {
      const part = article.part_number
        ? `Part ${article.part_number}${article.part_title ? ` — ${article.part_title}` : ""}`
        : null;
      const heading = article.division ?? part;
      const key = heading ?? "";
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(article);
      else out.push({ key, heading, items: [article] });
    }
    return out;
  }, [filtered]);

  const isFiltering = query.trim().length > 0;
  // The first column of these tables is the serial number, and it needs a
  // fraction of the width the rest do.
  const template = `3.5rem repeat(${Math.max(columnLabels.length - 1, 1)}, minmax(0, 1fr))`;

  return (
    <div className="mt-6">
      <input
        type="search"
        inputMode="search"
        placeholder={`Filter ${articles.length} rows — ${columnLabels
          .slice(1, 3)
          .join(", ")
          .toLowerCase()}`}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="mb-4 h-11 w-full rounded-md border border-border bg-surface px-4 text-body text-text placeholder:text-text-faint focus:border-brand focus:outline-none"
      />

      {filtered.length === 0 ? (
        <p className="rounded-md border border-border bg-surface p-4 text-body text-text-muted">
          No row matches “{query}”.
        </p>
      ) : (
        <>
          {isFiltering ? (
            <p className="mb-3 text-small text-text-muted">
              {filtered.length} of {articles.length} rows
            </p>
          ) : null}

          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.key}>
                {!isFiltering && group.heading ? (
                  <h2 className="mb-3 text-small font-semibold uppercase tracking-wide text-text-muted">
                    {group.heading}
                  </h2>
                ) : null}

                <div className="overflow-hidden rounded-md border border-border bg-surface">
                  <div
                    className="hidden border-b border-border bg-bg md:grid md:gap-4 md:px-4 md:py-2"
                    style={{ gridTemplateColumns: template }}>
                    {columnLabels.map((label) => (
                      <span key={label} className="text-small font-semibold text-text-muted">
                        {label}
                      </span>
                    ))}
                  </div>

                  <ul className="divide-y divide-border">
                    {group.items.map((article) => (
                      <li
                        key={article.id}
                        id={rowId(article)}
                        className="scroll-mt-24 px-4 py-3 md:grid md:gap-x-4"
                        style={{ gridTemplateColumns: template }}>
                        {columnLabels.map((label, index) => {
                          const value = article.cells?.[index] ?? "";
                          // An empty cell keeps the desktop columns level and
                          // says nothing on a phone, where there are no columns
                          // to keep level.
                          if (!value) {
                            return (
                              <div key={label} className="hidden md:block" aria-hidden>
                                <p className="text-body text-text-faint">—</p>
                              </div>
                            );
                          }
                          return (
                            <div key={label}>
                              <span className="mt-2 block text-small font-semibold text-text-muted first:mt-0 md:hidden">
                                {label}
                              </span>
                              {index === 0 ? (
                                <a
                                  href={`#${rowId(article)}`}
                                  className="font-mono text-small font-bold text-brand hover:underline">
                                  {value}
                                </a>
                              ) : (
                                <p className="text-body text-text">{value}</p>
                              )}
                            </div>
                          );
                        })}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** A row's own anchor. The number alone will not do: a table that groups its
 * rows numbers each group from 1 (0026 keys them the same way), so the group
 * has to be in the fragment or two rows would answer to it. */
function rowId(article: ScheduleArticle): string {
  const group = (article.division ?? article.part_number ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `row-${group ? `${group}-` : ""}${article.number}`;
}
