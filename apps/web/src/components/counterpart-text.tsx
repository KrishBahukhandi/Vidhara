import Link from "next/link";

import { MarkdownLite } from "./markdown-lite";

/**
 * The full text of the provision on the other side of a mapping.
 *
 * The mapping card already says IPC §124 became BNS §151. This is the half that
 * was missing: what the other one actually SAYS, so the comparison the product
 * promises can be made on the page instead of in a second tab.
 *
 * Presented so it can never be mistaken for the section above it — its own
 * bordered block, the Act named before a word of text, and a line stating in
 * plain words which law this is. That is the D-053 rule for State amendments,
 * and it applies for the same reason: two Acts' provisions reading as one text
 * is the failure D-032 had to repair across 68 sections.
 *
 * Open by default, unlike a State amendment. A State's law is another
 * jurisdiction's and opening it is a decision; the provision this section
 * replaced is the thing the reader came to compare.
 */
export function CounterpartText({
  actAbbreviation,
  actSlug,
  number,
  marginalNote,
  bodyMd,
  isOlder,
}: {
  actAbbreviation: string;
  actSlug: string;
  number: string;
  marginalNote: string;
  bodyMd: string;
  /** True when this is the law that came before the section being read. */
  isOlder: boolean;
}) {
  return (
    <details open className="mt-4 rounded-md border border-border bg-surface">
      <summary className="cursor-pointer list-none px-5 py-3 text-small font-medium text-text">
        <span className="font-mono">
          {actAbbreviation} Section {number}
        </span>{" "}
        — {marginalNote}
        <span className="ml-2 font-normal text-text-muted">
          · the {isOlder ? "earlier" : "later"} provision, in full
        </span>
      </summary>
      <div className="border-t border-border px-5 py-4">
        <p className="mb-3 text-micro text-text-faint">
          This is the text of <strong className="font-semibold text-text">{actAbbreviation} Section {number}</strong>,
          not of the section above. Read both before relying on either.
        </p>
        <div className="max-w-measure font-serif text-body leading-relaxed text-text">
          <MarkdownLite>{bodyMd}</MarkdownLite>
        </div>
        <Link
          href={`/acts/${actSlug}/${encodeURIComponent(number)}?via=mapping`}
          className="mt-3 inline-block text-small underline underline-offset-4 hover:text-brand">
          Open {actAbbreviation} Section {number} on its own page →
        </Link>
      </div>
    </details>
  );
}
