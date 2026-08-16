import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActSectionList } from "@/components/act-section-list";
import { PageShell } from "@/components/site-chrome";
import {
  getActBySlug,
  listActs,
  listChaptersByAct,
  listSchedulesByAct,
  listSectionsByAct,
} from "@/features/acts/queries";
import { TrackEvent } from "@/lib/analytics";

export const revalidate = 3600;

interface Params {
  slug: string;
}

export async function generateStaticParams(): Promise<Params[]> {
  const acts = await listActs();
  return acts.map((act) => ({ slug: act.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const act = await getActBySlug(slug);
  if (!act) return {};
  return {
    title: `${act.title} — full text, section-wise`,
    description: `${act.title} (${act.abbreviation}, ${act.year}): read section by section with marginal notes${act.status === "replaced" ? " and mappings to the law that replaced it" : ""}. Free on Vidhara.`,
    alternates: { canonical: `/acts/${act.slug}` },
  };
}

export default async function ActPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const act = await getActBySlug(slug);
  if (!act) notFound();

  const [sections, chapters, schedules] = await Promise.all([
    listSectionsByAct(slug),
    listChaptersByAct(slug),
    listSchedulesByAct(slug),
  ]);

  return (
    <PageShell>
      <TrackEvent name="act_opened" props={{ act: act.abbreviation }} />
      <nav className="text-small text-text-muted" aria-label="Breadcrumb">
        <Link href="/acts" className="hover:text-text">
          Bare Acts
        </Link>{" "}
        / {act.abbreviation}
      </nav>

      <h1 className="mt-3 font-serif text-h1 font-semibold text-text">{act.title}</h1>
      <p className="mt-1 text-small text-text-muted">
        {act.abbreviation} · {act.year}
        {act.status !== "active" ? " · no longer in force" : ""}
      </p>

      {/* The CPC is cited two ways and we carry only one of them. Saying so on
          the act page itself means a reader browsing for Order VII Rule 11
          learns the boundary before concluding it is not in the Act at all. */}
      {act.slug === "cpc" ? (
        <p className="mt-4 max-w-measure rounded-md border border-warning p-4 text-small text-text-muted">
          <strong className="font-semibold text-text">Sections only.</strong> This is the CPC&rsquo;s
          body — sections 1&ndash;158. Its <strong>First Schedule</strong> (the Orders and Rules:
          Order VII Rule 11, Order VIII Rule 6, Order XXXIX and so on) is not ingested yet; read
          those on{" "}
          <a
            href="https://www.indiacode.nic.in/handle/123456789/2191"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-text">
            India Code
          </a>
          .
        </p>
      ) : null}

      {schedules.length > 0 ? (
        <nav className="mt-6 rounded-md border border-border bg-surface p-4" aria-label="Schedules">
          <p className="text-small font-semibold uppercase tracking-wide text-text-muted">
            Schedules
          </p>
          <ul className="mt-2 space-y-1">
            {schedules.map((schedule) => (
              <li key={schedule.id}>
                <Link
                  href={`/acts/${slug}/schedule/${schedule.slug}`}
                  className="text-body font-medium text-brand hover:underline">
                  {schedule.title}
                  {schedule.subtitle ? (
                    <span className="font-normal text-text-muted"> — {schedule.subtitle}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {sections.length === 0 ? (
        <p className="mt-8 text-body text-text-muted">
          Sections for this act are still being ingested.
        </p>
      ) : (
        <ActSectionList slug={slug} sections={sections} chapters={chapters} />
      )}
    </PageShell>
  );
}
