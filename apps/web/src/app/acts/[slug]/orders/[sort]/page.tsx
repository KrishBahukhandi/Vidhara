import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownLite } from "@/components/markdown-lite";
import { PageShell } from "@/components/site-chrome";
import { getActBySlug, getOrderWithRules, listOrders } from "@/features/acts/queries";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; sort: string }>;
}): Promise<Metadata> {
  const { slug, sort } = await params;
  const [act, order] = await Promise.all([
    getActBySlug(slug),
    getOrderWithRules(slug, Number(sort)),
  ]);
  if (!act || !order) return {};
  return {
    title: `${act.abbreviation} Order ${order.number} — ${order.title}`,
    description: `Order ${order.number} (${order.title}) of the ${act.title}'s First Schedule: all ${order.rules.length} rules, full text, free.`,
    alternates: { canonical: `/acts/${slug}/orders/${sort}` },
  };
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ slug: string; sort: string }>;
}) {
  const { slug, sort } = await params;
  const sortOrder = Number(sort);
  if (!Number.isInteger(sortOrder)) notFound();

  const [act, order, all] = await Promise.all([
    getActBySlug(slug),
    getOrderWithRules(slug, sortOrder),
    listOrders(slug),
  ]);
  if (!act || !order) notFound();

  const idx = all.findIndex((o) => o.sortOrder === sortOrder);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
  // Two Orders can share a number (the Commercial Courts Act substituted a
  // parallel Order XI), so say which this is rather than let them look alike.
  const sameNumber = all.filter((o) => o.number === order.number);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Legislation",
    name: `${act.abbreviation} Order ${order.number} — ${order.title}`,
    legislationIdentifier: `${act.abbreviation} Order ${order.number}`,
    isPartOf: { "@type": "Legislation", name: `${act.title}, First Schedule` },
    legislationJurisdiction: "IN",
    inLanguage: "en",
    url: `${SITE_URL}/acts/${slug}/orders/${sort}`,
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
          {act.abbreviation}
        </Link>{" "}
        /{" "}
        <Link href={`/acts/${slug}/orders`} className="hover:text-text">
          Orders
        </Link>{" "}
        / {order.number}
      </nav>

      <h1 className="mt-3 font-serif text-h1 font-semibold text-text">
        Order {order.number} — {order.title}
      </h1>
      <p className="mt-1 text-small text-text-muted">
        {act.abbreviation} First Schedule · {order.rules.length} rules
      </p>

      {sameNumber.length > 1 ? (
        <p className="mt-4 max-w-measure rounded-md border border-warning p-4 text-small text-text-muted">
          <strong className="font-semibold text-text">
            There are {sameNumber.length} Orders numbered {order.number}.
          </strong>{" "}
          The Commercial Courts Act substituted a parallel Order for suits before a Commercial
          Division, and the source prints both. Check which applies:{" "}
          {sameNumber.map((o, i) => (
            <span key={o.id}>
              {i > 0 ? " · " : ""}
              <Link
                href={`/acts/${slug}/orders/${o.sortOrder}`}
                className={
                  o.sortOrder === sortOrder
                    ? "font-semibold text-text"
                    : "underline underline-offset-4 hover:text-text"
                }>
                {o.title}
              </Link>
            </span>
          ))}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-8">
        {order.rules.map((r) => (
          <article key={r.number} id={`rule-${r.number}`} className="scroll-mt-20">
            <h2 className="font-serif text-h3 font-semibold text-text">
              <span className="font-mono text-text-muted">{r.number}.</span> {r.marginalNote}
            </h2>
            <div className="mt-2 max-w-measure font-serif text-body leading-relaxed text-text">
              <MarkdownLite>{r.bodyMd}</MarkdownLite>
            </div>
          </article>
        ))}
      </div>

      <nav className="mt-12 flex justify-between gap-4 border-t border-border pt-6 text-small">
        {prev ? (
          <Link href={`/acts/${slug}/orders/${prev.sortOrder}`} className="hover:text-brand">
            ← Order {prev.number} · {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/acts/${slug}/orders/${next.sortOrder}`}
            className="text-right hover:text-brand">
            Order {next.number} · {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </PageShell>
  );
}
