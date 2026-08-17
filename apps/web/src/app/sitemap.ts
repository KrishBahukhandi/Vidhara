import type { MetadataRoute } from "next";

import { listActs, listAllSectionPaths, listOrders } from "@/features/acts/queries";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/acts`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/mapping`, changeFrequency: "weekly", priority: 0.9 },
    // Quiz surfaces: the daily question changes every day, practice is evergreen.
    { url: `${SITE_URL}/daily`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/practice`, changeFrequency: "weekly", priority: 0.7 },
    // Advocate track — its own search intent ("quick section lookup in court").
    { url: `${SITE_URL}/cite`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/limitation`, changeFrequency: "weekly", priority: 0.7 },
    // The trust page carries the claim the whole corpus rests on; "is <app>
    // accurate" is a real query for anyone deciding what to cite from.
    { url: `${SITE_URL}/verification`, changeFrequency: "monthly", priority: 0.8 },
  ];

  const [acts, sectionPaths] = await Promise.all([listActs(), listAllSectionPaths()]);

  // The CPC's First Schedule is its own list of pages — 57 Orders that nothing
  // else links to deeply.
  const orderEntries: MetadataRoute.Sitemap = [];
  for (const act of acts) {
    const orders = await listOrders(act.slug);
    if (orders.length === 0) continue;
    orderEntries.push({
      url: `${SITE_URL}/acts/${act.slug}/orders`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    });
    for (const o of orders) {
      orderEntries.push({
        url: `${SITE_URL}/acts/${act.slug}/orders/${o.sortOrder}`,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      });
    }
  }

  // `lastModified` comes from each section's own updated_at, which the
  // act_sections touch trigger maintains — so a content repair (and this
  // corpus has had many) tells Google that page is worth recrawling, while
  // the untouched thousands do not compete for the same crawl budget. A
  // sitemap without it asks Google to guess across 5,600 URLs on a domain
  // young enough to have little crawl budget to spend.
  const actLastMod = new Map<string, string>();
  for (const { slug, updatedAt } of sectionPaths) {
    const current = actLastMod.get(slug);
    if (!current || updatedAt > current) actLastMod.set(slug, updatedAt);
  }

  return [
    ...staticEntries,
    ...orderEntries,
    ...acts.map((act) => ({
      url: `${SITE_URL}/acts/${act.slug}`,
      // An act page is a list of its sections, so it is as fresh as its
      // freshest section.
      lastModified: actLastMod.get(act.slug),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...sectionPaths.map(({ slug, number, updatedAt }) => ({
      url: `${SITE_URL}/acts/${slug}/${encodeURIComponent(number)}`,
      lastModified: updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
