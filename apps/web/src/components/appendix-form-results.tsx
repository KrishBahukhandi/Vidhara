import Link from "next/link";

import type { AppendixFormHit } from "@/features/acts/queries";

/**
 * Appendix forms matched by search — their own group, for the same reason the
 * rules are: a form is a template you copy, not a provision you read, and the
 * heading should say so before a reader clicks.
 */
export function AppendixFormResults({ hits }: { hits: AppendixFormHit[] }) {
  if (hits.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-small font-medium text-text-muted">
        {hits.length} form{hits.length === 1 ? "" : "s"} in the CPC&rsquo;s Appendices
      </h2>
      <ul className="mt-3 divide-y divide-border border-y border-border">
        {hits.map((h) => (
          <li key={h.formId}>
            <Link
              href={`/acts/${h.actSlug}/appendices/${h.appendixLetter}#form-${h.formSort}`}
              className="block py-3 transition-colors hover:text-brand">
              <span className="font-mono text-small text-text-muted">
                {h.actAbbreviation} App. {h.appendixLetter} No. {h.formNumber}
              </span>{" "}
              <span className="text-body font-medium text-text">{h.title}</span>
              <span className="mt-1 block text-small text-text-muted">
                {h.snippet.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
                  part.startsWith("**") && part.endsWith("**") ? (
                    <strong key={i} className="font-semibold text-text">
                      {part.slice(2, -2)}
                    </strong>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
