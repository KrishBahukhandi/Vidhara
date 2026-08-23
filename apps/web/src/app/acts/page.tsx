import type { Metadata } from "next";

import { ActLibrary, type LibraryAct } from "@/components/act-library";
import { PageShell } from "@/components/site-chrome";
import { countSectionsByAct, listActs } from "@/features/acts/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Bare Acts Library — Indian statutes, structured and searchable",
  description:
    "All 36 Indian bare acts, section by section: BNS, BNSS, BSA, IPC, CrPC, Evidence Act, the Constitution, Contract Act, CPC, NI Act, POCSO, Hindu Marriage, Limitation, Motor Vehicles and more — free.",
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

  return (
    <PageShell>
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
