"use client";

import Link from "next/link";

import { track } from "@/lib/analytics";
import { useRecents } from "@/lib/local-library";

/**
 * "Continue reading" on the home page — the cheapest return-visit aid and a
 * retention instrument (resumed sessions are a diagnostic). Renders nothing
 * for first-time visitors (empty recents), so it never adds noise for them.
 */
export function ContinueReading() {
  const recents = useRecents();
  if (recents.length === 0) return null;

  return (
    <section className="py-8">
      <h2 className="text-h3 font-semibold text-text">Continue reading</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recents.slice(0, 6).map((r) => (
          <li key={`${r.slug}-${r.number}`}>
            <Link
              href={`/acts/${r.slug}/${encodeURIComponent(r.number)}?via=recents`}
              onClick={() => track("recents_resumed", { act: r.act, number: r.number })}
              className="flex flex-col gap-1 rounded-md border border-border bg-surface p-4 transition-colors hover:border-brand">
              <span className="font-mono text-small font-bold text-brand">
                {r.act} §{r.number}
              </span>
              <span className="line-clamp-2 text-small text-text-muted">{r.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
