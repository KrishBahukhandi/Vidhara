// Next.js server/edge instrumentation hook — loads the Sentry runtime configs.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export async function onRequestError(...args: unknown[]) {
  const Sentry = await import("@sentry/nextjs");
  // @ts-expect-error — Sentry's captureRequestError signature tracks Next internals
  Sentry.captureRequestError(...args);
}
