"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useReadingMode } from "@/lib/use-reading-mode";

/**
 * Floating feedback control — pinned bottom-right on every page so the
 * suggestions channel is always one tap away (a footer link alone gets ~zero
 * submissions). Hidden on /feedback itself. Safe-area aware for phones with
 * gesture bars.
 *
 * Labelled pill from `sm:` up, bare circle below it. On a 400px-wide phone the
 * pill was ~200px of permanent overlay sitting on top of whatever you were
 * reading — on the library index it covered a different act card at every
 * scroll position. The circle keeps the affordance at the same tap size and
 * gives the text back its column. PageShell's bottom padding clears the
 * control so the last line of a page is never underneath it.
 */
export function FeedbackFab() {
  const pathname = usePathname();
  const reading = useReadingMode();
  if (pathname === "/feedback") return null;

  return (
    <Link
      href="/feedback"
      aria-label="Suggest an improvement"
      title="Suggest an improvement"
      data-reading={reading}
      className="lift yields fixed bottom-4 right-4 z-40 inline-flex h-11 w-11 items-center justify-center gap-2 rounded-full bg-brand text-small font-medium text-on-brand shadow-lg hover:opacity-95 sm:bottom-6 sm:right-6 sm:w-auto sm:pl-4 sm:pr-5"
      // Lift above the phone's gesture bar without distorting the pill's height.
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <span aria-hidden className="text-body leading-none">
        💬
      </span>
      <span className="hidden sm:inline">Feedback</span>
    </Link>
  );
}
