"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** Root error boundary — reports to Sentry, shows a plain recovery screen. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-bg">
        <div className="max-w-md px-6 text-center">
          <h1 className="font-serif text-h1 font-semibold text-text">Something broke.</h1>
          <p className="mt-3 text-body text-text-muted">
            The error has been reported. Your reading position is safe — the statute text itself
            lives on the server.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex h-11 items-center rounded-md bg-brand px-5 font-medium text-on-brand">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
