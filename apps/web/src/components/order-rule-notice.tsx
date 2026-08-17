import Link from "next/link";

import { formatOrderRule, type OrderRuleRef } from "@nexlex/shared";

import type { OrderSummary } from "@/features/acts/queries";

/**
 * Shown when a reader cites the Code of Civil Procedure's First Schedule.
 *
 * Until the Orders were ingested this said "we do not carry that" — which was
 * at least honest, since full-text search answered "Order 7 Rule 11" with seven
 * unrelated sections matched on the digit alone. Now it routes to the rule.
 *
 * It still has a not-found branch, because a reference can be well-formed and
 * still name nothing: "Order 99 Rule 3" parses cleanly. Saying so beats
 * silence, and beats a page of noise.
 *
 * NB: the prop is `value`, not `ref` — React reserves `ref` and intercepts it
 * rather than passing it through, which renders this component with nothing.
 */
export function OrderRuleNotice({
  value,
  matches,
  actSlug = "cpc",
}: {
  value: OrderRuleRef;
  /** Orders sharing the cited number — two for Order XI. */
  matches: OrderSummary[];
  actSlug?: string;
}) {
  const cite = formatOrderRule(value);

  if (matches.length === 0) {
    return (
      <div className="rounded-md border border-warning bg-surface p-5">
        <p className="text-body font-semibold text-text">
          There is no {cite} in the Code of Civil Procedure.
        </p>
        <p className="mt-2 text-body text-text-muted">
          The First Schedule runs to Order LI. Anything shown below is a full-text match, not that
          rule.{" "}
          <Link
            href={`/acts/${actSlug}/orders`}
            className="underline underline-offset-4 hover:text-text">
            Browse all Orders
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-surface p-5">
      <p className="text-body font-semibold text-text">{cite}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {matches.map((o) => (
          <li key={o.id}>
            <Link
              href={`/acts/${actSlug}/orders/${o.sortOrder}${value.rule ? `#rule-${value.rule}` : ""}`}
              className="text-body text-text underline underline-offset-4 hover:text-brand">
              Order {o.number} — {o.title}
              {value.rule ? `, Rule ${value.rule}` : ""}
            </Link>
          </li>
        ))}
      </ul>
      {matches.length > 1 ? (
        <p className="mt-3 text-small text-text-muted">
          Two Orders carry this number — the Commercial Courts Act substituted a parallel one for
          suits before a Commercial Division. Check which applies to your matter.
        </p>
      ) : null}
    </div>
  );
}
