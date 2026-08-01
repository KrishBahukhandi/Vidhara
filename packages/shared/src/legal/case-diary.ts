/**
 * Case-diary model and the pure logic around it, shared by web and app.
 *
 * The two surfaces store this differently — localStorage is synchronous,
 * AsyncStorage is not — so the *storage* stays per-platform. What lives here is
 * everything that must not diverge: the shape of a case, and the date and
 * ordering rules that decide what an advocate sees at the top of the list.
 *
 * Extracted at the third consumer, which is what D-040 said would trigger it:
 * `ChapterListItem` had already been copied web→app, and copying the whole
 * diary model as well would have made two independent definitions of what a
 * matter *is*. Two implementations of a sort is a nuisance; two definitions of
 * a hearing date is a bug waiting for a timezone.
 */

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

/** A thing to carry, file or check before the next date. */
export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
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

/**
 * A document attached to a matter — a scanned order, a copy certificate, a
 * photographed order sheet.
 *
 * The FILE lives in the app's own private sandbox, not on our servers: a case
 * document is privileged client material, and D-029's whole position is that we
 * take no custody of it. Only this record travels, and `uri` is a path on the
 * device that stored it — which means an imported diary carries references that
 * resolve nowhere, so the app checks the file exists before offering to open it
 * and shows the rest as missing rather than pretending.
 */
export interface CaseDocument {
  id: string;
  /** What the advocate called it, or the original filename. */
  name: string;
  /** MIME type when the picker reported one — used to choose an icon. */
  mimeType?: string;
  /** Absolute path inside the app's document directory. Device-local. */
  uri: string;
  /** Bytes at the time it was attached, for display. */
  size?: number;
  addedAt: number;
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
  /** Documents held in the app sandbox on the device that attached them. */
  documents?: CaseDocument[];
  createdAt: number;
  updatedAt: number;
}

export type NewCase = Omit<
  DiaryCase,
  "id" | "createdAt" | "updatedAt" | "sections" | "hearings" | "todos" | "status"
>;

/**
 * Fills in fields added after a record was written. `limitation` is
 * deliberately NOT defaulted: absent means "never worked out", which is
 * different from "worked out and empty".
 */
export function hydrateCase(c: DiaryCase): DiaryCase {
  return {
    ...c,
    sections: c.sections ?? [],
    hearings: c.hearings ?? [],
    todos: c.todos ?? [],
    status: c.status ?? "active",
  };
}

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

/** Hearings first (soonest, including overdue), undated last. */
export function byHearing(a: DiaryCase, b: DiaryCase): number {
  if (a.nextHearing && b.nextHearing) return a.nextHearing.localeCompare(b.nextHearing);
  if (a.nextHearing) return -1;
  if (b.nextHearing) return 1;
  return b.updatedAt - a.updatedAt;
}

/** Stable id for a case, hearing or todo, on either platform. */
export function diaryUid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Parses an exported diary. Used by both platforms' import, so a file exported
 * from the browser restores into the app and vice versa — the only route
 * between devices while the diary stays local-only (D-029).
 */
export function parseDiaryExport(raw: string): { ok: true; cases: DiaryCase[] } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  const list = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { cases?: unknown }).cases)
      ? (parsed as { cases: unknown[] }).cases
      : null;
  if (!list) return { ok: false, error: "That doesn't look like a diary export." };

  const cases = list.filter(
    (c): c is DiaryCase => typeof c === "object" && c !== null && typeof (c as DiaryCase).title === "string",
  );
  if (cases.length === 0) return { ok: false, error: "No matters found in that file." };
  return { ok: true, cases: cases.map(hydrateCase) };
}
