import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/site-chrome";
import { getActBySlug, listAppendices } from "@/features/acts/queries";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const act = await getActBySlug(slug);
  if (!act) return {};
  return {
    title: `${act.abbreviation} — Appendices (the forms)`,
    description: `The forms appended to the ${act.title}: plaints, written statements, decrees, execution and appeal forms. Free, full text.`,
    alternates: { canonical: `/acts/${slug}/appendices` },
  };
}

export default async function AppendicesIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [act, appendices] = await Promise.all([getActBySlug(slug), listAppendices(slug)]);
  if (!act || appendices.length === 0) notFound();
  const total = appendices.reduce((n, a) => n + a.formCount, 0);

  return (
    <PageShell>
      <nav className="text-small text-text-muted" aria-label="Breadcrumb">
        <Link href="/acts" className="hover:text-text">
          Bare Acts
        </Link>{" "}
        /{" "}
        <Link href={`/acts/${slug}`} className="hover:text-text">
          {act.abbreviation}
        </Link>{" "}
        / Appendices
      </nav>

      <h1 className="mt-3 font-serif text-h1 font-semibold text-text">Appendices — the forms</h1>
      <p className="mt-2 max-w-measure text-body text-text-muted">
        {appendices.length} appendices, {total} forms appended to the {act.title}. These are
        templates to copy rather than provisions to read — the dotted runs are the blanks as
        printed.
      </p>

      <ul className="mt-8 divide-y divide-border border-y border-border">
        {appendices.map((a) => (
          <li key={a.id}>
            <Link
              href={`/acts/${slug}/appendices/${a.letter}`}
              className="flex items-baseline gap-4 py-3 transition-colors hover:text-brand">
              <span className="w-28 shrink-0 font-mono text-small text-text-muted">
                Appendix {a.letter}
              </span>
              <span className="flex-1 text-body text-text">{a.title}</span>
              <span className="shrink-0 text-micro text-text-faint">{a.formCount} forms</span>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
