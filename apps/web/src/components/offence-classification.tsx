import type { OffenceClassification, OffenceClassificationRules } from "@/features/acts/queries";

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

/**
 * The residual rule: how offences under an Act with no schedule of its own are
 * classified.
 *
 * Part I answers by naming the section, and only the BNS and the IPC have a
 * schedule that does that. For every other Act here — NDPS, POCSO, the NI Act
 * whose section 138 fills more cause lists than anything else in the country —
 * the schedule answers by punishment instead, in three bands.
 *
 * SO THIS SHOWS THE RULE AND STOPS. It does not say which band the section
 * above falls in. Deciding that means reading a punishment clause and
 * classifying it, and punishment clauses come with provisos, alternatives,
 * enhanced terms for repeat offenders and minimums that differ from maximums.
 * The site would be inventing law, which is the one thing it must never do.
 * The reader has the punishment in front of them; the rule is what they were
 * missing, and applying it is a step they can take and check.
 *
 * Collapsed, because it is the same three bands on every section of thirty-odd
 * Acts and most sections are not offences at all. Open it and it is exact;
 * leave it shut and it costs a line.
 *
 * The rider is not a hedge. Several of the Acts this serves DO provide to the
 * contrary — that is what section 5 of both codes preserves — so the rule is
 * stated with a link to the saving provision rather than as the last word.
 */
export function OffenceRulePanel({
  rules,
  actAbbreviation,
}: {
  rules: OffenceClassificationRules;
  actAbbreviation: string;
}) {
  const schedule = rules.scheduleActAbbreviation;
  const savingHref = `/acts/${schedule.toLowerCase() === "crpc" ? "crpc" : "bnss"}/5`;

  return (
    <section className="mt-8" aria-labelledby="rule-heading">
      <details className="group rounded-md border border-border bg-surface">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-small font-medium text-text transition-colors hover:bg-bg">
          <span id="rule-heading">How offences under the {actAbbreviation} are classified</span>
          <span
            aria-hidden
            className="shrink-0 text-text-faint transition-transform group-open:rotate-90">
            ›
          </span>
        </summary>

        <div className="border-t border-border px-4 py-4">
          {/* Not "the NDPS has no First Schedule": on a BNSS or CrPC page that
              would contradict the next clause, since those Acts DO have one —
              it just classifies the other code's sections, never their own.
              "Not classified one by one" is true of both. */}
          <p className="text-small text-text-muted">
            Sections of the {actAbbreviation} are not classified one by one by any First Schedule.
            Part II of the First Schedule to the {schedule} classifies offences under every other
            law by the punishment they carry
            {rules.agreesWith ? (
              <> — and the {rules.agreesWith}&rsquo;s First Schedule sets out the same three bands</>
            ) : null}
            .
          </p>

          {/* Cards rather than a four-column table, which is the idiom the
              panel above already uses — and on a 375px phone a table of these
              bands is 544px wide and scrolls sideways inside the page. The
              bands stack identically, so comparing them is still a glance. */}
          <div className="mt-4 space-y-3">
            {rules.rules.map((rule) => (
              <div key={rule.punishment} className="rounded-md border border-border bg-bg p-4">
                <p className="text-small font-medium text-text">{rule.punishment}</p>
                <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Band label="Arrest" value={rule.cognizable} />
                  <Band label="Bail" value={rule.bailable} />
                  <Band label="Triable by" value={rule.court} />
                </dl>
              </div>
            ))}
          </div>

          <p className="mt-4 text-small text-text-muted">
            Read it against the punishment in the section above. Vidhara does not place a section
            in a band for you — that turns on the exact wording of its punishment, which is the
            section&rsquo;s to say and not ours.
          </p>
          <p className="mt-2 text-small text-text-muted">
            And a special or local law may provide otherwise: see{" "}
            <a href={savingHref} className="underline underline-offset-2 hover:text-text">
              {schedule} section 5
            </a>
            , which saves any special jurisdiction, power or procedure another law lays down.
          </p>
        </div>
      </details>
    </section>
  );
}

/** One classification of a band, laid out as the Part I panel lays out a Fact. */
function Band({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-micro uppercase tracking-wide text-text-faint">{label}</dt>
      <dd className="mt-1 text-small text-text">{value}</dd>
    </div>
  );
}
