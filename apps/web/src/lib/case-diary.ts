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
  createdAt: number;
  updatedAt: number;
}

export type NewCase = Omit<DiaryCase, "id" | "createdAt" | "updatedAt" | "sections">;

const KEY = "vidhara_case_diary";
const SYNC_EVENT = "vidhara:diary-change";

function read(): DiaryCase[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as DiaryCase[]) : [];
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
    const item: DiaryCase = { ...c, id: uid(), sections: [], createdAt: now, updatedAt: now };
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

  return { cases, add, update, remove, attachSection, detachSection, exportJson, importJson };
}
