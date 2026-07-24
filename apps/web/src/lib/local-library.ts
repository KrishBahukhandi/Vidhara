"use client";

/**
 * Local-first reading library (docs/release-plan.md §V0.5, decision D-007):
 * recents + bookmarks in localStorage, no account, no server. This is the
 * minimum machinery to *observe* returning behaviour before we make anyone
 * sign up. Analytics events are fired by the CALLING components, never here —
 * this module stays side-effect-free beyond storage.
 */
import { useCallback, useEffect, useState } from "react";

export interface LibraryItem {
  slug: string;
  number: string;
  act: string;
  note: string;
  /** Saved/last-viewed epoch ms. */
  ts: number;
}

export type NewItem = Omit<LibraryItem, "ts">;

const RECENTS_KEY = "vidhara_recents";
const BOOKMARKS_KEY = "vidhara_bookmarks";
const RECENTS_CAP = 12;
/** Same-tab change signal (the native `storage` event only fires cross-tab). */
const SYNC_EVENT = "vidhara:library-change";

function read(key: string): LibraryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as LibraryItem[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, items: LibraryItem[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: key }));
  } catch {
    // storage full / disabled (private mode) — the feature degrades silently
  }
}

const sameSection = (a: { slug: string; number: string }, slug: string, number: string) =>
  a.slug === slug && a.number === number;

/** Record a section view into recents (most-recent-first, deduped, capped). */
export function recordRecent(item: NewItem): void {
  const rest = read(RECENTS_KEY).filter((i) => !sameSection(i, item.slug, item.number));
  write(RECENTS_KEY, [{ ...item, ts: Date.now() }, ...rest].slice(0, RECENTS_CAP));
}

/** Subscribe a component to one storage key; re-reads on same-tab + cross-tab change. */
function useLibrary(key: string): LibraryItem[] {
  const [items, setItems] = useState<LibraryItem[]>([]);
  useEffect(() => {
    // Populates AFTER hydration — first client render matches the server's
    // empty list, so there is no hydration mismatch.
    setItems(read(key));
    const refresh = () => setItems(read(key));
    window.addEventListener(SYNC_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SYNC_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [key]);
  return items;
}

export function useRecents(): LibraryItem[] {
  return useLibrary(RECENTS_KEY);
}

// —— Daily MCQ streak (local-first, same posture as recents/bookmarks) ——
const MCQ_KEY = "vidhara_mcq";

interface McqState {
  streak: number;
  /** IST date string (YYYY-MM-DD) of the last answered day. */
  lastDate: string | null;
  choice: number | null;
  correct: boolean | null;
}

const EMPTY_MCQ: McqState = { streak: 0, lastDate: null, choice: null, correct: null };

function readMcq(): McqState {
  if (typeof window === "undefined") return EMPTY_MCQ;
  try {
    const raw = window.localStorage.getItem(MCQ_KEY);
    const p = raw ? (JSON.parse(raw) as McqState) : null;
    if (p && typeof p.streak === "number") return p;
  } catch {
    /* corrupt/disabled storage → empty */
  }
  return EMPTY_MCQ;
}

const dayNum = (dateStr: string) => Math.floor(Date.parse(`${dateStr}T00:00:00Z`) / 86_400_000);

/**
 * Daily-MCQ local state: the running streak plus today's answer (so re-opening
 * the page shows the result, not a fresh question — it's one per day). `today`
 * is the IST date string from the daily-mcq function; pass null until loaded.
 */
export function useDailyMcq(today: string | null): {
  streak: number;
  answeredToday: boolean;
  todayChoice: number | null;
  todayCorrect: boolean | null;
  submit: (choice: number, correct: boolean) => void;
} {
  const [state, setState] = useState<McqState>(EMPTY_MCQ);
  useEffect(() => setState(readMcq()), []);

  const answeredToday = today != null && state.lastDate === today;
  // A streak is only "live" if the last answer was today or yesterday.
  const gap = today && state.lastDate ? dayNum(today) - dayNum(state.lastDate) : Infinity;
  const liveStreak = gap <= 1 ? state.streak : 0;

  const submit = useCallback(
    (choice: number, correct: boolean) => {
      if (!today) return;
      setState((prev) => {
        if (prev.lastDate === today) return prev; // already answered today
        const prevGap = prev.lastDate ? dayNum(today) - dayNum(prev.lastDate) : Infinity;
        const streak = prevGap === 1 ? prev.streak + 1 : 1;
        const next: McqState = { streak, lastDate: today, choice, correct };
        try {
          window.localStorage.setItem(MCQ_KEY, JSON.stringify(next));
        } catch {
          /* storage disabled → streak just won't persist */
        }
        return next;
      });
    },
    [today],
  );

  return {
    streak: liveStreak,
    answeredToday,
    todayChoice: answeredToday ? state.choice : null,
    todayCorrect: answeredToday ? state.correct : null,
    submit,
  };
}

export function useBookmarks(): {
  bookmarks: LibraryItem[];
  isBookmarked: (slug: string, number: string) => boolean;
  /** Toggles the bookmark; returns the NEW state (true = now saved). */
  toggle: (item: NewItem) => boolean;
} {
  const bookmarks = useLibrary(BOOKMARKS_KEY);

  const isBookmarked = useCallback(
    (slug: string, number: string) => bookmarks.some((i) => sameSection(i, slug, number)),
    [bookmarks],
  );

  const toggle = useCallback((item: NewItem): boolean => {
    const current = read(BOOKMARKS_KEY);
    const exists = current.some((i) => sameSection(i, item.slug, item.number));
    const next = exists
      ? current.filter((i) => !sameSection(i, item.slug, item.number))
      : [{ ...item, ts: Date.now() }, ...current];
    write(BOOKMARKS_KEY, next);
    return !exists;
  }, []);

  return { bookmarks, isBookmarked, toggle };
}
