import Link from "next/link";

import type { OrderRuleHit } from "@/features/acts/queries";

/**
 * Rules matched by full-text search, shown as their own group.
 *
 * Not merged into the section results: "Order VII, Rule 11" is not a section
 * number, the two land on different routes, and a single ranked list would
 * leave a reader unsure which kind of thing they were looking at. Grouping is
 * also what lets the heading say where these come from — the First Schedule is
 * a part of the Code many readers do not know is separate.
 */
export function OrderRuleResults({ hits }: { hits: OrderRuleHit[] }) {
  if (hits.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-small font-medium text-text-muted">
        {hits.length} rule{hits.length === 1 ? "" : "s"} in the CPC&rsquo;s Orders (First Schedule)
      </h2>
      <ul className="mt-3 divide-y divide-border border-y border-border">
        {hits.map((h) => (
          <li key={h.ruleId}>
            <Link
              href={`/acts/${h.actSlug}/orders/${h.orderSort}#rule-${h.ruleNumber}`}
              className="block py-3 transition-colors hover:text-brand">
              <span className="font-mono text-small text-text-muted">
                {h.actAbbreviation} O.{h.orderNumber} r.{h.ruleNumber}
              </span>{" "}
              <span className="text-body font-medium text-text">{h.marginalNote}</span>
              <span className="mt-1 block text-small text-text-muted">
                {renderSnippet(h.snippet)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * ts_headline marks matches with `**term**` (the options are copied from
 * search_sections so both surfaces highlight identically). Rendered as bold
 * rather than dangerously set, because the snippet is statute text from the
 * database and the query is a user's.
 */
function renderSnippet(snippet: string) {
  return snippet.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-text">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
