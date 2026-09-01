import type { MetadataRoute } from "next";

import {
  listActs,
  listAllSectionPaths,
  listAppendicesByAct,
  listOrdersByAct,
  listSchedulePaths,
} from "@/features/acts/queries";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/acts`, changeFrequency: "daily", priority: 0.9 },
    // Listed low rather than left out: both are linked from every page's
    // footer, and a URL a crawler keeps meeting but never sees declared reads
    // as an oversight. Neither competes with a section page for anything.
    { url: `${SITE_URL}/feedback`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
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
  // else links to deeply — and its Appendices are the forms.
  //
  // Two queries for the whole corpus, not two per act. Asking each of the 36
  // acts individually was 72 round trips to discover what one query says: only
  // the CPC has either. Sequentially that walked the sitemap up to Next's
  // 60-second export limit; making them concurrent instead put 72 more requests
  // against a pool the rest of the build is already using, and the export then
  // failed all three attempts — a failed deploy on Vercel either way.
  const [ordersByAct, appendicesByAct, schedulesByAct] = await Promise.all([
    listOrdersByAct(),
    listAppendicesByAct(),
    listSchedulePaths(),
  ]);

  const orderEntries: MetadataRoute.Sitemap = [...ordersByAct].flatMap(([slug, orders]) => [
    {
      url: `${SITE_URL}/acts/${slug}/orders`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    ...orders.map((o) => ({
      url: `${SITE_URL}/acts/${slug}/orders/${o.sortOrder}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ]);

  // Schedules that are tables or lists rather than sections — the Limitation
  // Act's, and the Constitution's Seventh, whose three Lists answer "who may
  // legislate on this?" and are among the most searched-for text in the
  // document. Nothing else links to them deeply.
  const scheduleEntries: MetadataRoute.Sitemap = [...schedulesByAct].flatMap(([slug, schedules]) =>
    schedules.map((schedule) => ({
      url: `${SITE_URL}/acts/${slug}/schedule/${schedule.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  );

  const appendixEntries: MetadataRoute.Sitemap = [...appendicesByAct].flatMap(([slug, appendices]) => [
    {
      url: `${SITE_URL}/acts/${slug}/appendices`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    ...appendices.map((a) => ({
      url: `${SITE_URL}/acts/${slug}/appendices/${a.letter}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ]);

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
  // The two pages that are indexes OF the corpus are as fresh as the freshest
  // thing in it — otherwise the hubs look static while everything beneath them
  // moves, which is the opposite of what is true.
  const corpusLastMod = [...actLastMod.values()].sort().pop();
  for (const entry of staticEntries) {
    if (entry.url === SITE_URL || entry.url === `${SITE_URL}/acts`) {
      entry.lastModified = corpusLastMod;
    }
  }

  return [
    ...staticEntries,
    ...orderEntries,
    ...appendixEntries,
    ...scheduleEntries,
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
