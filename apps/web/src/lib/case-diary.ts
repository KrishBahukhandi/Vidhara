"use client";

/**
 * Case diary storage (advocate track, D-029).
 *
 * LOCAL-ONLY BY DESIGN, not as a stopgap. A case diary holds privileged client
 * matter; keeping it in localStorage means it never reaches our servers, so we
 * take on no custody of confidential data and the advocate needs no account
 * (which is also still blocked on SMTP — D-021). It works offline, which is the
 * court-basement requirement anyway.
 *
 * The trade-off is real and surfaced in the UI: clearing browser data loses the
 * diary, and it doesn't follow you between devices. Hence export/import, so the
 * data is never trapped. Server sync becomes an opt-in upgrade if advocates ask
 * for it — a feature, not a prerequisite.
 */
import { useCallback, useEffect, useState } from "react";

/** A section attached to a case, with its old⇄new counterpart resolved once. */
export interface CaseSection {
  slug: string;
  number: string;
  act: string;
  note: string;
  counterpart: string | null;
}

/**
 * One line of the order sheet — what actually happened on a date. This is what
 * a case diary *is* in Indian practice: the running record, not just the next
 * date.
 */
export interface HearingEntry {
  id: string;
  /** ISO date the hearing took place. */
  date: string;
  /** What happened: order passed, adjourned and why, what to do next. */
  note: string;
}

/**
 * A limitation period worked out for this matter, saved from the worksheet.
 *
 * The whole computation is kept, not just the date — the Article, the period in
 * the Schedule's words and the event it ran from. A bare date months later is
 * unusable: the advocate has to be able to see WHY it is that date, and check
 * the working against the file without recomputing from scratch.
 */
export interface CaseLimitation {
  /** Schedule Article number, e.g. "35". */
  article: string;
  /** The limb's description, as printed. */
  description: string;
  /** Period as printed, e.g. "Three years." */
  period: string;
  /** What the period runs from, in the Schedule's words. */
  runsFrom: string;
  /** ISO date of that event, as entered. */
  startOn: string;
  /** ISO date the period ends, per s.12(1). */
  expiresOn: string;
  /** When it was worked out — a stale computation should look stale. */
  savedAt: number;
}

/** A thing to carry, file or check before the next date. */
export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface DiaryCase {
  id: string;
  /** Cause title, e.g. "State v. Kumar". */
  title: string;
  court: string;
  caseNumber: string;
  /** ISO date (YYYY-MM-DD) of the next hearing; "" when not fixed. */
  nextHearing: string;
  /** Free text: stage of the matter, e.g. "Bail application", "Charges". */
  stage: string;
  notes: string;
  sections: CaseSection[];
  /** Order sheet, most recent first. */
  hearings: HearingEntry[];
  todos: TodoItem[];
  status: "active" | "disposed";
  /** Set when an email reminder was requested for the CURRENT hearing date. */
  remindedFor?: string;
  /** Limitation period saved from the worksheet, if one was worked out. */
  limitation?: CaseLimitation;
  createdAt: number;
  updatedAt: number;
}

/**
 * Diaries written before the order sheet existed lack the newer fields, and a
 * missing array would crash the list on render. Normalise on every read.
 */
function hydrate(c: DiaryCase): DiaryCase {
  return {
    ...c,
    sections: c.sections ?? [],
    hearings: c.hearings ?? [],
    todos: c.todos ?? [],
    status: c.status ?? "active",
    // `limitation` is intentionally not defaulted — absent means "never worked
    // out", which is different from "worked out and empty".
  };
}

export type NewCase = Omit<
  DiaryCase,
  "id" | "createdAt" | "updatedAt" | "sections" | "hearings" | "todos" | "status"
>;

const KEY = "vidhara_case_diary";
const SYNC_EVENT = "vidhara:diary-change";
/** The address is remembered locally so it's typed once, not per case. */
const EMAIL_KEY = "vidhara_reminder_email";

export function rememberedEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setRememberedEmail(email: string): void {
  try {
    window.localStorage.setItem(EMAIL_KEY, email);
  } catch {
    /* storage disabled — the user just retypes it */
  }
}

/**
 * The day before the hearing (the evening-before nudge).
 * Parsed as UTC on purpose: `T00:00:00` without a zone is LOCAL, and
 * `toISOString()` then converts back to UTC — in IST (+5:30) that silently
 * shifts the result a day earlier, so reminders would fire two days out.
 */
export function remindDateFor(hearingISO: string): string {
  const t = Date.parse(`${hearingISO}T00:00:00Z`);
  return new Date(t - 86_400_000).toISOString().slice(0, 10);
}

function read(): DiaryCase[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as DiaryCase[]).map(hydrate) : [];
  } catch {
    return [];
  }
}

function write(cases: DiaryCase[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cases));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  } catch {
    // storage full/disabled — the UI surfaces this via a failed re-read
  }
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

/** Today in the user's own timezone as YYYY-MM-DD (hearings are local dates). */
export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

/** Days until a hearing: negative = past, 0 = today. null when no date set. */
export function daysUntil(iso: string): number | null {
  if (!iso) return null;
  const a = Date.parse(`${iso}T00:00:00`);
  const b = Date.parse(`${todayISO()}T00:00:00`);
  if (Number.isNaN(a)) return null;
  return Math.round((a - b) / 86_400_000);
}

/** Hearings first (soonest, including overdue), undated last. */
function byHearing(a: DiaryCase, b: DiaryCase): number {
  if (a.nextHearing && b.nextHearing) return a.nextHearing.localeCompare(b.nextHearing);
  if (a.nextHearing) return -1;
  if (b.nextHearing) return 1;
  return b.updatedAt - a.updatedAt;
}

export function useCaseDiary(): {
  cases: DiaryCase[];
  add: (c: NewCase) => DiaryCase;
  update: (id: string, patch: Partial<Omit<DiaryCase, "id" | "createdAt">>) => void;
  remove: (id: string) => void;
  attachSection: (id: string, s: CaseSection) => void;
  detachSection: (id: string, slug: string, number: string) => void;
  logHearing: (id: string, entry: { date: string; note: string; nextHearing?: string }) => void;
  addTodo: (id: string, text: string) => void;
  toggleTodo: (id: string, todoId: string) => void;
  removeTodo: (id: string, todoId: string) => void;
  exportJson: () => string;
  importJson: (raw: string) => { ok: boolean; added: number; error?: string };
} {
  const [cases, setCases] = useState<DiaryCase[]>([]);

  useEffect(() => {
    // Populates after hydration so the first client render matches the server.
    setCases(read().sort(byHearing));
    const refresh = () => setCases(read().sort(byHearing));
    window.addEventListener(SYNC_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SYNC_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const add = useCallback((c: NewCase): DiaryCase => {
    const now = Date.now();
    const item: DiaryCase = {
      ...c,
      id: uid(),
      sections: [],
      hearings: [],
      todos: [],
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    write([item, ...read()]);
    return item;
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<Omit<DiaryCase, "id" | "createdAt">>) => {
      write(read().map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)));
    },
    [],
  );

  const remove = useCallback((id: string) => {
    write(read().filter((c) => c.id !== id));
  }, []);

  const attachSection = useCallback((id: string, s: CaseSection) => {
    write(
      read().map((c) => {
        if (c.id !== id) return c;
        const exists = c.sections.some((x) => x.slug === s.slug && x.number === s.number);
        if (exists) return c;
        return { ...c, sections: [...c.sections, s], updatedAt: Date.now() };
      }),
    );
  }, []);

  const detachSection = useCallback((id: string, slug: string, number: string) => {
    write(
      read().map((c) =>
        c.id === id
          ? {
              ...c,
              sections: c.sections.filter((x) => !(x.slug === slug && x.number === number)),
              updatedAt: Date.now(),
            }
          : c,
      ),
    );
  }, []);

  /**
   * Record what happened on a date and, in the same action, set the next one —
   * that's how the diary is actually kept: you come back from court and write
   * up the date you just did, which is also when the next date is known.
   * Clearing `remindedFor` matters: a reminder set for the old date must not
   * count as covering the new one.
   */
  const logHearing = useCallback((id: string, entry: { date: string; note: string; nextHearing?: string }) => {
    write(
      read().map((c) => {
        if (c.id !== id) return c;
        const line: HearingEntry = { id: uid(), date: entry.date, note: entry.note };
        const hearings = [line, ...c.hearings].sort((a, b) => b.date.localeCompare(a.date));
        const nextHearing = entry.nextHearing ?? "";
        return {
          ...c,
          hearings,
          nextHearing,
          remindedFor: nextHearing && nextHearing === c.remindedFor ? c.remindedFor : undefined,
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const addTodo = useCallback((id: string, text: string) => {
    write(
      read().map((c) =>
        c.id === id
          ? { ...c, todos: [...c.todos, { id: uid(), text, done: false }], updatedAt: Date.now() }
          : c,
      ),
    );
  }, []);

  const toggleTodo = useCallback((id: string, todoId: string) => {
    write(
      read().map((c) =>
        c.id === id
          ? {
              ...c,
              todos: c.todos.map((t) => (t.id === todoId ? { ...t, done: !t.done } : t)),
              updatedAt: Date.now(),
            }
          : c,
      ),
    );
  }, []);

  const removeTodo = useCallback((id: string, todoId: string) => {
    write(
      read().map((c) =>
        c.id === id
          ? { ...c, todos: c.todos.filter((t) => t.id !== todoId), updatedAt: Date.now() }
          : c,
      ),
    );
  }, []);

  const exportJson = useCallback(
    () => JSON.stringify({ kind: "vidhara-case-diary", version: 1, cases: read() }, null, 2),
    [],
  );

  /** Merge an exported file back in; existing ids are left untouched. */
  const importJson = useCallback((raw: string) => {
    try {
      const parsed = JSON.parse(raw) as { cases?: DiaryCase[] };
      const incoming = Array.isArray(parsed.cases) ? parsed.cases : null;
      if (!incoming) return { ok: false, added: 0, error: "That file isn't a Vidhara diary export." };
      const current = read();
      const have = new Set(current.map((c) => c.id));
      const fresh = incoming.filter((c) => c && c.id && !have.has(c.id));
      write([...fresh, ...current]);
      return { ok: true, added: fresh.length };
    } catch {
      return { ok: false, added: 0, error: "Couldn't read that file." };
    }
  }, []);

  return {
    cases,
    add,
    update,
    remove,
    attachSection,
    detachSection,
    logHearing,
    addTodo,
    toggleTodo,
    removeTodo,
    exportJson,
    importJson,
  };
}
