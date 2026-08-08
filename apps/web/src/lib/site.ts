/**
 * Canonical site origin for metadata, sitemap, share links, and JSON-LD.
 *
 * Live since 2026-08-08 on the Bahukhandi Labs umbrella. The default is the real
 * domain rather than the Vercel one so that preview deploys and local dev emit
 * correct absolute URLs without needing the env var set; NEXT_PUBLIC_SITE_URL
 * still overrides, which is how a staging origin would be pointed elsewhere.
 *
 * vidhara-web-lyart.vercel.app stays served by Vercel alongside this — links
 * shared before the cutover must not rot.
 *
 * NOTE: nexlex.in belongs to an unrelated law firm — never point here.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://vidhara.bahukhandi-labs.com";
