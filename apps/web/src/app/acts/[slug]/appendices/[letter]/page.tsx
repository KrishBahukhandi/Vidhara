import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/site-chrome";
import { getActBySlug, getAppendixWithForms } from "@/features/acts/queries";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; letter: string }>;
}): Promise<Metadata> {
  const { slug, letter } = await params;
  const [act, appendix] = await Promise.all([
    getActBySlug(slug),
    getAppendixWithForms(slug, letter),
  ]);
  if (!act || !appendix) return {};
  return {
    title: `${act.abbreviation} Appendix ${appendix.letter} — ${appendix.title}`,
    description: `Appendix ${appendix.letter} (${appendix.title}) of the ${act.title}: ${appendix.forms.length} forms, full text, free.`,
    alternates: { canonical: `/acts/${slug}/appendices/${appendix.letter}` },
  };
}

export default async function AppendixPage({
  params,
}: {
  params: Promise<{ slug: string; letter: string }>;
}) {
  const { slug, letter } = await params;
  const [act, appendix] = await Promise.all([
    getActBySlug(slug),
    getAppendixWithForms(slug, letter),
  ]);
  if (!act || !appendix) notFound();

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
        /{" "}
        <Link href={`/acts/${slug}/appendices`} className="hover:text-text">
          Appendices
        </Link>{" "}
        / {appendix.letter}
      </nav>

      <h1 className="mt-3 font-serif text-h1 font-semibold text-text">
        Appendix {appendix.letter} — {appendix.title}
      </h1>
      <p className="mt-1 text-small text-text-muted">
        {act.abbreviation} · {appendix.forms.length}{" "}
        {appendix.kind === "prose"
          ? appendix.forms.length === 1
            ? "provision"
            : "provisions"
          : "forms"}
      </p>

      <div className="mt-8 flex flex-col gap-10">
        {appendix.forms.map((f, i) => (
          <article key={`${f.number}-${i}`} id={`form-${i}`} className="scroll-mt-20">
            {/* A FORM is numbered and titled ("No. 1 — Summons to defendant");
                a provision of a prose appendix is a section, and printing
                "No." in front of it would read as a form number it does not
                have. An unnumbered one — Appendix III is a single declaration
                — gets no heading at all rather than an empty one. */}
            {appendix.kind === "prose" ? (
              f.number || f.title ? (
                <h2 className="font-serif text-h3 font-semibold text-text">
                  {f.number ? `${f.number}. ` : ""}
                  {f.title}
                </h2>
              ) : null
            ) : (
              <h2 className="font-serif text-h3 font-semibold text-text">
                <span className="font-mono text-text-muted">No. {f.number}</span> {f.title}
              </h2>
            )}
            {/* A form is a layout as much as a text: its line breaks and dotted
                blanks are the template, so it is rendered pre-line. Prose is
                set as prose — frozen wrapping would be the page's, not the
                statute's. */}
            {appendix.kind === "prose" ? (
              <p className="mt-3 max-w-measure text-body leading-relaxed text-text">{f.bodyMd}</p>
            ) : (
              <pre className="mt-3 max-w-measure whitespace-pre-line font-serif text-body leading-relaxed text-text">
                {f.bodyMd}
              </pre>
            )}
          </article>
        ))}
      </div>
    </PageShell>
  );
}
