import type { OffenceClassification } from "@/features/acts/queries";

/**
 * How an offence is classified: cognizable, bailable, and which court tries it.
 *
 * The first thing anyone asks after "what does this section say?" — and the one
 * thing the section's own text never says. It lives in the First Schedule of
 * the procedural code, which is why a bare-act reader has always had to leave
 * the page to find it.
 *
 * Two rules govern what this may state.
 *
 * It says only what the schedule says. Where the print gives a plain answer
 * ("Cognizable.") that is shown as a fact. Where it gives a CONDITIONAL one
 * ("According as offence abetted is cognizable or non-cognizable") there is no
 * fact to show, and the condition is quoted instead — an abetment section
 * genuinely has no classification of its own. Where one section carries several
 * rows the alternatives are listed rather than resolved.
 *
 * And it always names its source. This is a different act from the one being
 * read — a BNS section classified by the BNSS — so a reader who wants to check
 * needs to know where to look.
 */
export function OffenceClassificationPanel({
  rows,
}: {
  rows: OffenceClassification[];
}) {
  if (rows.length === 0) return null;
  const scheduleAct = rows[0]?.scheduleActAbbreviation ?? "";

  return (
    <section className="mt-8" aria-labelledby="classification-heading">
      <h2 id="classification-heading" className="text-h2 font-semibold text-text">
        How this offence is classified
      </h2>
      <p className="mt-1 text-small text-text-muted">
        From the First Schedule to the {scheduleAct}.
      </p>

      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div
            key={`${row.sectionNumber}-${row.subsection ?? "all"}`}
            className="rounded-md border border-border bg-surface p-4">
            {row.subsection ? (
              <p className="mb-3 text-small font-medium text-text">
                Section {row.sectionNumber}({row.subsection})
              </p>
            ) : null}

            <dl className="grid gap-3 sm:grid-cols-3">
              <Fact
                label="Arrest"
                values={row.cognizable}
                plain={
                  row.isCognizable === null
                    ? null
                    : row.isCognizable
                      ? "Cognizable"
                      : "Non-cognizable"
                }
                // Spelled out because the words are terms of art the schedule
                // itself defines, and a reader meeting them for the first time
                // should not have to look them up to use the page.
                note={
                  row.isCognizable === null
                    ? undefined
                    : row.isCognizable
                      ? "police may arrest without a warrant"
                      : "police may not arrest without a warrant"
                }
              />
              <Fact
                label="Bail"
                values={row.bailable}
                plain={
                  row.isBailable === null ? null : row.isBailable ? "Bailable" : "Non-bailable"
                }
                note={
                  row.isBailable === null
                    ? undefined
                    : row.isBailable
                      ? "bail is a matter of right"
                      : "bail is at the court's discretion"
                }
              />
              <Fact label="Triable by" values={row.court} plain={null} />
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * One column of the table. `plain` is the schedule's unconditional answer where
 * it gives one; otherwise the printed text is quoted as-is, because a condition
 * or a set of alternatives is not a value and must not be rendered as one.
 */
function Fact({
  label,
  values,
  plain,
  note,
}: {
  label: string;
  values: string[];
  plain: string | null;
  note?: string;
}) {
  if (values.length === 0) return null;
  return (
    <div>
      <dt className="text-micro uppercase tracking-wide text-text-faint">{label}</dt>
      {plain ? (
        <>
          <dd className="mt-1 font-medium text-text">{plain}</dd>
          {note ? <dd className="mt-0.5 text-small text-text-muted">{note}</dd> : null}
        </>
      ) : (
        <dd className="mt-1 text-small text-text">
          {values.length === 1 ? (
            values[0]
          ) : (
            <ul className="list-disc space-y-1 pl-4">
              {values.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          )}
        </dd>
      )}
    </div>
  );
}
