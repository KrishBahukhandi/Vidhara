"use client";

import Link from "next/link";

import { useSession } from "@/features/auth/session";

/**
 * The header/menu entry for signing in. A client island inside otherwise
 * server-rendered chrome, because the answer lives in localStorage.
 *
 * Renders nothing while the session is unknown rather than guessing
 * "Sign in" — a link that appears and then changes wording on hydration is
 * worse than one that arrives a beat late, and every page on this site is
 * server-rendered with no session at all.
 */
export function AccountLink({ className }: { className?: string }) {
  const session = useSession();
  if (session.status === "loading") return null;

  return (
    <Link href="/account" className={className}>
      {session.status === "signed-in" ? "Account" : "Sign in"}
    </Link>
  );
}
