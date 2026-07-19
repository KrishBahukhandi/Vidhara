"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Floating "Feedback" pill — pinned bottom-right on every page so the
 * suggestions channel is always one tap away (a footer link alone gets ~zero
 * submissions). Hidden on /feedback itself. Kept small and quiet per
 * design.md; safe-area aware for phones with gesture bars.
 */
export function FeedbackFab() {
  const pathname = usePathname();
  if (pathname === "/feedback") return null;

  return (
    <Link
      href="/feedback"
      aria-label="Suggest an improvement"
      className="lift fixed bottom-4 right-4 z-40 inline-flex h-11 items-center gap-2 rounded-full bg-brand pl-4 pr-5 text-small font-medium text-on-brand shadow-lg hover:opacity-95 sm:bottom-6 sm:right-6"
      // Lift above the phone's gesture bar without distorting the pill's height.
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <span aria-hidden className="text-body leading-none">
        💬
      </span>
      Feedback
    </Link>
  );
}
