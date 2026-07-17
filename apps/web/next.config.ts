import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

import pkg from "./package.json" with { type: "json" };

const nextConfig: NextConfig = {
  transpilePackages: ["@nexlex/shared", "@nexlex/db", "@nexlex/tokens"],
  env: {
    // Surfaced to analytics/Sentry as the release identifier.
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
};

// Source-map upload runs only when SENTRY_AUTH_TOKEN/org/project are present
// (i.e. on Vercel); local builds just skip it with a warning.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  disableLogger: true,
  widenClientFileUpload: true,
});
