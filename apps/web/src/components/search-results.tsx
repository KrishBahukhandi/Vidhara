"use client";

import Link from "next/link";
import { Fragment, useEffect } from "react";

import type { SearchHit } from "@/features/acts/queries";
import { track } from "@/lib/analytics";

/** ts_headline highlights arrive as **term** — render them as emphasis. */
function Snippet({ text }: { text: string }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-transparent font-semibold text-brand">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** Client so result clicks carry their rank (analytics-plan events). */
export function SearchResults({ query, hits }: { query: string; hits: SearchHit[] }) {
  useEffect(() => {
    track("search_performed", { query_len: query.length, results_count: hits.length });
  }, [query, hits.length]);

  return (
    <ul className="mt-6 divide-y divide-border rounded-md border border-border bg-surface">
      {hits.map((hit, index) => (
        <li key={hit.section_id}>
          <Link
            href={`/acts/${hit.act_slug}/${encodeURIComponent(hit.number)}?via=search`}
            onClick={() => track("search_result_clicked", { rank: index + 1 })}
            className="block px-4 py-3 transition-colors hover:bg-bg">
            <span className="font-mono text-small font-bold text-brand">
              {hit.act_abbreviation} §{hit.number}
            </span>
            <span className="ml-3 font-medium text-text">{hit.marginal_note}</span>
            {hit.snippet ? (
              <p className="mt-1 line-clamp-2 text-small text-text-muted">
                <Snippet text={hit.snippet} />
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
