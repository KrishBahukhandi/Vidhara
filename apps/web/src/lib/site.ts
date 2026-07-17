/**
 * Canonical site origin for metadata, sitemap, share links, and JSON-LD.
 * Default is the current Vercel deployment; override NEXT_PUBLIC_SITE_URL once
 * the real domain is live (Bahukhandi Labs umbrella — Vidhara's own domain TBD).
 * NOTE: nexlex.in belongs to an unrelated law firm — never point here.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vidhara-web-lyart.vercel.app";
