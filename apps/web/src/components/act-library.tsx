"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ACT_GROUPS, GROUP_BY_SLUG, UNSHELVED } from "@/app/acts/act-groups";

export interface LibraryAct {
  id: string;
  slug: string;
  abbreviation: string;
  title: string;
  year: number | null;
  status: string;
  sectionCount: number;
}

const STATUS_LABEL: Record<string, string> = {
  active: "In force",
  replaced: "Replaced",
  repealed: "Repealed",
};

const nf = new Intl.NumberFormat("en-IN");

/**
 * The bare-acts library, shelved by subject with a filter across the whole set.
 *
 * Filtering matches abbreviation and title, so "contract", "ICA" and "1872"
 * all find the Indian Contract Act. While a filter is active the shelves are
 * dropped and the matches shown flat — the same choice ActSectionList makes,
 * for the same reason: once you are searching, the shelf you were browsing is
 * no longer the thing you are navigating by.
 */
export function ActLibrary({ acts }: { acts: LibraryAct[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return acts;
    return acts.filter(
      (a) =>
        a.abbreviation.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        String(a.year ?? "").includes(q),
    );
  }, [query, acts]);

  const shelves = useMemo(() => {
    const bySlug = new Map(acts.map((a) => [a.slug, a]));
    const out: { id: string; title: string; blurb: string; acts: LibraryAct[] }[] = [];
    const placed = new Set<string>();

    for (const group of ACT_GROUPS) {
      const members = group.slugs
        .map((s) => bySlug.get(s))
        .filter((a): a is LibraryAct => Boolean(a));
      members.forEach((a) => placed.add(a.slug));
      if (members.length) out.push({ ...group, acts: members });
    }

    const rest = acts.filter((a) => !placed.has(a.slug) && !GROUP_BY_SLUG.has(a.slug));
    if (rest.length) out.push({ ...UNSHELVED, acts: rest });
    return out;
  }, [acts]);

  const isFiltering = query.trim().length > 0;

  return (
    <>
      <div className="mt-6">
        <label htmlFor="library-filter" className="sr-only">
          Filter the library
        </label>
        <input
          id="library-filter"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Filter ${acts.length} acts — name, abbreviation or year`}
          className="h-11 w-full rounded-md border border-border bg-surface px-4 text-body text-text placeholder:text-text-faint focus:border-brand focus:outline-none"
        />
      </div>

      {isFiltering ? (
        <section className="mt-8" aria-label="Filter results">
          <p className="text-small text-text-muted">
            {filtered.length === 0
              ? "No act matches that."
              : `${filtered.length} of ${acts.length} acts`}
          </p>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {filtered.map((act) => (
              <ActCard key={act.id} act={act} />
            ))}
          </ul>
        </section>
      ) : (
        shelves.map((shelf) => (
          <section key={shelf.id} className="mt-10" aria-labelledby={`shelf-${shelf.id}`}>
            <h2 id={`shelf-${shelf.id}`} className="font-serif text-h2 font-semibold text-text">
              {shelf.title}
            </h2>
            <p className="mt-1 max-w-measure text-small text-text-muted">{shelf.blurb}</p>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {shelf.acts.map((act) => (
                <ActCard key={act.id} act={act} />
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}

function ActCard({ act }: { act: LibraryAct }) {
  return (
    <li>
      <Link
        href={`/acts/${act.slug}`}
        className="flex h-full items-center gap-4 rounded-md border border-border bg-surface p-4 transition-colors hover:border-brand">
        <span
          className={`min-w-16 rounded-sm px-2 py-1 text-center text-small font-bold ${
            act.status === "active" ? "bg-brand text-on-brand" : "bg-border text-text-muted"
          }`}>
          {act.abbreviation}
        </span>
        <span className="min-w-0">
          <span className="block font-medium text-text">{act.title}</span>
          <span className="block text-small text-text-muted">
            {act.year} · {STATUS_LABEL[act.status] ?? act.status}
            {act.sectionCount > 0 ? ` · ${nf.format(act.sectionCount)} sections` : ""}
          </span>
        </span>
      </Link>
    </li>
  );
}
