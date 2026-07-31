import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ScheduleTable } from "@/components/schedule-table";
import { PageShell } from "@/components/site-chrome";
import { getActBySlug, getSchedule } from "@/features/acts/queries";
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
  const [act, result] = await Promise.all([getActBySlug(slug), getSchedule(slug, scheduleSlug)]);
  if (!act || !result) notFound();

  const { schedule, articles } = result;

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
        {act.abbreviation} · {articles.length} articles
        {schedule.authority_note ? ` · [${schedule.authority_note}]` : ""}
      </p>

      {articles.length === 0 ? (
        <p className="mt-8 text-body text-text-muted">
          This schedule is still being ingested.
        </p>
      ) : (
        <ScheduleTable articles={articles} columnLabels={schedule.column_labels} />
      )}

      <p className="mt-8 text-small text-text-faint">
        Reproduced from the official India Code text. A period is only a starting point — sections 4
        to 24 of the Act govern how it is computed, and the {act.abbreviation} sections page carries
        those. Verify against the bare act before filing.
      </p>
    </PageShell>
  );
}
