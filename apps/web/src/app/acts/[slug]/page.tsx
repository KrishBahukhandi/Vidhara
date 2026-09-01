import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActSectionList } from "@/components/act-section-list";
import { ChapterNav } from "@/components/chapter-nav";
import { PageShell } from "@/components/site-chrome";
import {
  getActBySlug,
  listActs,
  listChaptersByAct,
  listSchedulesByAct,
  listSectionsByAct,
} from "@/features/acts/queries";
import { TrackEvent } from "@/lib/analytics";
import { chapterAnchors } from "@/lib/chapter-anchors";
import { SITE_URL } from "@/lib/site";

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
  const anchors = chapterAnchors(chapters);

  // An act page is the hub of everything under it, and until now it said so
  // only to a human: no structured data at all, so a crawler had 5,600 section
  // pages and no statement of what they belong to. `Legislation` names the act
  // as the thing it is, and the breadcrumb mirrors the one on screen.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Legislation",
    name: act.title,
    alternateName: act.abbreviation,
    legislationIdentifier: `${act.abbreviation}, ${act.year}`,
    legislationJurisdiction: "IN",
    legislationDate: `${act.year}`,
    inLanguage: "en",
    url: `${SITE_URL}/acts/${act.slug}`,
    ...(act.source_url ? { isBasedOn: act.source_url } : {}),
    // What a reader gets here, said in the terms a search engine counts in.
    hasPart: sections.slice(0, 25).map((section) => ({
      "@type": "Legislation",
      name: `Section ${section.number} — ${section.marginal_note}`,
      url: `${SITE_URL}/acts/${act.slug}/${encodeURIComponent(section.number)}`,
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Bare Acts", item: `${SITE_URL}/acts` },
      { "@type": "ListItem", position: 2, name: act.title, item: `${SITE_URL}/acts/${act.slug}` },
    ],
  };

  return (
    <PageShell>
      <TrackEvent name="act_opened" props={{ act: act.abbreviation }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
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
        <p className="mt-4 max-w-measure rounded-md border border-border bg-surface p-4 text-small text-text-muted">
          This page lists the CPC&rsquo;s <strong className="font-semibold text-text">sections</strong>.
          Its <strong className="font-semibold text-text">First Schedule</strong> — the Orders and
          Rules, where Order VII Rule 11, Order VIII Rule 6 and Order XXXIX live — is a separate
          list:{" "}
          <Link
            href={`/acts/${slug}/orders`}
            className="font-medium text-text underline underline-offset-4 hover:text-brand">
            browse the Orders and Rules
          </Link>
          , and the{" "}
          <Link
            href={`/acts/${slug}/appendices`}
            className="font-medium text-text underline underline-offset-4 hover:text-brand">
            Appendices (the forms)
          </Link>
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
        <>
          <ChapterNav chapters={chapters} anchors={anchors} />
          <ActSectionList
            slug={slug}
            sections={sections}
            chapters={chapters}
            anchors={anchors}
          />
        </>
      )}
    </PageShell>
  );
}
