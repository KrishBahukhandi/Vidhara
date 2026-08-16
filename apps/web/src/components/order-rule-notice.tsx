import Link from "next/link";

import { formatOrderRule, type OrderRuleRef } from "@nexlex/shared";

/**
 * Shown when a reader cites the Code of Civil Procedure's First Schedule.
 *
 * Sections 1-158 are in this corpus; the Orders and Rules are not, and that is
 * 78% of the Act by volume. Without this notice full-text search answers
 * "Order 7 Rule 11" with seven unrelated sections that merely contain a 7 —
 * Constitution art. 366, General Clauses §3, Consumer Protection §38 — which is
 * worse than an empty result, because it looks like an answer.
 *
 * D-049's rule for the verification page applies here too: state the limit in
 * the same breath as the claim, and say what we do have instead.
 */
// NB: the prop is `value`, not `ref` — React reserves `ref` and intercepts it
// rather than passing it through, which renders this component with nothing.
export function OrderRuleNotice({ value }: { value: OrderRuleRef }) {
  const cite = formatOrderRule(value);
  return (
    <div className="rounded-md border border-warning bg-surface p-5">
      <p className="text-body font-semibold text-text">
        {cite} is in the CPC&rsquo;s First Schedule, which Vidhara does not carry yet.
      </p>
      <p className="mt-2 text-body text-text-muted">
        We have the Code of Civil Procedure&rsquo;s{" "}
        <strong className="font-semibold text-text">sections 1&ndash;158</strong>. Its{" "}
        <strong className="font-semibold text-text">Orders and Rules</strong> — where rejection of
        a plaint, set-off, injunctions and appeals live — are a separate schedule we have not
        ingested. Anything shown below is a full-text match, not that rule.
      </p>
      <p className="mt-3 text-small text-text-muted">
        Read it on{" "}
        <a
          href="https://www.indiacode.nic.in/handle/123456789/2191"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-text">
          India Code
        </a>{" "}
        meanwhile. ·{" "}
        <Link href="/acts/cpc" className="underline underline-offset-4 hover:text-text">
          CPC sections we do have
        </Link>{" "}
        ·{" "}
        <Link href="/verification" className="underline underline-offset-4 hover:text-text">
          what else is missing
        </Link>
      </p>
    </div>
  );
}
