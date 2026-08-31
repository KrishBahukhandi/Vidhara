import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ScheduleEntries } from "@/components/schedule-entries";
import { ScheduleTable } from "@/components/schedule-table";
import { PageShell } from "@/components/site-chrome";
import { getActBySlug, getSchedule, listSchedulesByAct } from "@/features/acts/queries";
import { TrackEvent } from "@/lib/analytics";

export const revalidate = 3600;

interface Params {
  slug: string;
  scheduleSlug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, scheduleSlug } = await params;
  const [act, result] = await Promise.all([getActBySlug(slug), getSchedule(slug, scheduleSlug)]);
  if (!act || !result) return {};
  const { schedule } = result;
  return {
    title: `${schedule.title}${schedule.subtitle ? ` (${schedule.subtitle})` : ""} — ${act.abbreviation}`,
    description: `${schedule.title} to the ${act.title}${schedule.subtitle ? `: ${schedule.subtitle.toLowerCase()}` : ""}, article by article. Search by article number or by the kind of suit. Free on Vidhara.`,
    alternates: { canonical: `/acts/${act.slug}/schedule/${schedule.slug}` },
  };
}

export default async function SchedulePage({ params }: { params: Promise<Params> }) {
  const { slug, scheduleSlug } = await params;
  const [act, result, siblings] = await Promise.all([
    getActBySlug(slug),
    getSchedule(slug, scheduleSlug),
    listSchedulesByAct(slug),
  ]);
  if (!act || !result) notFound();

  // A schedule can carry a table of its own — the Sixth's paragraph 20 appends
  // one listing the tribal areas — and it is published beside it rather than
  // flattened into the paragraph that refers to it. The paragraph says "the
  // table below" and there is no table below, so the two are linked both ways.
  // The relationship is in the slug: "sixth" and "sixth-table".
  const child = siblings.find((s) => s.slug.startsWith(`${scheduleSlug}-`));
  const parent = scheduleSlug.includes("-")
    ? siblings.find((s) => s.slug === scheduleSlug.split("-")[0])
    : undefined;
  const related = child ?? parent;

  const { schedule, articles, entries } = result;
  // A schedule is columnar (0011) or entry-shaped (0023), never both.
  const isEntryShaped = entries.length > 0;

  return (
    <PageShell>
      <TrackEvent name="schedule_opened" props={{ act: act.abbreviation, schedule: schedule.slug }} />
      <nav className="text-small text-text-muted" aria-label="Breadcrumb">
        <Link href="/acts" className="hover:text-text">
          Bare Acts
        </Link>{" "}
        /{" "}
        <Link href={`/acts/${act.slug}`} className="hover:text-text">
          {act.abbreviation}
        </Link>{" "}
        / {schedule.title}
      </nav>

      <h1 className="mt-3 font-serif text-h1 font-semibold text-text">
        {schedule.title}
        {schedule.subtitle ? (
          <span className="block text-body font-normal text-text-muted">{schedule.subtitle}</span>
        ) : null}
      </h1>
      <p className="mt-1 text-small text-text-muted">
        {act.abbreviation} · {isEntryShaped ? `${entries.length} entries` : `${articles.length} articles`}
        {schedule.authority_note ? ` · [${schedule.authority_note}]` : ""}
      </p>

      {act.slug === "lim" ? (
        <p className="mt-3 text-small text-text-muted">
          Counting a period from one of these?{" "}
          <Link href="/limitation" className="text-brand hover:underline">
            Limitation worksheet
          </Link>{" "}
          — it applies s.12(1) and lists what would move the date.
        </p>
      ) : null}

      {related ? (
        <p className="mt-3 text-small text-text-muted">
          {child ? "This schedule appends a table: " : "Table to "}
          <Link href={`/acts/${act.slug}/schedule/${related.slug}`} className="text-brand hover:underline">
            {related.title}
            {related.subtitle ? ` — ${related.subtitle}` : ""}
          </Link>
          .
        </p>
      ) : null}

      {isEntryShaped ? (
        <ScheduleEntries entries={entries} />
      ) : articles.length === 0 ? (
        <p className="mt-8 text-body text-text-muted">
          This schedule is still being ingested.
        </p>
      ) : (
        <ScheduleTable articles={articles} columnLabels={schedule.column_labels} />
      )}

      {/* The closing note is about what the schedule does NOT settle, so it is
          per-schedule: a limitation period is a starting point for a
          computation, while a legislative entry is a starting point for a
          question about competence that the courts have spent 75 years on. */}
      <p className="mt-8 text-small text-text-faint">
        {isEntryShaped
          ? `Reproduced from the official India Code text. An entry names a subject; whether a
             particular law falls within it is a question of pith and substance that the courts
             decide, and articles 246 to 254 govern what happens when Lists overlap. Verify against
             the bare text before relying on it.`
          : `Reproduced from the official India Code text. A period is only a starting point —
             sections 4 to 24 of the Act govern how it is computed, and the ${act.abbreviation}
             sections page carries those. Verify against the bare act before filing.`}
      </p>
    </PageShell>
  );
}
