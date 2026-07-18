import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookmarkButton } from "@/components/bookmark-button";
import { FakeDoor } from "@/components/fake-door";
import { FeedbackWidget } from "@/components/feedback-widget";
import { MarkdownLite } from "@/components/markdown-lite";
import { MappingPanel } from "@/components/mapping-panel";
import { RecordRecent } from "@/components/record-recent";
import { SectionNav } from "@/components/section-nav";
import { SectionShare } from "@/components/section-share";
import { PageShell } from "@/components/site-chrome";
import {
  getAdjacentSections,
  getMappingsForSection,
  getSectionWithAct,
} from "@/features/acts/queries";
import { TrackEvent } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

interface Params {
  slug: string;
  number: string;
}

// 3,118 section pages render ON DEMAND (ISR, cached 1h via `revalidate`) instead
// of being pre-built: pre-rendering all of them made every deploy a ~half-hour
// build hammering Supabase. SEO is unaffected — the sitemap lists every URL and
// crawlers get the same static HTML from the first hit onward.
export async function generateStaticParams(): Promise<Params[]> {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, number } = await params;
  const section = await getSectionWithAct(slug, decodeURIComponent(number));
  if (!section) return {};

  const mappings = await getMappingsForSection(section.id);
  const counterpart = mappings
    .map((m) =>
      m.source_section_id === section.id
        ? `${m.target_act} Section ${m.target_number}`
        : `${m.source_act} Section ${m.source_number}`,
    )
    .join(", ");

  return {
    title: `${section.acts.abbreviation} Section ${section.number} — ${section.marginal_note}`,
    description:
      `${section.acts.abbreviation} Section ${section.number} (${section.marginal_note}), ${section.acts.title}.` +
      (counterpart ? ` Corresponds to ${counterpart} with what-changed notes.` : "") +
      " Full text, free on Vidhara.",
    alternates: { canonical: `/acts/${slug}/${encodeURIComponent(section.number)}` },
  };
}

export default async function SectionPage({ params }: { params: Promise<Params> }) {
  const { slug, number } = await params;
  const section = await getSectionWithAct(slug, decodeURIComponent(number));
  if (!section) notFound();

  const [mappings, adjacent] = await Promise.all([
    getMappingsForSection(section.id),
    getAdjacentSections(section.act_id, section.sort_key),
  ]);
  const isSample = section.provenance?.startsWith("dev-sample");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Legislation",
    name: `${section.acts.abbreviation} Section ${section.number} — ${section.marginal_note}`,
    legislationIdentifier: `${section.acts.abbreviation} §${section.number}`,
    isPartOf: { "@type": "Legislation", name: section.acts.title },
    legislationJurisdiction: "IN",
    inLanguage: "en",
    url: `${SITE_URL}/acts/${slug}/${encodeURIComponent(section.number)}`,
  };

  return (
    <PageShell>
      <TrackEvent
        name="section_viewed"
        props={{ act: section.acts.abbreviation, number: section.number }}
        readVia
      />
      {mappings.map((m) => (
        <TrackEvent
          key={`t-${m.mapping_id}`}
          name="mapping_card_viewed"
          props={{
            mapping_type: m.mapping_type,
            source_act: m.source_act,
            target_act: m.target_act,
          }}
        />
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-small text-text-muted" aria-label="Breadcrumb">
        <Link href="/acts" className="hover:text-text">
          Bare Acts
        </Link>{" "}
        /{" "}
        <Link href={`/acts/${slug}`} className="hover:text-text">
          {section.acts.abbreviation}
        </Link>{" "}
        / §{section.number}
      </nav>

      <RecordRecent
        act={section.acts.abbreviation}
        slug={slug}
        number={section.number}
        note={section.marginal_note}
      />

      <article className="mt-3">
        <p className="text-small text-text-muted">{section.acts.title}</p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <h1 className="max-w-measure font-serif text-h1 font-semibold text-text">
            §{section.number} — {section.marginal_note}
          </h1>
          <BookmarkButton
            act={section.acts.abbreviation}
            slug={slug}
            number={section.number}
            note={section.marginal_note}
          />
        </div>

        {isSample ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-warning px-3 py-1 text-micro text-text-muted">
            🧪 Sample content — official text ingestion in progress
          </p>
        ) : null}

        <div className="mt-6">
          <MarkdownLite>{section.body_md}</MarkdownLite>
        </div>
      </article>

      {mappings.length > 0 ? (
        <section className="mt-10 space-y-4" aria-labelledby="mapping-heading">
          <h2 id="mapping-heading" className="text-h2 font-semibold text-text">
            Old law ⇄ new law
          </h2>
          {mappings.map((mapping) => (
            <MappingPanel key={mapping.mapping_id} mapping={mapping} />
          ))}
        </section>
      ) : null}

      <SectionNav slug={slug} prev={adjacent.prev} next={adjacent.next} />

      <div className="mt-8">
        <FakeDoor
          feature="ai_explain"
          title="Explain this section with AI"
          description="Plain-language breakdown, grounded in this section's own text"
        />
      </div>

      <SectionShare
        act={section.acts.abbreviation}
        number={section.number}
        note={section.marginal_note}
        counterpart={(() => {
          const m = mappings[0];
          if (!m) return "";
          return m.source_section_id === section.id
            ? m.target_act
              ? `${m.target_act} §${m.target_number}`
              : ""
            : m.source_act
              ? `${m.source_act} §${m.source_number}`
              : "";
        })()}
        url={`${SITE_URL}/acts/${slug}/${encodeURIComponent(section.number)}`}
        bodyText={section.body_plain}
      />

      <FeedbackWidget />
    </PageShell>
  );
}
