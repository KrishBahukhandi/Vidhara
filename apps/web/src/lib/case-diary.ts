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

import {
  byHearing,
  diaryUid,
  hydrateCase,
  parseDiaryExport,
  type DiaryCase,
  type CaseSection,
  type HearingEntry,
  type NewCase,
} from "@nexlex/shared";

// Re-exported so existing imports from this module keep working; the shape and
// the date rules themselves live in @nexlex/shared, shared with the app.
export {
  daysUntil,
  remindDateFor,
  todayISO,
  type CaseLimitation,
  type CaseSection,
  type DiaryCase,
  type HearingEntry,
  type NewCase,
  type TodoItem,
} from "@nexlex/shared";


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

function read(): DiaryCase[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as DiaryCase[]).map(hydrateCase) : [];
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
      id: diaryUid(),
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
        const line: HearingEntry = { id: diaryUid(), date: entry.date, note: entry.note };
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
          ? { ...c, todos: [...c.todos, { id: diaryUid(), text, done: false }], updatedAt: Date.now() }
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
