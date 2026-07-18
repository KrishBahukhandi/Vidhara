import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActSectionList } from "@/components/act-section-list";
import { PageShell } from "@/components/site-chrome";
import {
  getActBySlug,
  listActs,
  listChaptersByAct,
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

  const [sections, chapters] = await Promise.all([
    listSectionsByAct(slug),
    listChaptersByAct(slug),
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
