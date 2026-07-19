import Link from "next/link";

/**
 * Trust block: where this text comes from and how to report an error against
 * THIS exact provision. Wrong-content reports are Sev-0 (analytics-plan
 * §Runbook) — this is their intake. Server component; the report link opens
 * the suggestion form pre-scoped to the provision.
 */
export function SectionProvenance({
  act,
  number,
  sourceUrl,
  provenance,
}: {
  act: string;
  number: string;
  sourceUrl: string | null;
  provenance: string | null;
}) {
  // A malformed source_url must never crash the section page (server render).
  const hostname = (() => {
    if (!sourceUrl) return null;
    try {
      return new URL(sourceUrl).hostname;
    } catch {
      return "official source";
    }
  })();
  const sourceLabel = sourceUrl
    ? sourceUrl.includes("indiacode")
      ? "India Code (official)"
      : sourceUrl.includes("mha.gov.in")
        ? "Gazette of India via MHA (official)"
        : hostname
    : null;

  return (
    <section
      aria-label="Source and corrections"
      className="mt-10 rounded-md border border-border bg-surface p-4">
      <p className="text-micro font-semibold uppercase tracking-wide text-text-faint">
        Source &amp; version
      </p>
      <div className="mt-2 space-y-1 text-small text-text-muted">
        {sourceLabel && sourceUrl ? (
          <p>
            Official text:{" "}
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand hover:underline">
              {sourceLabel} ↗
            </a>
          </p>
        ) : null}
        {provenance ? <p className="text-micro text-text-faint">{provenance}</p> : null}
        <p className="pt-1">
          Spotted a mistake in this text or its mapping?{" "}
          <Link
            href={`/feedback?about=${encodeURIComponent(`${act} §${number}`)}`}
            className="font-medium text-brand hover:underline">
            Report an issue with {act} §{number}
          </Link>
        </p>
      </div>
    </section>
  );
}
