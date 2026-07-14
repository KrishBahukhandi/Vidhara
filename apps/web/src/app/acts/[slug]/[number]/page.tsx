import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownLite } from "@/components/markdown-lite";
import { MappingPanel } from "@/components/mapping-panel";
import { PageShell } from "@/components/site-chrome";
import {
  getMappingsForSection,
  getSectionWithAct,
  listAllSectionPaths,
} from "@/features/acts/queries";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

interface Params {
  slug: string;
  number: string;
}

export async function generateStaticParams(): Promise<Params[]> {
  const paths = await listAllSectionPaths();
  return paths.map(({ slug, number }) => ({ slug, number }));
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
      " Full text, free on NexLex.",
    alternates: { canonical: `/acts/${slug}/${encodeURIComponent(section.number)}` },
  };
}

export default async function SectionPage({ params }: { params: Promise<Params> }) {
  const { slug, number } = await params;
  const section = await getSectionWithAct(slug, decodeURIComponent(number));
  if (!section) notFound();

  const mappings = await getMappingsForSection(section.id);
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

      <article className="mt-3">
        <p className="text-small text-text-muted">{section.acts.title}</p>
        <h1 className="mt-1 max-w-measure font-serif text-h1 font-semibold text-text">
          §{section.number} — {section.marginal_note}
        </h1>

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
    </PageShell>
  );
}
