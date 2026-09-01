import type { Metadata } from "next";

import { ActLibrary, type LibraryAct } from "@/components/act-library";
import { PageShell } from "@/components/site-chrome";
import { countSectionsByAct, listActs } from "@/features/acts/queries";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Bare Acts Library — Indian statutes, structured and searchable",
  description:
    "All 36 Indian bare acts, section by section: BNS, BNSS, BSA, IPC, CrPC, Evidence Act, the Constitution, Contract Act, CPC, NI Act, POCSO, Hindu Marriage, Limitation, Motor Vehicles and more — free.",
  alternates: { canonical: "/acts" },
};

export default async function ActsPage() {
  const acts = await listActs();
  const counts = await countSectionsByAct(acts.map((a) => a.id));

  const libraryActs: LibraryAct[] = acts.map((act) => ({
    id: act.id,
    slug: act.slug,
    abbreviation: act.abbreviation,
    title: act.title,
    year: act.year,
    status: act.status,
    sectionCount: counts.get(act.id) ?? 0,
  }));

  // The library index is the one page that names every act we carry, so it is
  // where the corpus is described as a set rather than as 36 unrelated pages.
  // An ItemList is also what a sitelinks block is built from.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Bare Acts Library",
    url: `${SITE_URL}/acts`,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: "Indian central legislation",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: libraryActs.length,
      itemListElement: libraryActs.map((act, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${act.title} (${act.abbreviation})`,
        url: `${SITE_URL}/acts/${act.slug}`,
      })),
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Bare Acts", item: `${SITE_URL}/acts` },
    ],
  };

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <h1 className="font-serif text-h1 font-semibold text-text">Bare Acts</h1>
      <p className="mt-2 max-w-measure text-body text-text-muted">
        Central legislation, structured section by section. New criminal laws carry verified
        mappings back to the codes they replace.
      </p>

      {acts.length === 0 ? (
        <p className="mt-8 text-body text-text-muted">
          The library is being ingested — check back shortly.
        </p>
      ) : (
        <ActLibrary acts={libraryActs} />
      )}
    </PageShell>
  );
}
