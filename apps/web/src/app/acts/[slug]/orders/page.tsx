import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/site-chrome";
import { getActBySlug, listOrders } from "@/features/acts/queries";
import { SITE_URL } from "@/lib/site";

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
    title: `${act.abbreviation} — Orders and Rules (First Schedule)`,
    description: `Every Order and Rule of the ${act.title}'s First Schedule — Order VII Rule 11, Order VIII Rule 6, Order XXXIX and the rest. Free, full text.`,
    alternates: { canonical: `/acts/${slug}/orders` },
  };
}

export default async function OrdersIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [act, orders] = await Promise.all([getActBySlug(slug), listOrders(slug)]);
  if (!act || orders.length === 0) notFound();

  const totalRules = orders.reduce((n, o) => n + o.ruleCount, 0);

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
        / Orders
      </nav>

      <h1 className="mt-3 font-serif text-h1 font-semibold text-text">
        The First Schedule — Orders and Rules
      </h1>
      <p className="mt-2 max-w-measure text-body text-text-muted">
        {act.title}. {orders.length} Orders, {totalRules} rules — the part of the Code civil
        practice runs on.
      </p>

      <ul className="mt-8 divide-y divide-border border-y border-border">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              href={`/acts/${slug}/orders/${o.sortOrder}`}
              className="flex items-baseline gap-4 py-3 transition-colors hover:text-brand">
              <span className="w-24 shrink-0 font-mono text-small text-text-muted">
                Order {o.number}
              </span>
              <span className="flex-1 text-body text-text">{o.title}</span>
              <span className="shrink-0 text-micro text-text-faint">{o.ruleCount} rules</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 max-w-measure text-micro text-text-faint">
        State amendments to these Orders are excluded — what you read here is the central Schedule.
        Verify against the{" "}
        <a
          href={act.source_url ?? SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4">
          official source
        </a>
        .
      </p>
    </PageShell>
  );
}
