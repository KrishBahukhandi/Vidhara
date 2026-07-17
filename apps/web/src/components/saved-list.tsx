"use client";

import Link from "next/link";

import { useBookmarks } from "@/lib/local-library";

/** Renders the local bookmarks list (client — reads localStorage). */
export function SavedList() {
  const { bookmarks } = useBookmarks();

  if (bookmarks.length === 0) {
    return (
      <div className="mt-8 rounded-md border border-border bg-surface p-6">
        <p className="text-body text-text-muted">
          Nothing saved yet. Open any section and tap{" "}
          <span className="font-medium text-text">☆ Save</span> to keep it here — it stays on this
          device, no account needed.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href="/acts"
            className="inline-flex h-10 items-center rounded-md border border-border px-4 font-medium text-text transition-colors hover:border-brand">
            Browse the Bare Acts
          </Link>
          <Link
            href="/mapping"
            className="inline-flex h-10 items-center rounded-md border border-border px-4 font-medium text-text transition-colors hover:border-brand">
            IPC ⇄ BNS Mapping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ul className="mt-8 divide-y divide-border rounded-md border border-border bg-surface">
      {bookmarks.map((b) => (
        <li key={`${b.slug}-${b.number}`}>
          <Link
            href={`/acts/${b.slug}/${encodeURIComponent(b.number)}?via=bookmark`}
            className="flex items-baseline gap-4 px-4 py-3 transition-colors hover:bg-bg">
            <span className="min-w-16 font-mono text-small font-bold text-brand">
              {b.act} §{b.number}
            </span>
            <span className="font-medium text-text">{b.note}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
