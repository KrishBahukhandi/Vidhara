import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ACT_SLUG, parseSectionRef } from "@nexlex/shared";

import { MissingContentForm } from "@/components/missing-content-form";
import { SearchBox } from "@/components/search-box";
import { SearchResults } from "@/components/search-results";
import { PageShell } from "@/components/site-chrome";
import { searchSections } from "@/features/acts/queries";

export const metadata: Metadata = {
  title: "Search the library",
  description:
    "Full-text search across 3,000+ sections of Indian bare acts — by concept (cheating, bail, dowry death) or by section number (420 IPC, BNS 103).",
  robots: { index: false, follow: true }, // results pages shouldn't compete with section pages in Google
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 120);

  // Confident section refs skip results entirely (architecture.md §8).
  const ref = query ? parseSectionRef(query) : null;
  if (ref?.act) {
    redirect(`/acts/${ACT_SLUG[ref.act]}/${encodeURIComponent(ref.section)}?via=search`);
  }

  const hits = query ? await searchSections(query) : [];

  return (
    <PageShell>
      <h1 className="font-serif text-h1 font-semibold text-text">Search</h1>
      <p className="mt-2 max-w-measure text-body text-text-muted">
        Every section of every act in the library — search a concept (&ldquo;cheating&rdquo;,
        &ldquo;electronic evidence&rdquo;) or jump straight to a reference (&ldquo;420 IPC&rdquo;).
      </p>

      <div className="mt-6 max-w-2xl">
        <SearchBox initialQuery={query} autoFocus={!query} />
      </div>

      {query ? (
        hits.length > 0 ? (
          <>
            <p className="mt-6 text-small text-text-muted">
              {hits.length} result{hits.length === 1 ? "" : "s"} for “{query}”
            </p>
            <SearchResults query={query} hits={hits} />
          </>
        ) : (
          <>
            <p className="mt-6 text-body text-text-muted">
              No sections match “{query}”. Try a different word, or a section reference like
              “302 IPC”.
            </p>
            <MissingContentForm query={query} />
          </>
        )
      ) : null}
    </PageShell>
  );
}
