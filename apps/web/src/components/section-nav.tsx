import Link from "next/link";

import type { AdjacentSection } from "@/features/acts/queries";

/**
 * Previous/next section links — sequential reading within an act. Server
 * component (plain links); `?via=browse` keeps entry attribution correct.
 */
export function SectionNav({
  slug,
  prev,
  next,
}: {
  slug: string;
  prev: AdjacentSection | null;
  next: AdjacentSection | null;
}) {
  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Section navigation"
      className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row">
      {prev ? (
        <Link
          href={`/acts/${slug}/${encodeURIComponent(prev.number)}?via=browse`}
          className="lift flex flex-1 flex-col gap-1 rounded-md border border-border bg-surface p-4 hover:border-brand">
          <span className="text-micro font-medium uppercase tracking-wide text-text-faint">
            ← Previous
          </span>
          <span className="font-mono text-small font-bold text-brand">§{prev.number}</span>
          <span className="line-clamp-2 text-small text-text-muted">{prev.marginal_note}</span>
        </Link>
      ) : (
        <span className="hidden flex-1 sm:block" />
      )}
      {next ? (
        <Link
          href={`/acts/${slug}/${encodeURIComponent(next.number)}?via=browse`}
          className="lift flex flex-1 flex-col items-end gap-1 rounded-md border border-border bg-surface p-4 text-right hover:border-brand">
          <span className="text-micro font-medium uppercase tracking-wide text-text-faint">
            Next →
          </span>
          <span className="font-mono text-small font-bold text-brand">§{next.number}</span>
          <span className="line-clamp-2 text-small text-text-muted">{next.marginal_note}</span>
        </Link>
      ) : (
        <span className="hidden flex-1 sm:block" />
      )}
    </nav>
  );
}
