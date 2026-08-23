/**
 * Case diary storage for the app — the mobile twin of apps/web's case-diary.
 *
 * The model and every date rule come from @nexlex/shared (D-044); only the
 * storage differs, because AsyncStorage is async where localStorage is not.
 * Same pub-sub shape as local-library.ts so an open screen re-reads after a
 * write from anywhere.
 *
 * LOCAL-ONLY, and on THIS device (D-029). That has a consequence worth being
 * blunt about in the UI rather than discovering: a matter added in the browser
 * does not appear here, and vice versa. There is no account and no server copy,
 * so the export file is the only bridge between the two — which is why import
 * accepts whatever the web writes.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import {
  byHearing,
  diaryUid,
  hydrateCase,
  parseDiaryExport,
  type CaseDocument,
  type CaseSection,
  type DiaryCase,
  type NewCase,
} from "@nexlex/shared";

import { deleteDocumentFile } from "./documents";

const KEY = "vidhara_case_diary";

/** Same-session change signal so open screens re-read after a write. */
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function read(): Promise<DiaryCase[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as DiaryCase[]).map(hydrateCase) : [];
  } catch {
    return [];
  }
}

async function write(cases: DiaryCase[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(cases));
    emit();
  } catch {
    // storage full/disabled — the UI surfaces this via a failed re-read
  }
}

export interface DiaryApi {
  cases: DiaryCase[];
  loading: boolean;
  add: (c: NewCase) => Promise<DiaryCase>;
  update: (id: string, patch: Partial<Omit<DiaryCase, "id" | "createdAt">>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  logHearing: (id: string, entry: { date: string; note: string; nextHearing?: string }) => Promise<void>;
  addTodo: (id: string, text: string) => Promise<void>;
  toggleTodo: (id: string, todoId: string) => Promise<void>;
  removeTodo: (id: string, todoId: string) => Promise<void>;
  detachSection: (id: string, slug: string, number: string) => Promise<void>;
  attachDocument: (id: string, doc: CaseDocument) => Promise<void>;
  removeDocument: (id: string, docId: string) => Promise<void>;
  exportJson: () => Promise<string>;
  importJson: (raw: string) => Promise<{ ok: boolean; added: number; error?: string }>;
}

export function useCaseDiary(): DiaryApi {
  const [cases, setCases] = useState<DiaryCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      void read().then((list) => {
        if (!alive) return;
        setCases(list.sort(byHearing));
        setLoading(false);
      });
    };
    refresh();
    listeners.add(refresh);
    return () => {
      alive = false;
      listeners.delete(refresh);
    };
  }, []);

  /** Read-modify-write against storage, never against the render snapshot, so
   * two quick edits can't drop one another. */
  const mutate = useCallback(
    async (fn: (list: DiaryCase[]) => DiaryCase[]): Promise<void> => {
      await write(fn(await read()));
    },
    [],
  );

  const touch = (c: DiaryCase): DiaryCase => ({ ...c, updatedAt: Date.now() });

  const add = useCallback(async (c: NewCase): Promise<DiaryCase> => {
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
    await write([item, ...(await read())]);
    return item;
  }, []);

  const update = useCallback(
    async (id: string, patch: Partial<Omit<DiaryCase, "id" | "createdAt">>) =>
      mutate((list) => list.map((c) => (c.id === id ? touch({ ...c, ...patch }) : c))),
    [mutate],
  );

  const remove = useCallback(
    async (id: string) => mutate((list) => list.filter((c) => c.id !== id)),
    [mutate],
  );

  /**
   * Records what happened on a date and, when a next date is given, moves the
   * matter forward — the two halves of an adjournment, which is the single most
   * common thing an advocate does on a phone, standing outside the court room.
   * Clearing `remindedFor` matters: a reminder set for the old date must not
   * read as set for the new one.
   */
  const logHearing = useCallback(
    async (id: string, entry: { date: string; note: string; nextHearing?: string }) =>
      mutate((list) =>
        list.map((c) =>
          c.id === id
            ? touch({
                ...c,
                hearings: [{ id: diaryUid(), date: entry.date, note: entry.note }, ...c.hearings],
                ...(entry.nextHearing !== undefined
                  ? { nextHearing: entry.nextHearing, remindedFor: undefined }
                  : {}),
              })
            : c,
        ),
      ),
    [mutate],
  );

  const addTodo = useCallback(
    async (id: string, text: string) =>
      mutate((list) =>
        list.map((c) =>
          c.id === id
            ? touch({ ...c, todos: [...c.todos, { id: diaryUid(), text, done: false }] })
            : c,
        ),
      ),
    [mutate],
  );

  const toggleTodo = useCallback(
    async (id: string, todoId: string) =>
      mutate((list) =>
        list.map((c) =>
          c.id === id
            ? touch({
                ...c,
                todos: c.todos.map((t) => (t.id === todoId ? { ...t, done: !t.done } : t)),
              })
            : c,
        ),
      ),
    [mutate],
  );

  const removeTodo = useCallback(
    async (id: string, todoId: string) =>
      mutate((list) =>
        list.map((c) =>
          c.id === id ? touch({ ...c, todos: c.todos.filter((t) => t.id !== todoId) }) : c,
        ),
      ),
    [mutate],
  );

  const detachSection = useCallback(
    async (id: string, slug: string, number: string) =>
      mutate((list) =>
        list.map((c) =>
          c.id === id
            ? touch({
                ...c,
                sections: c.sections.filter(
                  (s: CaseSection) => !(s.slug === slug && s.number === number),
                ),
              })
            : c,
        ),
      ),
    [mutate],
  );

  const attachDocument = useCallback(
    async (id: string, doc: CaseDocument) =>
      mutate((list) =>
        list.map((c) =>
          c.id === id ? touch({ ...c, documents: [...(c.documents ?? []), doc] }) : c,
        ),
      ),
    [mutate],
  );

  /** Drops the record AND the bytes — see deleteDocumentFile. */
  const removeDocument = useCallback(
    async (id: string, docId: string) => {
      const list = await read();
      const doc = list.find((c) => c.id === id)?.documents?.find((d) => d.id === docId);
      if (doc) {
        // Deduplicated attachments share one file, so the bytes only go when
        // the last record pointing at them does.
        const stillReferenced = list.some((c) =>
          (c.documents ?? []).some((d) => d.id !== docId && d.uri === doc.uri),
        );
        deleteDocumentFile(doc, stillReferenced);
      }
      await write(
        list.map((c) =>
          c.id === id
            ? touch({ ...c, documents: (c.documents ?? []).filter((d) => d.id !== docId) })
            : c,
        ),
      );
    },
    [],
  );

  const exportJson = useCallback(async () => JSON.stringify(await read(), null, 2), []);

  const importJson = useCallback(async (raw: string) => {
    const parsed = parseDiaryExport(raw);
    if (!parsed.ok) return { ok: false, added: 0, error: parsed.error };
    // Merge by id: re-importing your own backup must not double every matter.
    const existing = await read();
    const known = new Set(existing.map((c) => c.id));
    const incoming = parsed.cases.filter((c) => !known.has(c.id));
    await write([...incoming, ...existing]);
    return { ok: true, added: incoming.length };
  }, []);

  return {
    cases,
    loading,
    add,
    update,
    remove,
    logHearing,
    addTodo,
    toggleTodo,
    removeTodo,
    detachSection,
    attachDocument,
    removeDocument,
    exportJson,
    importJson,
  };
}
