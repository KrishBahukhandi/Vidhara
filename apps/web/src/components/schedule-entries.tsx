"use client";

import { useMemo, useState } from "react";

import type { ScheduleEntry } from "@/features/acts/queries";

/**
 * A schedule that is a numbered list, grouped into named lists.
 *
 * The Constitution's Seventh Schedule, and the reason it needs a control the
 * Limitation Act's Schedule does not: nobody reads 219 entries in order. The
 * question is always "who may legislate on X?", and the answer is an entry
 * number in one of three Lists. So the filter is the page — type "education"
 * and the answer is Concurrent List entry 25, with the Union and State Lists
 * shown as empty so it is clear the subject is in exactly one of them.
 *
 * Client-side, because 219 entries is roughly 90KB of text that has already
 * been sent: a round trip per keystroke would be slower and would break with
 * the network, and the whole set fits comfortably in memory.
 *
 * Entries keep their printed apparatus — amendment brackets, and the asterisk
 * rows the print uses for an omitted entry ("* * * * * *]"). An omitted entry
 * is a fact about the List: dropping it would leave a gap in the numbering
 * with nothing to explain it.
 */
export function ScheduleEntries({ entries }: { entries: ScheduleEntry[] }) {
  const [query, setQuery] = useState("");

  const lists = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const byList = new Map<string, { number: string; title: string; entries: ScheduleEntry[] }>();
    for (const entry of entries) {
      const key = entry.listNumber;
      if (!byList.has(key)) {
        byList.set(key, { number: entry.listNumber, title: entry.listTitle, entries: [] });
      }
      // A bare number matches the entry number; anything else matches the text.
      const hit =
        !needle ||
        entry.body.toLowerCase().includes(needle) ||
        entry.number.toLowerCase() === needle;
      if (hit) byList.get(key)!.entries.push(entry);
    }
    return [...byList.values()];
  }, [entries, query]);

  const matches = lists.reduce((n, list) => n + list.entries.length, 0);

  return (
    <div className="mt-6">
      <label htmlFor="entry-filter" className="sr-only">
        Filter entries
      </label>
      <input
        id="entry-filter"
        type="search"
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filter by subject — “education”, “police”, “taxes on income”…"
        className="h-11 w-full rounded-md border border-border bg-surface px-4 text-body text-text placeholder:text-text-faint focus:border-brand focus:outline-none"
      />
      <p aria-live="polite" className="mt-2 text-small text-text-muted">
        {query.trim()
          ? `${matches} ${matches === 1 ? "entry" : "entries"} matching “${query.trim()}”`
          : `${entries.length} entries across ${lists.length} Lists`}
      </p>

      <div className="mt-6 space-y-10">
        {lists.map((list) => (
          <section key={list.number} aria-labelledby={`list-${list.number}`}>
            <h2
              id={`list-${list.number}`}
              className="sticky top-14 z-10 -mx-1 bg-bg/90 px-1 py-2 font-serif text-h3 font-semibold text-text backdrop-blur-sm">
              List {list.number} — {list.title}
              <span className="ml-2 text-small font-normal text-text-muted">
                {list.entries.length}
              </span>
            </h2>

            {list.entries.length === 0 ? (
              <p className="mt-2 text-small text-text-muted">No entry in this List matches.</p>
            ) : (
              <ol className="mt-2 space-y-3">
                {list.entries.map((entry) => (
                  <li
                    key={`${list.number}-${entry.number}`}
                    id={`${list.number}-${entry.number}`}
                    className="flex gap-3 scroll-mt-24">
                    <span className="w-11 shrink-0 pt-0.5 text-small font-medium tabular-nums text-text-muted">
                      {entry.number}.
                    </span>
                    {/* An omitted entry's body is the print's asterisk row and
                        nothing else. Left at full weight it reads as missing
                        data rather than as the omission it is, so it is muted
                        and labelled — the asterisks stay, because they are what
                        the page says. */}
                    {/[A-Za-z]/.test(entry.body) ? (
                      <p className="min-w-0 flex-1 text-body text-text">{entry.body}</p>
                    ) : (
                      <p className="min-w-0 flex-1 text-body text-text-faint">
                        {entry.body}{" "}
                        <span className="text-small">— omitted</span>
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
