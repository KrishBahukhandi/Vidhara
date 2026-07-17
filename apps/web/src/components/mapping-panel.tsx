import Link from "next/link";

import { MarkdownLite } from "./markdown-lite";
import type { MappingRow } from "@/features/acts/queries";

const TYPE_LABEL: Record<string, string> = {
  identical: "Identical",
  renumbered: "Renumbered",
  modified: "Modified",
  expanded: "Expanded",
  merged: "Merged",
  split: "Split",
  new: "New provision",
  omitted: "Omitted",
};

/** design.md §2.4: change type always color + label, never color alone. */
function badgeClass(type: string | null): string {
  switch (type) {
    case "identical":
    case "renumbered":
      return "bg-map-same";
    case "new":
      return "bg-map-new";
    case "omitted":
      return "bg-map-omitted";
    default:
      return "bg-map-changed";
  }
}

function Side({
  label,
  act,
  number,
  note,
  slug,
}: {
  label: string;
  act: string | null;
  number: string | null;
  note: string | null;
  slug: string | null;
}) {
  // Omitted/new mappings have one side with no provision at all.
  const heading = (
    <>
      <span className="text-micro font-medium uppercase tracking-wide text-text-faint">
        {label}
      </span>
      <span className="block text-h3 font-semibold text-text">
        {act && number ? `${act} §${number}` : "—"}
      </span>
      <span className="block text-small text-text-muted">
        {act && number ? note : "No corresponding provision"}
      </span>
    </>
  );

  return slug && number ? (
    <Link
      href={`/acts/${slug}/${encodeURIComponent(number)}?via=mapping`}
      className="flex-1 rounded-sm border border-border bg-bg p-4 transition-colors hover:border-brand">
      {heading}
    </Link>
  ) : (
    <div className="flex-1 rounded-sm border border-border bg-bg p-4">{heading}</div>
  );
}

export function MappingPanel({ mapping }: { mapping: MappingRow }) {
  return (
    <article className="space-y-4 rounded-md border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <span
          className={`rounded-sm px-2 py-0.5 text-micro font-semibold text-on-brand ${badgeClass(mapping.mapping_type)}`}>
          {TYPE_LABEL[mapping.mapping_type ?? ""] ?? mapping.mapping_type}
        </span>
        <span className="text-micro text-text-faint">old law ⇄ new law</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Side
          label="Old law"
          act={mapping.source_act}
          number={mapping.source_number}
          note={mapping.source_marginal_note}
          slug={mapping.source_act_slug}
        />
        <Side
          label="New law"
          act={mapping.target_act}
          number={mapping.target_number}
          note={mapping.target_marginal_note}
          slug={mapping.target_act_slug}
        />
      </div>

      {mapping.change_summary_md ? <MarkdownLite>{mapping.change_summary_md}</MarkdownLite> : null}
    </article>
  );
}
