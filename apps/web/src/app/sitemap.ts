import type { MetadataRoute } from "next";

import { listActs, listAllSectionPaths } from "@/features/acts/queries";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/acts`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/mapping`, changeFrequency: "weekly", priority: 0.9 },
  ];

  const [acts, sectionPaths] = await Promise.all([listActs(), listAllSectionPaths()]);

  return [
    ...staticEntries,
    ...acts.map((act) => ({
      url: `${SITE_URL}/acts/${act.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...sectionPaths.map(({ slug, number }) => ({
      url: `${SITE_URL}/acts/${slug}/${encodeURIComponent(number)}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
