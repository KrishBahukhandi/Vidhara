/**
 * Local-first reading library (docs/release-plan.md §V0.5, decision D-007):
 * recents + bookmarks in AsyncStorage, no account, no server — the mobile twin
 * of apps/web's local-library. Async (AsyncStorage), with a tiny pub-sub so a
 * bookmark toggled on the reader updates the Saved tab live. Analytics events
 * are fired by the calling screens, never here.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
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

/** Same-session change signal so open screens re-read after a write. */
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function read(key: string): Promise<LibraryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as LibraryItem[]) : [];
  } catch {
    return [];
  }
}

async function write(key: string, items: LibraryItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(items));
    emit();
  } catch {
    // storage failure — feature degrades silently
  }
}

const sameSection = (a: { slug: string; number: string }, slug: string, number: string) =>
  a.slug === slug && a.number === number;

/** Record a section view into recents (most-recent-first, deduped, capped). */
export async function recordRecent(item: NewItem): Promise<void> {
  const rest = (await read(RECENTS_KEY)).filter((i) => !sameSection(i, item.slug, item.number));
  await write(RECENTS_KEY, [{ ...item, ts: Date.now() }, ...rest].slice(0, RECENTS_CAP));
}

/** Subscribe a screen to one storage key; re-reads after any same-session write. */
function useLibrary(key: string): { items: LibraryItem[]; loading: boolean } {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const refresh = () =>
      read(key).then((v) => {
        if (alive) {
          setItems(v);
          setLoading(false);
        }
      });
    refresh();
    listeners.add(refresh);
    return () => {
      alive = false;
      listeners.delete(refresh);
    };
  }, [key]);

  return { items, loading };
}

export function useRecents(): { items: LibraryItem[]; loading: boolean } {
  return useLibrary(RECENTS_KEY);
}

export function useBookmarks(): {
  bookmarks: LibraryItem[];
  loading: boolean;
  isBookmarked: (slug: string, number: string) => boolean;
  /** Toggles the bookmark; resolves to the NEW state (true = now saved). */
  toggle: (item: NewItem) => Promise<boolean>;
} {
  const { items, loading } = useLibrary(BOOKMARKS_KEY);

  const isBookmarked = useCallback(
    (slug: string, number: string) => items.some((i) => sameSection(i, slug, number)),
    [items],
  );

  const toggle = useCallback(async (item: NewItem): Promise<boolean> => {
    const current = await read(BOOKMARKS_KEY);
    const exists = current.some((i) => sameSection(i, item.slug, item.number));
    const next = exists
      ? current.filter((i) => !sameSection(i, item.slug, item.number))
      : [{ ...item, ts: Date.now() }, ...current];
    await write(BOOKMARKS_KEY, next);
    return !exists;
  }, []);

  return { bookmarks: items, loading, isBookmarked, toggle };
}

// —— Daily MCQ streak (local-first; mobile twin of apps/web) ——
const MCQ_KEY = "vidhara_mcq";

interface McqState {
  streak: number;
  lastDate: string | null; // IST date (YYYY-MM-DD) of the last answered day
  choice: number | null;
  correct: boolean | null;
}
const EMPTY_MCQ: McqState = { streak: 0, lastDate: null, choice: null, correct: null };

/** IST calendar date, matching the daily-mcq function's day boundary. */
export function istToday(): string {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}
const mcqDayNum = (d: string) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 86_400_000);

async function readMcq(): Promise<McqState> {
  try {
    const raw = await AsyncStorage.getItem(MCQ_KEY);
    const p = raw ? (JSON.parse(raw) as McqState) : null;
    if (p && typeof p.streak === "number") return p;
  } catch {
    /* corrupt/disabled storage */
  }
  return EMPTY_MCQ;
}

/**
 * Daily-MCQ local state: running streak + today's answer (so re-opening shows
 * the result — one question per day). `today` is the IST date; pass null until
 * known.
 */
export function useDailyMcq(today: string | null): {
  streak: number;
  answeredToday: boolean;
  todayChoice: number | null;
  todayCorrect: boolean | null;
  submit: (choice: number, correct: boolean) => Promise<void>;
} {
  const [state, setState] = useState<McqState>(EMPTY_MCQ);
  useEffect(() => {
    let alive = true;
    const refresh = () => readMcq().then((v) => alive && setState(v));
    refresh();
    listeners.add(refresh);
    return () => {
      alive = false;
      listeners.delete(refresh);
    };
  }, []);

  const answeredToday = today != null && state.lastDate === today;
  const gap = today && state.lastDate ? mcqDayNum(today) - mcqDayNum(state.lastDate) : Infinity;
  const liveStreak = gap <= 1 ? state.streak : 0;

  const submit = useCallback(
    async (choice: number, correct: boolean) => {
      if (!today) return;
      const prev = await readMcq();
      if (prev.lastDate === today) return; // already answered today
      const prevGap = prev.lastDate ? mcqDayNum(today) - mcqDayNum(prev.lastDate) : Infinity;
      const streak = prevGap === 1 ? prev.streak + 1 : 1;
      const next: McqState = { streak, lastDate: today, choice, correct };
      try {
        await AsyncStorage.setItem(MCQ_KEY, JSON.stringify(next));
        emit();
      } catch {
        /* storage disabled → streak just won't persist */
      }
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
