import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ACT_SLUG, parseOrderRuleRef, parseSectionRef } from "@nexlex/shared";

import { MissingContentForm } from "@/components/missing-content-form";
import { OrderRuleNotice } from "@/components/order-rule-notice";
import { OrderRuleResults } from "@/components/order-rule-results";
import { SearchBox } from "@/components/search-box";
import { SearchResults } from "@/components/search-results";
import { PageShell } from "@/components/site-chrome";
import {
  askSections,
  findOrdersByNumber,
  searchOrderRules,
  searchSections,
} from "@/features/acts/queries";
import { TrackEvent } from "@/lib/analytics";

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

  // A Schedule reference ("Order 7 Rule 11") is resolved before searching, so
  // the reader is taken to the rule rather than handed the sections that FTS
  // matches on the bare digit.
  const orderRule = query ? parseOrderRuleRef(query) : null;
  const orderMatches = orderRule ? await findOrdersByNumber("cpc", orderRule.order) : [];

  // Sections and Orders are searched together but reported separately — the
  // Orders were published behind an index nothing queried, so "rejection of
  // plaint" found only sections and Order VII Rule 11 was unreachable.
  const [hits, ruleHits] = query
    ? await Promise.all([searchSections(query), searchOrderRules(query)])
    : [[], []];
  // Plain FTS found nothing → let the grounded AI librarian interpret the
  // question (e.g. "anticipatory bail" → "bail to person apprehending arrest")
  // and re-search the real corpus. Results are always real sections (D-004).
  // Only when NOTHING was found. Firing on empty sections alone would spend an
  // AI call — and print "no exact match" — over a query the Orders answered.
  const assisted =
    query && hits.length === 0 && ruleHits.length === 0 ? await askSections(query) : null;

  return (
    <PageShell>
      <h1 className="font-serif text-h1 font-semibold text-text">Ask or search</h1>
      <p className="mt-2 max-w-measure text-body text-text-muted">
        Ask in plain words (&ldquo;anticipatory bail&rdquo;, &ldquo;punishment for cheating&rdquo;)
        or jump straight to a reference (&ldquo;420 IPC&rdquo;) — we take you to the actual law to
        read.
      </p>

      <div className="mt-6 max-w-2xl">
        <SearchBox initialQuery={query} autoFocus={!query} />
      </div>

      {orderRule ? (
        <div className="mt-6 max-w-2xl">
          <OrderRuleNotice value={orderRule} matches={orderMatches} />
        </div>
      ) : null}

      {query && hits.length > 0 ? (
        <>
          <p className="mt-6 text-small text-text-muted">
            {hits.length} result{hits.length === 1 ? "" : "s"} for “{query}”
          </p>
          <SearchResults query={query} hits={hits} />
        </>
      ) : null}

      {query ? <OrderRuleResults hits={ruleHits} /> : null}

      {query && hits.length === 0 && assisted && assisted.results.length > 0 ? (
        <>
          <TrackEvent name="ask_ai_assisted" props={{ found: assisted.results.length }} />
          <p className="mt-6 text-small text-text-muted">
            No exact match for “{query}” — here’s the closest law to read
            {assisted.interpretedAs?.length
              ? ` (read as “${assisted.interpretedAs[0]}”)`
              : ""}
            :
          </p>
          <SearchResults query={query} hits={assisted.results} />
          <p className="mt-3 text-micro text-text-faint">
            Interpreted your question to find the provision — always read the section itself to
            confirm it fits.
          </p>
        </>
      ) : null}

      {query &&
      hits.length === 0 &&
      ruleHits.length === 0 &&
      (!assisted || assisted.results.length === 0) ? (
        <>
          {assisted ? <TrackEvent name="ask_ai_assisted" props={{ found: 0 }} /> : null}
          <p className="mt-6 text-body text-text-muted">
            Nothing matches “{query}”. Try different words, or a reference like “302 IPC” or
            “Order 7 Rule 11”.
          </p>
          <MissingContentForm query={query} />
        </>
      ) : null}
    </PageShell>
  );
}
