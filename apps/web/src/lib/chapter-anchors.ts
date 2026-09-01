import type { ChapterListItem } from "@/features/acts/queries";

/**
 * A readable fragment for every division of an act, unique within it.
 *
 * Readable because it ends up in the address bar and in shared links —
 * `/acts/bns#ch-v` is a citation a reader can understand, `#ch-9f3a…` is a
 * database id leaking into the URL. Unique because a division's number is not:
 * the Arbitration Act prints a CHAPTER I under both PART I and PART II, so the
 * part is part of the key, and anything still colliding after that is numbered
 * rather than silently overwritten — two anchors with the same name would send
 * the reader to whichever the browser found first.
 *
 * Computed once per act and passed to everything that needs it, so the act
 * page's jump list, the section list it scrolls to, and the chapter link on a
 * section page can never disagree about where a chapter is.
 *
 * A plain object rather than a Map because it crosses the server/client
 * boundary into the section list.
 */
export function chapterAnchors(chapters: ChapterListItem[]): Record<string, string> {
  const slug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const anchors: Record<string, string> = {};
  const used = new Map<string, number>();
  for (const chapter of chapters) {
    const kind = chapter.kind === "part" ? "part" : "ch";
    const base =
      slug([chapter.part_number, chapter.number].filter(Boolean).join("-")) ||
      slug(chapter.title) ||
      "division";
    let anchor = `${kind}-${base}`;
    const seen = used.get(anchor);
    if (seen !== undefined) {
      used.set(anchor, seen + 1);
      anchor = `${anchor}-${seen + 1}`;
    } else {
      used.set(anchor, 1);
    }
    anchors[chapter.id] = anchor;
  }
  return anchors;
}

/** How a division is named in a jump list or a link: "Ch. V", "Part III". */
export function chapterLabel(chapter: ChapterListItem): string {
  if (chapter.unnumbered) return chapter.title;
  return `${chapter.kind === "part" ? "Part" : "Ch."} ${chapter.number}`;
}
