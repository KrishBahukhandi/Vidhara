"use client";

import { useMemo } from "react";
import { ACT_SLUG, parseSectionRef } from "@nexlex/shared";

import { useBookmarks, useRecents } from "@/lib/local-library";

export interface Suggestion {
  /** Stable key, and the thing that gets navigated to. */
  href: string;
  /** What this row does, in the reader's terms. */
  label: string;
  /** The line under it — a marginal note, or why this row is here. */
  detail?: string;
  kind: "section" | "recent" | "saved" | "fulltext";
}

/**
 * What the search box can offer WITHOUT asking the server.
 *
 * The whole point is that the useful answer arrives while you are still
 * typing. Every query this site currently ranks for is a bare section lookup —
 * "151 bns", "bns 180", "134 bnss", "ipc75" — and `parseSectionRef` already
 * resolves those synchronously, in shared code the client can run. So the
 * destination is known before a single request is made, and the box can show
 * it rather than making the reader submit and wait to find out.
 *
 * The rest comes from what this reader has already done: sections they have
 * read, and sections they have saved. Both live in localStorage, so they cost
 * nothing and work offline.
 *
 * Full-text search is the last row rather than the first. It is the only one
 * that needs the network, and for the queries people actually type it is
 * almost never what they wanted.
 */
export function useSearchSuggestions(query: string): Suggestion[] {
  const recents = useRecents();
  const { bookmarks } = useBookmarks();

  return useMemo(() => {
    const q = query.trim();
    if (!q) {
      // Nothing typed: offer the way back to what they were reading.
      return recents.slice(0, 6).map((r) => ({
        href: `/acts/${r.slug}/${encodeURIComponent(r.number)}?via=recents`,
        label: `${r.act} Section ${r.number}`,
        detail: r.note,
        kind: "recent" as const,
      }));
    }

    const out: Suggestion[] = [];

    // A confident section reference resolves instantly and goes first — this is
    // the query nearly everyone is typing.
    const ref = parseSectionRef(q);
    if (ref?.act) {
      out.push({
        href: `/acts/${ACT_SLUG[ref.act]}/${encodeURIComponent(ref.section)}?via=search`,
        label: `${ref.act} Section ${ref.section}`,
        detail: "Go straight to the section",
        kind: "section",
      });
    }

    const needle = q.toLowerCase();
    const matches = (item: { act: string; number: string; note: string }) =>
      `${item.act} ${item.number} ${item.note}`.toLowerCase().includes(needle);

    for (const b of bookmarks.filter(matches).slice(0, 3)) {
      out.push({
        href: `/acts/${b.slug}/${encodeURIComponent(b.number)}?via=bookmark`,
        label: `${b.act} Section ${b.number}`,
        detail: b.note,
        kind: "saved",
      });
    }
    for (const r of recents.filter(matches).slice(0, 4)) {
      const href = `/acts/${r.slug}/${encodeURIComponent(r.number)}?via=recents`;
      if (out.some((s) => s.href.split("?")[0] === href.split("?")[0])) continue;
      out.push({
        href,
        label: `${r.act} Section ${r.number}`,
        detail: r.note,
        kind: "recent",
      });
    }

    out.push({
      href: `/search?q=${encodeURIComponent(q)}`,
      label: `Search for “${q}”`,
      detail: "Full text across every act",
      kind: "fulltext",
    });

    return out;
  }, [query, recents, bookmarks]);
}
