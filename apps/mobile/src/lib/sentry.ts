/**
 * Crash reporting — mobile.
 *
 * Same posture as the web client (D-065's session added that one): errors only,
 * no performance tracing, and completely inert without a DSN so the app runs
 * unchanged until the founder pastes one. It activates on the next build rather
 * than the next launch, because EXPO_PUBLIC_* values are inlined at build time —
 * the same trap that made the web's first Sentry deploy a no-op when Vercel
 * reused its build cache.
 *
 * UNLIKE the web, this has never reported a real error, because the app has not
 * been built on a device since it was added. Treat the first `expo run:android`
 * as the verification, not this file.
 */
import * as Sentry from "@sentry/react-native";

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const isCrashReportingConfigured = Boolean(DSN);

export function initCrashReporting(): void {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    // Errors only. The free tier's quota is for crashes, and a beta of 30-50
    // users learns nothing from traces it will not read.
    tracesSampleRate: 0,
    // The app is usable signed-out and holds privileged client matter in the
    // case diary (D-029), so nothing that could carry it is attached: no
    // screenshots, no view hierarchy, no request bodies.
    attachScreenshot: false,
    attachViewHierarchy: false,
    sendDefaultPii: false,
    environment: __DEV__ ? "development" : "production",
    // Dev crashes are the founder's own; they should not spend quota or muddy
    // the release's error rate.
    enabled: !__DEV__,
  });
}

/** Report a handled error with context, for paths that catch and continue. */
export function reportError(error: unknown, context?: Record<string, string>): void {
  if (!DSN || __DEV__) return;
  Sentry.captureException(error, context ? { tags: context } : undefined);
}
