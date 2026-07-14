import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/site-chrome";
import { listActs } from "@/features/acts/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Bare Acts Library — Indian statutes, structured and searchable",
  description:
    "Read Indian bare acts section by section: BNS, BNSS, BSA, IPC, CrPC, Evidence Act and more — free, structured, and mapped between old and new criminal laws.",
};

const STATUS_LABEL: Record<string, string> = {
  active: "In force",
  replaced: "Replaced",
  repealed: "Repealed",
};

export default async function ActsPage() {
  const acts = await listActs();

  return (
    <PageShell>
      <h1 className="font-serif text-h1 font-semibold text-text">Bare Acts</h1>
      <p className="mt-2 max-w-measure text-body text-text-muted">
        Central legislation, structured section by section. New criminal laws carry verified
        mappings back to the codes they replace.
      </p>

      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {acts.map((act) => (
          <li key={act.id}>
            <Link
              href={`/acts/${act.slug}`}
              className="flex items-center gap-4 rounded-md border border-border bg-surface p-4 transition-colors hover:border-brand">
              <span
                className={`min-w-16 rounded-sm px-2 py-1 text-center text-small font-bold ${
                  act.status === "active" ? "bg-brand text-on-brand" : "bg-border text-text-muted"
                }`}>
                {act.abbreviation}
              </span>
              <span>
                <span className="block font-medium text-text">{act.title}</span>
                <span className="block text-small text-text-muted">
                  {act.year} · {STATUS_LABEL[act.status] ?? act.status}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {acts.length === 0 ? (
        <p className="mt-8 text-body text-text-muted">The library is being ingested — check back shortly.</p>
      ) : null}
    </PageShell>
  );
}
