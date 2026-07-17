"use client";

import { track } from "@/lib/analytics";
import { useBookmarks } from "@/lib/local-library";

/** Save/unsave a section locally (no account — D-007). Fires bookmark events. */
export function BookmarkButton({
  act,
  slug,
  number,
  note,
}: {
  act: string;
  slug: string;
  number: string;
  note: string;
}) {
  const { isBookmarked, toggle } = useBookmarks();
  const saved = isBookmarked(slug, number);

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => {
        const nowSaved = toggle({ act, slug, number, note });
        track(nowSaved ? "bookmark_added" : "bookmark_removed", { act, number });
      }}
      className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-small font-medium transition-colors ${
        saved
          ? "border-brand bg-brand text-on-brand"
          : "border-border text-text-muted hover:border-brand hover:text-text"
      }`}>
      <span aria-hidden>{saved ? "★" : "☆"}</span>
      {saved ? "Saved" : "Save"}
    </button>
  );
}
