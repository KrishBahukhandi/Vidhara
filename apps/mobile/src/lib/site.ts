/**
 * Public web origin — shared section links point here so recipients who don't
 * have the app can still read the law. Mirrors apps/web's SITE_URL; keep the two
 * in step, since a share link that 404s is worse than no share button.
 */
export const WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL ?? "https://vidhara.bahukhandi-labs.com";
