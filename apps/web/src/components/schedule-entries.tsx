"use client";

import { useMemo, useState } from "react";

import type { ScheduleEntry } from "@/features/acts/queries";

/**
 * A schedule that is a numbered list, grouped into named lists.
 *
 * Eleven of the Constitution's twelve Schedules take this shape, and they are
 * not alike: the Seventh is 219 subjects in three Lists, the Ninth is 286 Acts
 * in one run, the Fifth and Tenth are paragraphs with marginal notes, the
 * Third is eight Forms of oath, the Fourth a table of seats. What they share is
 * that each entry is a number, an optional label, and a body.
 *
 * The filter is the page, because nobody reads any of these in order. The
 * question is "who may legislate on X?", "is this Act protected?", "what does
 * the anti-defection rule say about mergers?" — always a lookup. Type
 * "education" into the Seventh and the answer is Concurrent List entry 25, with
 * the Union and State Lists shown as empty so it is clear the subject sits in
 * exactly one of them.
 *
 * Client-side, because the largest of these is roughly 90KB of text that has
 * already been sent: a round trip per keystroke would be slower and would break
 * with the network.
 *
 * Entries keep their printed apparatus — amendment brackets, and the asterisk
 * rows the print uses for an omitted entry ("* * * * * *]"). An omitted entry
 * is a fact about the schedule: dropping it would leave a gap in the numbering
 * with nothing to explain it.
 */
export function ScheduleEntries({ entries }: { entries: ScheduleEntry[] }) {
  const [query, setQuery] = useState("");

  const lists = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const byList = new Map<
      string,
      { number: string | null; title: string | null; entries: ScheduleEntry[] }
    >();
    for (const entry of entries) {
      // A schedule with no Lists or Parts still has one run to group under; it
      // simply has no name, and renders without a heading.
      const key = entry.listNumber ?? "";
      if (!byList.has(key)) {
        byList.set(key, { number: entry.listNumber, title: entry.listTitle, entries: [] });
      }
      // A bare number matches the entry number; anything else matches the text
      // and the label, since in a paragraph schedule the label is the marginal
      // note and is the thing most likely to be searched for.
      const hit =
        !needle ||
        entry.body.toLowerCase().includes(needle) ||
        (entry.label ?? "").toLowerCase().includes(needle) ||
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
          : `${entries.length} entries${lists.length > 1 ? ` across ${lists.length} groups` : ""}`}
      </p>

      <div className="mt-6 space-y-10">
        {lists.map((list) => (
          <section key={list.number ?? "all"} aria-labelledby={`list-${list.number ?? "all"}`}>
            {/* Three kinds of group, and the print names each differently.
                "List I—Union List" in the Seventh; a bare "PART A" in the
                Second and Fifth, whose own title is set in small caps below the
                size this parse reads; and "I. THE STATES" in the First, which
                is a division of the schedule rather than a List. The last is
                told by its heading being set in capitals. */}
            {list.number ? (
              <h2
                id={`list-${list.number}`}
                className="sticky top-14 z-10 -mx-1 bg-bg/90 px-1 py-2 font-serif text-h3 font-semibold text-text backdrop-blur-sm">
                {!list.title
                  ? `Part ${list.number}`
                  : list.title === list.title.toUpperCase()
                    ? `${list.number}. ${list.title}`
                    : `List ${list.number} — ${list.title}`}
                <span className="ml-2 text-small font-normal text-text-muted">
                  {list.entries.length}
                </span>
              </h2>
            ) : null}

            {list.entries.length === 0 ? (
              <p className="mt-2 text-small text-text-muted">Nothing in this group matches.</p>
            ) : (
              <ol className="mt-2 space-y-3">
                {list.entries.map((entry) => (
                  <li
                    key={`${list.number}-${entry.number}`}
                    id={`${list.number}-${entry.number}`}
                    className="flex gap-3 scroll-mt-24">
                    <span className="w-14 shrink-0 pt-0.5 text-small font-medium tabular-nums text-text-muted">
                      {entry.number}.
                    </span>
                    {/* An omitted entry's body is the print's asterisk row and
                        nothing else. Left at full weight it reads as missing
                        data rather than as the omission it is, so it is muted
                        and labelled — the asterisks stay, because they are what
                        the page says. */}
                    {/[A-Za-z]/.test(entry.body) ? (
                      <p className="min-w-0 flex-1 text-body text-text">
                        {/* The label leads, because in a paragraph schedule it
                            is the marginal note and in a table it is the State
                            or the office — either way it is what the reader
                            scanned down the page to find. */}
                        {entry.label ? (
                          <span className="font-medium">{entry.label}. </span>
                        ) : null}
                        {entry.body}
                      </p>
                    ) : (
                      <p className="min-w-0 flex-1 text-body text-text-faint">
                        {entry.label ? <span>{entry.label} </span> : null}
                        {entry.body} <span className="text-small">— omitted</span>
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
