import type { StateAmendmentRow } from "@/features/acts/queries";

/**
 * State amendments to a section (D-053).
 *
 * THE DESIGN CONSTRAINT, which outranks everything else here: nothing in this
 * block may be mistaken for the central provision above it. Around 95 published
 * sections once had a State's amending text appended to their bodies (D-032),
 * and CrPC §438 — anticipatory bail — was one of them. That defect is the reason
 * the parser skips these; showing them again is only safe if the boundary is
 * impossible to miss.
 *
 * So: a separate section under its own heading, every entry labelled with its
 * State before a word of text, the authority printed verbatim under each, and
 * the text collapsed by default. Collapsed is deliberate — the fact that an
 * amendment EXISTS is what a reader needs first, and it is what silence used to
 * hide. Opening one is a decision to read another jurisdiction's law.
 *
 * What is shown is the amending INSTRUCTION as India Code prints it ("In section
 * 17, after clause (b), insert…"), not a consolidated State version of the
 * section. We do not have one and will not synthesise one — that would mean
 * writing statute text ourselves, which is the line this project does not cross.
 */
export function StateAmendments({ amendments }: { amendments: StateAmendmentRow[] }) {
  if (amendments.length === 0) return null;

  const states = [...new Set(amendments.map((a) => a.state))].sort();

  return (
    <section className="mt-10" aria-labelledby="state-amendments-heading">
      <h2 id="state-amendments-heading" className="text-h2 font-semibold text-text">
        State amendments
      </h2>
      <p className="mt-2 max-w-measure text-body text-text-muted">
        This section has been amended in its application to{" "}
        <strong className="text-text">{formatList(states)}</strong>. The text above is the central
        provision and is what applies everywhere else — these amendments are law only in the State
        that made them.
      </p>

      <ul className="mt-4 space-y-3">
        {amendments.map((amendment) => (
          <li
            key={amendment.id}
            className="rounded-md border border-border bg-surface p-4">
            <details className="group">
              <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="rounded border border-accent px-2 py-0.5 font-mono text-micro font-semibold uppercase tracking-wide text-accent">
                  {amendment.state}
                </span>
                <span className="font-mono text-micro text-text-faint">{amendment.citation}</span>
                <span className="ml-auto text-small text-brand group-open:hidden">Read →</span>
                <span className="ml-auto hidden text-small text-brand group-open:inline">
                  Hide
                </span>
              </summary>
              <div className="mt-3 whitespace-pre-wrap border-l-2 border-border pl-4 text-body text-text-muted">
                {amendment.amendment_text}
              </div>
            </details>
          </li>
        ))}
      </ul>

      <p className="mt-3 max-w-measure text-small text-text-faint">
        Reproduced from the same official PDF as the section above, as the amending Act words it —
        not a consolidated State version of the section. Check the source before relying on it.
      </p>
    </section>
  );
}

/** "Karnataka, Kerala and Tripura" — an Oxford-comma-free list, as one reads it aloud. */
function formatList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
