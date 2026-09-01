import Link from "next/link";

import type { ChapterListItem } from "@/features/acts/queries";
import { chapterLabel } from "@/lib/chapter-anchors";

/**
 * Jump straight to a chapter of an act.
 *
 * The BNSS lists 531 sections on one page and the Constitution 470 articles;
 * until now the only ways in were the filter box (which needs you to know what
 * you are looking for) and the scrollbar. A reader who wants "the chapter on
 * bail" had no way to ask for it.
 *
 * Server-rendered, and real links rather than scroll handlers, for two reasons:
 * it works before hydration and without JavaScript, and a crawler that meets an
 * act page finds a labelled route to every division of the act instead of one
 * undifferentiated list of five hundred numbers. On a corpus this size internal
 * links with real anchor text are most of what tells a search engine how the
 * thing is organised.
 */
export function ChapterNav({
  chapters,
  anchors,
}: {
  chapters: ChapterListItem[];
  anchors: Record<string, string>;
}) {
  if (chapters.length < 2) return null;

  return (
    <nav className="mt-6 rounded-md border border-border bg-surface p-4" aria-label="Chapters">
      <p className="text-small font-semibold uppercase tracking-wide text-text-muted">
        Jump to a chapter
      </p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {chapters.map((chapter) => (
          <li key={chapter.id} className="max-w-full">
            <Link
              href={`#${anchors[chapter.id] ?? ""}`}
              className="text-small text-text-muted transition-colors hover:text-brand">
              <span className="font-mono font-semibold text-brand">{chapterLabel(chapter)}</span>
              {chapter.unnumbered ? "" : ` ${chapter.title}`}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

