/**
 * A schedule that is a NUMBERED LIST, grouped into named lists.
 *
 * The Constitution's Seventh Schedule is the motivating case and by some
 * distance the most looked-up thing in it: three Lists — Union, State,
 * Concurrent — of the subjects Parliament and the State Legislatures may
 * legislate on. Every question about who may make a law on a given subject is
 * answered by an entry number in one of them.
 *
 * WHY IT IS NOT act_schedule_articles. That table was built for the Limitation
 * Act (D-036) and is shaped hard around its three columns: description, period
 * and commencement are all NOT NULL, and its key is (schedule, number). This
 * schedule has ONE column of text and repeats its numbering in each List —
 * entry 1 is defence in List I, public order in List II and criminal law in
 * List III — so that key collides three ways and two of the three columns
 * would be stored empty. Same reasoning D-036 used to keep the Limitation
 * Schedule out of act_sections, applied once more.
 *
 * WHAT THE PRINT LOOKS LIKE. The 2026 Constitution sets the whole schedule in
 * 8.10pt, its footnotes in 7.24pt, its superscript markers in 5.40pt and the
 * repository's "In di aC od e" watermark in 11.79pt and above — four tiers that
 * do not overlap, so a height window separates them exactly. An entry opens at
 * an indent of x≈54 and wraps back to x≈36, which is a second, independent
 * signal, but the numbering is the one relied on: entries ascend, and an
 * amendment may bracket a number ("[2A. Deployment of any armed force …") the
 * same way it does in the body of an Act.
 */

export interface ScheduleEntry {
  /** As printed: "1", "2A", "97". */
  number: string;
  /** The entry's text, wrapped lines joined. */
  text: string;
}

export interface ScheduleList {
  /** "I", "II", "III". */
  number: string;
  /** "Union List", "State List", "Concurrent List". */
  title: string;
  entries: ScheduleEntry[];
}

export interface ListScheduleResult {
  /** The article the schedule is made under, as printed: "Article 246". */
  authority: string | null;
  lists: ScheduleList[];
  diagnostics: string[];
}

export interface ListScheduleOptions {
  /** The schedule's own heading, matched against squashed page text. */
  heading: RegExp;
  /** The heading that follows it — where this schedule stops. */
  endsBefore: RegExp;
  /** Smallest word height that is body type. */
  minHeight?: number;
  /** Largest. Above this is the repository's page watermark, not text. */
  maxHeight?: number;
}

interface Word {
  xMin: number;
  baseline: number;
  height: number;
  text: string;
}

const WORD_TAG =
  /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;

/** Body 8.10pt; footnotes 7.24pt below, watermark 11.79pt and up above. */
const DEFAULT_MIN_HEIGHT = 7.7;
const DEFAULT_MAX_HEIGHT = 11;
const LINE_TOLERANCE = 4;

/** "List I—Union List". The dash is an em dash in this print. */
const LIST_HEADING = /^List\s+([IVX]+)\s*[—–―-]\s*(.+?)\s*$/;
/** "(Article 246)" — the provision the schedule is made under. */
const AUTHORITY = /^\(\s*(Articles?\s+[^)]+)\)$/i;
/**
 * An entry opens with its number. The leading class strips what an amendment
 * puts in front of it: a bracket, or a bracket and the digits of a superscript
 * marker that survived the height filter.
 *
 * THE FULL STOP IS OPTIONAL BEFORE ASTERISKS, because an OMITTED entry is set
 * two ways in the same schedule — "[92. * * * * * *]" with one and
 * "[33* * * * *]" without. Requiring it dropped six entries the print does
 * carry: List I entry 33, and List II entries 11, 19, 20, 29 and 36. That left
 * a gap in the numbering with nothing to explain it, which is the one thing
 * storing an omitted entry is for.
 */
const ENTRY_START = /^(\d{1,3}[A-Z]?)(?:\.\s+|\s*(?=\*))(\S[\s\S]*)$/;
/**
 * What an amendment puts in FRONT of an entry number: an opening bracket, and
 * the digits of a superscript marker where the print sets one at body height.
 *
 * A digit run is stripped only when a bracket follows it. Allowing it before an
 * asterisk instead ate the number of every omitted entry set without a full
 * stop — "[33* * * * *]" became "* * * *]" and opened nothing.
 */
const LEADING_APPARATUS = /^(?:\d{1,2}\s*(?=\[)|[[\s])+/;

const squashed = (page: string): string =>
  page.replace(/<[^>]+>/g, " ").replace(/\s+/g, "");

function decode(s: string): string {
  return s
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replace(/&#(\d+);/g, (_, c: string) => String.fromCodePoint(Number(c)));
}

function pageLines(page: string, min: number, max: number): string[] {
  const words: Word[] = [];
  for (const m of page.matchAll(WORD_TAG)) {
    const height = Number(m[4]) - Number(m[2]);
    if (height < min || height > max) continue;
    words.push({
      xMin: Number(m[1]),
      baseline: Number(m[4]),
      height,
      text: decode(m[5] ?? ""),
    });
  }
  words.sort((a, b) => a.baseline - b.baseline || a.xMin - b.xMin);

  const lines: string[] = [];
  let current: Word[] = [];
  let base = Number.NEGATIVE_INFINITY;
  const push = () => {
    if (current.length === 0) return;
    const text = current
      .sort((a, b) => a.xMin - b.xMin)
      .map((w) => w.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) lines.push(text);
    current = [];
  };
  for (const w of words) {
    if (current.length > 0 && Math.abs(w.baseline - base) > LINE_TOLERANCE) push();
    if (current.length === 0) base = w.baseline;
    current.push(w);
  }
  push();
  return lines;
}

export function parseListSchedule(
  xhtml: string,
  options: ListScheduleOptions,
): ListScheduleResult {
  const diagnostics: string[] = [];
  const min = options.minHeight ?? DEFAULT_MIN_HEIGHT;
  const max = options.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const pages = xhtml.split(/<page /).slice(1);

  // The heading is printed in the contents as well as over the schedule, so the
  // LAST page that carries it is the schedule itself — the same trap the
  // offence-schedule parser records for Part I.
  let first = -1;
  for (let i = 0; i < pages.length; i++) {
    if (options.heading.test(squashed(pages[i]!))) first = i;
  }
  if (first < 0) return { authority: null, lists: [], diagnostics: ["schedule heading not found"] };
  let last = pages.length;
  for (let i = first + 1; i < pages.length; i++) {
    if (options.endsBefore.test(squashed(pages[i]!))) {
      last = i;
      break;
    }
  }
  diagnostics.push(`pages ${first + 1}–${last}`);

  const lines: string[] = [];
  for (let i = first; i < last; i++) lines.push(...pageLines(pages[i]!, min, max));

  let authority: string | null = null;
  const lists: ScheduleList[] = [];
  let open: ScheduleEntry | null = null;
  /** Entry numbers ascend within a List; one that goes backwards is not an
   * entry opening but a wrapped line that happens to start with a numeral. */
  let highest = 0;

  const closeEntry = () => {
    if (!open) return;
    const list = lists[lists.length - 1];
    if (list) list.entries.push({ ...open, text: open.text.replace(/\s+/g, " ").trim() });
    open = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (!authority) {
      const cite = AUTHORITY.exec(line);
      if (cite?.[1]) {
        authority = cite[1].replace(/\s+/g, " ");
        continue;
      }
    }

    const heading = LIST_HEADING.exec(line);
    if (heading?.[1] && heading[2]) {
      closeEntry();
      lists.push({ number: heading[1], title: heading[2], entries: [] });
      highest = 0;
      continue;
    }

    // Everything before the first List heading is the schedule's own heading
    // and its authority note.
    if (lists.length === 0) continue;

    const stripped = line.replace(LEADING_APPARATUS, "");
    const start = ENTRY_START.exec(stripped);
    const base = start?.[1] ? Number.parseInt(start[1], 10) : 0;
    if (start?.[1] && start[2] && base >= highest) {
      closeEntry();
      highest = base;
      open = { number: start[1], text: start[2] };
      continue;
    }
    if (start?.[1] && base < highest) {
      diagnostics.push(`ignored non-ascending "${start[1]}." after entry ${highest}`);
    }

    if (open) open.text += ` ${line}`;
    else diagnostics.push(`line before the first entry of List ${lists.at(-1)?.number}: ${line.slice(0, 60)}`);
  }
  closeEntry();

  for (const list of lists) {
    diagnostics.push(`List ${list.number} (${list.title}): ${list.entries.length} entries`);
  }
  return { authority, lists, diagnostics };
}
