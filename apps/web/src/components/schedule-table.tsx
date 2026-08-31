"use client";

import { useMemo, useState } from "react";

import type { ScheduleArticle, ScheduleRow } from "@/features/acts/queries";

/**
 * A statutory schedule that is genuinely a table — the Limitation Act's 137
 * Articles of periods.
 *
 * THREE NAMED COLUMNS, and the lettered limbs an Article carries inside them.
 * A table of any other width is celled rather than limbed (0026) and renders
 * through ScheduleCells; `rows` is null for those, which is why it is read
 * defensively here.
 *
 * Two decisions worth keeping:
 *
 * - **Not a `<table>` on phones.** Three columns of statutory prose in a 390px
 *   viewport is either a horizontal scroll or unreadable wrapping. Each article
 *   is a card with labelled fields below `md`, and a real table row above it,
 *   from one piece of markup — semantics stay intact for screen readers because
 *   the labels are always present, just visually hidden on desktop.
 * - **Filter matches the article number OR any cell.** The two ways an advocate
 *   arrives here are "what is Article 137" and "what's the period for a suit on
 *   a promissory note" — the second is the common one, and it is a text search.
 */
export function ScheduleTable({
  articles,
  columnLabels,
}: {
  articles: ScheduleArticle[];
  columnLabels: string[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (article) =>
        article.number.toLowerCase() === q ||
        article.number.toLowerCase().startsWith(q) ||
        (article.rows ?? []).some((row) =>
          `${row.description} ${row.period} ${row.commencement}`.toLowerCase().includes(q),
        ),
    );
  }, [articles, query]);

  // Division/part headings only make sense while browsing; when filtering, the
  // matches are scattered and the headings become noise between single rows.
  const groups = useMemo(() => {
    const out: { key: string; division: string | null; part: string | null; items: ScheduleArticle[] }[] = [];
    for (const article of filtered) {
      const part = article.part_number
        ? `Part ${article.part_number}${article.part_title ? ` — ${article.part_title}` : ""}`
        : null;
      const key = `${article.division ?? ""}|${part ?? ""}`;
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(article);
      else out.push({ key, division: article.division, part, items: [article] });
    }
    return out;
  }, [filtered]);

  const isFiltering = query.trim().length > 0;

  return (
    <div className="mt-6">
      <input
        type="search"
        inputMode="search"
        placeholder={`Filter ${articles.length} articles — number, or words like “promissory note”`}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="mb-4 h-11 w-full rounded-md border border-border bg-surface px-4 text-body text-text placeholder:text-text-faint focus:border-brand focus:outline-none"
      />

      {filtered.length === 0 ? (
        <p className="rounded-md border border-border bg-surface p-4 text-body text-text-muted">
          No article matches “{query}”. Try a number like 137, or a phrase from the description.
        </p>
      ) : (
        <>
          {isFiltering ? (
            <p className="mb-3 text-small text-text-muted">
              {filtered.length} of {articles.length} articles
            </p>
          ) : null}

          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.key}>
                {!isFiltering && (group.division ?? group.part) ? (
                  <h2 className="mb-3 text-small font-semibold uppercase tracking-wide text-text-muted">
                    {group.division}
                    {group.division && group.part ? " · " : ""}
                    {group.part}
                  </h2>
                ) : null}

                <div className="overflow-hidden rounded-md border border-border bg-surface">
                  <div className="hidden border-b border-border bg-bg md:grid md:grid-cols-[3.5rem_1fr_9rem_1fr] md:gap-4 md:px-4 md:py-2">
                    <span className="text-small font-semibold text-text-muted">Art.</span>
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
                        id={`article-${article.number}`}
                        className="scroll-mt-24 px-4 py-3 md:grid md:grid-cols-[3.5rem_1fr_9rem_1fr] md:gap-x-4 md:gap-y-2">
                        <a
                          href={`#article-${article.number}`}
                          className="font-mono text-small font-bold text-brand hover:underline">
                          {article.number}
                        </a>
                        {(article.rows ?? []).map((row, index) => (
                          <ArticleRow
                            key={index}
                            row={row}
                            columnLabels={columnLabels}
                            isFirst={index === 0}
                          />
                        ))}
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

/**
 * One limb of an article, as its own grid row.
 *
 * Stacking each column's limbs independently looked right and was wrong: limb
 * (a) of Article 114 wraps to three lines, which floated limb (b)'s "Thirty
 * days" up beside (a)'s text. A reader would pair the wrong period with the
 * wrong limb — the precise error the row model exists to prevent. `md:contents`
 * dissolves this wrapper into the parent grid so every limb's three cells share
 * a grid row and stay level; below `md` it stays a block and the labels show.
 */
function ArticleRow({
  row,
  columnLabels,
  isFirst,
}: {
  row: ScheduleRow;
  columnLabels: string[];
  isFirst: boolean;
}) {
  // An empty cell is a placeholder that keeps the desktop columns level. On a
  // phone there are no columns to keep level, so printing "Period of
  // limitation —" under a lead-in limb is pure noise: hide it there.
  const cell = (value: string, label: string, className: string) =>
    value ? (
      <div className={className}>
        {label ? (
          <span className="mt-2 block text-small font-semibold text-text-muted md:hidden">
            {label}
          </span>
        ) : null}
        <p className="text-body text-text">{value}</p>
      </div>
    ) : (
      <div className={`hidden md:block ${className}`} aria-hidden>
        <p className="text-body text-text-faint">—</p>
      </div>
    );

  return (
    <div className={`${isFirst ? "" : "mt-3 md:mt-0"} md:contents`}>
      {/* Keeps the article-number column empty for limbs after the first. */}
      {isFirst ? null : <span aria-hidden className="hidden md:block" />}
      {/* Later limbs open with "(a)"/"(b)" and label themselves. */}
      {cell(row.description, isFirst ? (columnLabels[0] ?? "Description") : "", "text-text")}
      {cell(row.period, columnLabels[1] ?? "Period", "font-medium")}
      {cell(row.commencement, columnLabels[2] ?? "Time from which period begins to run", "")}
    </div>
  );
}
