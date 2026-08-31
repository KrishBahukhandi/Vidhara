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
  /** As printed: "1", "2A", "97", or a Roman numeral for a Form. */
  number: string;
  /**
   * What the reader scans for, where the schedule gives one: the marginal note
   * of a paragraph ("Interpretation"), or the office whose oath a Form sets
   * out. Null for a bare numbered subject, as in the Seventh.
   */
  label?: string;
  /** The entry's text, wrapped lines joined. */
  text: string;
}

export interface ScheduleList {
  /**
   * "I", "II", "III" for the Seventh's Lists; "A", "B" for a Schedule that
   * groups its paragraphs into Parts. Null where the schedule is one flat run
   * of entries, as the Eighth, Ninth, Eleventh and Twelfth are.
   */
  number: string | null;
  /** "Union List". Null for a Part, whose title the print sets in small caps
   * below the body height this parser reads. */
  title: string | null;
  entries: ScheduleEntry[];
}

export interface ListScheduleResult {
  /** The article the schedule is made under, as printed: "Article 246". */
  authority: string | null;
  lists: ScheduleList[];
  diagnostics: string[];
}

export interface ListScheduleOptions {
  /**
   * The schedule's own heading, matched against a WHOLE LINE with brackets and
   * spaces removed — not against the page's text anywhere.
   *
   * Every page of a schedule carries a running header naming it, and the
   * Eighth's is "(Eighth Schedule)". Matched loosely, that header is a heading
   * too, and the parser began on the schedule's SECOND page: the Eighth came
   * out with one entry, being everything from "18. Santhali" on. Requiring the
   * heading to BE the line excludes the header, whose parentheses survive the
   * strip.
   */
  heading: RegExp;
  /** The heading that follows it — where this schedule stops. Matched the same
   * way, so a running header cannot end the schedule early either. */
  endsBefore: RegExp;
  /** Smallest word height that is body type. */
  minHeight?: number;
  /** Largest. Above this is the repository's page watermark, not text. */
  maxHeight?: number;
  /**
   * How the schedule groups its entries, if at all.
   *
   * "list" — "List I—Union List" (the Seventh).
   * "part" — "PART A" (the Second and Fifth). The Part's own title is set in
   *          small caps below body height, so only the letter is taken.
   * "none" — one flat run (the Eighth, Ninth, Eleventh, Twelfth). Default.
   */
  groupBy?: "list" | "part" | "none";
  /**
   * Entries open with a marginal note, run in and closed by a dash:
   * "1. Interpretation.—In this Schedule…". True for the Fifth, Sixth and
   * Tenth, which are paragraph schedules and read like sections.
   */
  splitHeading?: boolean;
  /**
   * Entries are numbered with Roman numerals standing alone on their own line,
   * as the Third Schedule numbers its Forms of Oath.
   */
  romanNumerals?: boolean;
  /**
   * A rider that closes the schedule rather than belonging to its last entry.
   *
   * The Ninth Schedule ends "Explanation:—Any acquisition made under the
   * Rajasthan Tenancy Act, 1955 … shall … be void." That governs the whole
   * schedule, but it follows entry 284 and was joined to it, where it reads as
   * if it were about the West Bengal Land Reforms Tribunal Act. Matched, it
   * becomes an entry of its own, numbered as the print names it.
   *
   * Opt-in, because "Explanation" opens a line inside ordinary paragraphs too
   * — the Fifth, Sixth and Tenth are full of them — and cutting there would
   * truncate the paragraph that contained it.
   */
  closingNote?: RegExp;
  /**
   * The schedule is a TWO-COLUMN table, split at this x.
   *
   * The First Schedule sets the State's name in a narrow left column and its
   * territories in a wide right one, and the name wraps: "Andhra" sits on one
   * line and "Pradesh" on the next, each beside a different line of the
   * territories. Read as lines, the two columns interleave — the first State
   * came out as "Andhra [The territories specified in sub-section (1) of
   * section 3 of Pradesh the Andhra State Act, 1953…".
   *
   * Given rather than derived: it is one measured number per schedule, and an
   * occupancy profile would have to be computed per page against a table whose
   * left column is often only one word wide.
   */
  twoColumnAt?: number | "auto";
  /**
   * A section heading that opens a group: "I. THE STATES", "II. THE UNION
   * TERRITORIES". Used where a schedule divides itself by something other than
   * a List or a Part.
   */
  sectionHeading?: RegExp;
  /**
   * Where the body begins on a row's OPENING line, matched word by word.
   *
   * A two-column table aligns its columns on continuation lines but runs them
   * together on the line that opens a row: the First Schedule sets "[10.]
   * [Odisha] The territories which immediately…" with "The" at x=94 against a
   * right column that starts at 107, because the name is short and the body
   * follows it by an ordinary word space. No gutter can separate that line —
   * the columns genuinely overlap on it — so the opening line is split on
   * CONTENT and every line after it on geometry.
   *
   * Matched against the REMAINDER of the line from each word on, not against
   * a single word: for the First Schedule the pattern is /^\[*The territor/,
   * and all thirty-six of its cells open "The territories…" or "The
   * territory…". A single-word "The" would cut the Andaman and Nicobar
   * Islands' own name in half. A row whose opening line does not match keeps
   * the geometric split, and the gates report the label that results.
   */
  rowBodyStarts?: RegExp;
  /**
   * A line that ends the parse, wherever on a page it falls.
   *
   * `endsBefore` works a page at a time, which cannot separate two things
   * printed on the SAME page: the table appended to the Sixth Schedule's
   * paragraph 20 and the paragraph 20A that follows it share page 336.
   */
  endsAtLine?: RegExp;
  /**
   * A line that ends the entry it falls in without opening another.
   *
   * The same table, read as part of paragraph 20, flattens to "…Council Act,
   * 1979.] T P I 1. The North Cachar Hills District. 2. [The Karbi Anglong
   * District.]…" — the paragraph's own text runs straight into a table it only
   * refers to. Matched, the paragraph closes and nothing is collected again
   * until an entry opens.
   */
  entryEndsAt?: RegExp;
  /**
   * Lines that are the document's own furniture rather than its content — the
   * title under the heading, a citation line like "C.O. 273".
   *
   * The heading itself is always skipped; these are the lines beneath it that
   * a numbered schedule never reaches (nothing is collected before its first
   * entry) but a schedule of pure prose does, because for that one everything
   * is the entry.
   */
  skipLines?: RegExp;
}

interface Word {
  xMin: number;
  xMax: number;
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
/**
 * "(Article 246)", "[Articles 102(2) and 191(2)]" — the provision the schedule
 * is made under. Bracketed in most, parenthesised in a few, and its own content
 * carries parentheses, so it runs lazily to the LAST closing bracket rather
 * than excluding them.
 */
const AUTHORITY = /^[([]\s*(Articles?\s[\s\S]*?)\s*[)\]]$/i;
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
 *
 * A CLOSING BRACKET MAY FOLLOW THE STOP, because an amendment can bracket the
 * number alone: the Eighth Schedule sets sixteen of its twenty-two languages
 * as "[5.] Gujarati.", "[ [9.] Konkani.]". Leading apparatus strips what comes
 * before the number; this is what comes after it, and without it the Eighth
 * parsed to six entries.
 */
const ENTRY_START = /^(\d{1,3}[A-Z]?)(?:\.\s*\]?\s*|\s*(?=\*))(\S[\s\S]*)$/;
/**
 * What an amendment puts in FRONT of an entry number: an opening bracket, and
 * the digits of a superscript marker where the print sets one at body height.
 *
 * A digit run is stripped only when a bracket follows it. Allowing it before an
 * asterisk instead ate the number of every omitted entry set without a full
 * stop — "[33* * * * *]" became "* * * *]" and opened nothing.
 */
const LEADING_APPARATUS = /^(?:\d{1,2}\s*(?=\[)|[[\s])+/;
/**
 * A footnote marker set as an asterisk BEFORE the number, which the Tenth
 * Schedule uses: "*7. Bar of jurisdiction of courts.—…".
 *
 * Stripped on its own, ahead of LEADING_APPARATUS and only at the very start of
 * the line. Folding asterisks into that rule instead let it eat the number of
 * an omitted entry all over again — "[33* * * * *]" has digits followed by an
 * asterisk, which is the shape it must not touch.
 *
 * The class covers the PRIVATE USE AREA as well as the asterisk and daggers,
 * because a symbol font renders the marker there rather than as any of them:
 * the Ninth Schedule's entries 91 and 100 open with U+F02A and were the only
 * two of its 284 missing until this matched them.
 */
/**
 * Where a two-column table's gutter falls on one page.
 *
 * Measured rather than fixed because it moves: across the First Schedule's ten
 * pages the left column ends anywhere from x=82 to x=134, depending on how long
 * the State names on that page happen to be. A fixed split put "The" of the
 * territories into Gujarat's name and cut Himachal Pradesh's in half.
 *
 * The gutter is the widest run of x that no word covers, looked for only in the
 * left part of the page — beyond that the right column's own ragged edges leave
 * wider gaps than the gutter does.
 */
const GUTTER_FROM = 50;
const GUTTER_TO = 150;

function gutterOf(lines: Line[]): number | null {
  const covered = new Map<number, number>();
  for (const line of lines) {
    for (const w of line.words) {
      for (let x = Math.floor(w.xMin); x <= Math.ceil(w.xMax); x++) {
        covered.set(x, (covered.get(x) ?? 0) + 1);
      }
    }
  }

  // The LEAST-covered x, not an uncovered one. A gutter is rarely empty: one
  // word of a long State name overhangs it — "Nadu]" runs from x=88 to x=108
  // against a right column starting at 107 — and a single such word left page
  // 286 with no empty run at all, so the whole page read as one column. The
  // same reading offence-schedule.ts settled on, for the same reason.
  let least = Number.POSITIVE_INFINITY;
  for (let x = GUTTER_FROM; x <= GUTTER_TO; x++) least = Math.min(least, covered.get(x) ?? 0);

  let best: [number, number] | null = null;
  let run: number | null = null;
  for (let x = GUTTER_FROM; x <= GUTTER_TO + 1; x++) {
    const atLeast = x <= GUTTER_TO && (covered.get(x) ?? 0) === least;
    if (atLeast && run === null) run = x;
    if (!atLeast && run !== null) {
      if (!best || x - run > best[1] - best[0]) best = [run, x - 1];
      run = null;
    }
  }
  // The LEFT edge of the widest such run. The right column starts hard against
  // the gutter's right edge, so anything further in claims its first word: with
  // the midpoint, "The" of "The territories…" fell into Odisha's and Tripura's
  // names. The left column is ragged and loses nothing by the same choice.
  return best ? best[0] : null;
}

/** A dot-leader row whose number carries no stop: "31 Jammu and Kashmir……4]". */
const DOT_LEADER_ROW = /^(\d{1,3}[A-Z]?)[.\]\s]+(\S[\s\S]*)$/;
const LEADING_ASTERISK = /^[*\u2020\u2021\uf000-\uf0ff]+\s*/;
/**
 * "PART A" in the Second and Fifth Schedules; "PART I" to "PART III" in the
 * table appended to the Sixth's paragraph 20.
 *
 * "Part" collapses to "P" because the print sets these in small caps — the
 * "ART" is below the height any of this reads — so the word is optional and
 * the number may be a letter or a Roman numeral with an optional letter after
 * it ("PART IIA", the Tripura tribal areas).
 */
const PART_HEADING = /^\[?\s*P(?:art)?\s+([IVX]+A?|[A-Z])\s*\]?$/i;
/** A Form's number in the Third Schedule: a Roman numeral, alone on its line. */
const ROMAN_HEADING = /^([IVX]{1,6})$/;
/**
 * A paragraph's marginal note, run in and closed by a dash — the same shape
 * gazette-inline splits a section's note on, and for the same reason: these
 * schedules are drafted as sections and read as them.
 */
const HEADING_SPLIT = /^(.{3,190}?)\.\s*(?:[—–]+|―)\s*([\s\S]*)$/;

/**
 * Page furniture: what sits on a page because it is a page, not because it is
 * part of the schedule.
 *
 * A schedule runs across page breaks and its entries wrap over them, so the
 * page number and the running header land in the middle of whatever entry was
 * open. The Eighth Schedule's entry 17 came out as "Sanskrit. 325 326 THE
 * CONSTITUTION OF INDIA (Eighth Schedule)".
 *
 * Listed rather than detected, because the alternative — dropping any line
 * that repeats across most pages, as D-077 does for the watermark — would also
 * drop a schedule that legitimately repeats a short line, and these three
 * shapes are the whole of it in this document.
 */
const FURNITURE = [
  // A table reprints its column headings on every page it runs across.
  /^(Name|Territories|Extent)$/,
  /^Name\s+(Territories|Extent)$/,
  /^\d{1,4}$/,
  // The page number shares the running header's line as often as not, on
  // either side of it, so it is optional at both ends rather than a line of
  // its own: "326 THE CONSTITUTION OF INDIA".
  /^\d{0,4}\s*THE CONSTITUTION OF INDIA\s*\d{0,4}$/i,
  /^\d{0,4}\s*\([A-Za-z ]+Schedule\)\s*\d{0,4}$/i,
];

/**
 * A footnote's first line, and where on the page a block of them may begin.
 *
 * The height window is not enough on its own: this print sets a footnote's
 * FIRST line at 7.24pt but wraps it at 8.9pt, which is inside the body window,
 * so the Fourth Schedule's entry 9 came out as "Kerala …… 9 ‘Fou" with the tail
 * of "‘Fourth Schedule’ (w.e.f. 1-11-1956)" attached. Once a footnote-shaped
 * line appears in the bottom of a page, the rest of that page is footnote —
 * the same page-scoped latch gazette-inline uses, for the same reason.
 */
const FOOTNOTE_START =
  /^\d{1,2}\s*\.\s+.*(Subs\.|Ins\.|Omitted|Rep\.|Added|deleted|w\.e\.f\.|by Act|by s\.|, ibid|renumbered)/i;
const PAGE_FOOT = 0.6;
/** Small enough to be a superscript marker rather than any kind of text. */
const MIN_LEGIBLE_HEIGHT = 6.5;

/** A line reduced to what a heading test should see: no brackets, no spaces. */
const bare = (line: string): string => line.replace(/[[\]\s]/g, "");

function decode(s: string): string {
  return s
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replace(/&#(\d+);/g, (_, c: string) => String.fromCodePoint(Number(c)));
}

interface Line {
  text: string;
  words: Word[];
}

function pageLines(page: string, min: number, max: number): Line[] {
  const height = Number(/height="([\d.]+)"/.exec(page)?.[1] ?? 0) || 0;
  // Collected BELOW the body window as well as inside it, because the line
  // that arms the footnote latch is itself too small to be body: this print
  // sets a footnote's first line at 7.24pt and wraps it at 8.9pt. Filtering to
  // the window first left only the wrap, which is not footnote-shaped, so the
  // latch never armed and the wrap was read as statute.
  const words: Word[] = [];
  for (const m of page.matchAll(WORD_TAG)) {
    const tall = Number(m[4]) - Number(m[2]);
    if (tall < MIN_LEGIBLE_HEIGHT || tall > max) continue;
    words.push({
      xMin: Number(m[1]),
      xMax: Number(m[3]),
      baseline: Number(m[4]),
      height: tall,
      text: decode(m[5] ?? ""),
    });
  }
  words.sort((a, b) => a.baseline - b.baseline || a.xMin - b.xMin);

  const lines: Line[] = [];
  let current: Word[] = [];
  let base = Number.NEGATIVE_INFINITY;
  /** Once the footnotes start, the rest of the page is footnote. */
  let footnotes = false;
  const push = () => {
    if (current.length === 0) return;
    const text = current
      .sort((a, b) => a.xMin - b.xMin)
      .map((w) => w.text)
      .join(" ")
      // Zero-width and other format characters survive trim() and are
      // invisible in a diff, so a line that looked exactly like an authority
      // note — "[Articles 75(4), 99, … and 219]" — did not match a pattern
      // anchored on its closing bracket. The Third Schedule lost its citation
      // that way.
      .replace(/[\u200b-\u200f\u2060\ufeff]/g, "")
      // Footnote markers rendered from a symbol font land in the PRIVATE USE
      // AREA, and they attach at either end: U+F02A opens the Ninth Schedule's
      // entries 91 and 100 and CLOSES the Third's authority note, where it
      // survived trim() and stopped a pattern anchored on the closing bracket.
      // Daggers go with them. The literal asterisk does NOT — a run of them is
      // how this print sets an omitted entry, which is content.
      .replace(/[\u2020\u2021\uf000-\uf0ff]/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const tallest = Math.max(...current.map((w) => w.height));
    const atFoot = height > 0 && base / height >= PAGE_FOOT;
    if (text && atFoot && FOOTNOTE_START.test(text)) footnotes = true;
    // Below the body window it is footnote or apparatus either way — it was
    // read only so that it could arm the latch.
    if (text && !footnotes && tallest >= min) {
      lines.push({ text, words: current.filter((w) => w.height >= min) });
    }
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

  // Read every page once: the heading tests need lines, not raw markup.
  const byPage = pages.map((page) => pageLines(page, min, max));
  const whole = (pattern: RegExp) =>
    new RegExp(`^(?:${pattern.source})$`, pattern.flags.includes("i") ? "i" : "");
  const headingLine = whole(options.heading);
  const endLine = whole(options.endsBefore);
  const carries = (lines: Line[], pattern: RegExp) => lines.some((l) => pattern.test(bare(l.text)));

  // The heading is printed in the contents as well as over the schedule, so the
  // LAST page that carries it is the schedule itself — the same trap the
  // offence-schedule parser records for Part I.
  let first = -1;
  for (let i = 0; i < byPage.length; i++) if (carries(byPage[i]!, headingLine)) first = i;
  if (first < 0) return { authority: null, lists: [], diagnostics: ["schedule heading not found"] };
  let last = byPage.length;
  for (let i = first + 1; i < byPage.length; i++) {
    if (carries(byPage[i]!, endLine)) {
      last = i;
      break;
    }
  }
  diagnostics.push(`pages ${first + 1}–${last}`);

  // Carries the page's own gutter with each line, since it moves page to page.
  const lines: (Line & { gutter: number | null })[] = [];
  for (let i = first; i < last; i++) {
    const page = byPage[i]!;
    const gutter = options.twoColumnAt === "auto" ? gutterOf(page) : null;
    for (const line of page) lines.push({ ...line, gutter });
  }

  const groupBy = options.groupBy ?? "none";
  let authority: string | null = null;
  const lists: ScheduleList[] = [];
  let open: ScheduleEntry | null = null;
  /** Entry numbers ascend within a group; one that goes backwards is not an
   * entry opening but a wrapped line that happens to start with a numeral. */
  let highest = 0;
  /** Set by entryEndsAt: nothing is collected until an entry opens again. */
  let suspended = false;
  /** An unnumbered line under a group that has no numbered entries yet. */
  let orphan = "";

  /** A schedule with no Lists or Parts still has one run of entries to put
   * them in; it simply has no name. */
  const currentList = (): ScheduleList => {
    const last = lists[lists.length - 1];
    if (last) return last;
    const only: ScheduleList = { number: null, title: null, entries: [] };
    lists.push(only);
    return only;
  };

  /** A group ends: an orphan line stands as its only entry, or is discarded. */
  const closeGroup = () => {
    // currentList(), not the last group, because a schedule of pure prose has
    // no group at all until something is put in one — Appendix III is a single
    // declaration under article 370(3) and never opens a numbered entry.
    if (orphan) {
      const group = currentList();
      if (group.entries.length === 0) {
        group.entries.push({ number: "", text: orphan.replace(/\s+/g, " ").trim() });
      }
    }
    orphan = "";
  };

  const closeEntry = () => {
    if (!open) return;
    const entry: ScheduleEntry = {
      ...open,
      // A label is a NAME — a State, an office, a marginal note — and the
      // apparatus an amendment wraps it in carries nothing once it stands
      // alone: "] Karnataka]]" is not a fact about Karnataka, and neither is
      // the "[ [*" trailing West Bengal. Stripped at the ENDS only. An entry
      // the print has omitted still shows it, because there the asterisks are
      // the BODY and the renderer marks them as the omission they are.
      label: open.label
        ?.replace(/\s+/g, " ")
        .replace(/^[[\]*\s]+/, "")
        .replace(/[[\]*\s]+$/, "")
        .trim(),
      text: open.text.replace(/\s+/g, " ").trim(),
    };
    if (options.splitHeading) {
      const split = HEADING_SPLIT.exec(entry.text);
      if (split?.[1] && split[2]) {
        entry.label = split[1].replace(/\s+/g, " ").trim();
        entry.text = split[2].trim();
      }
    }
    currentList().entries.push(entry);
    open = null;
  };

  const twoColumn = options.twoColumnAt !== undefined;
  const join = (words: Word[]) =>
    words
      .map((w) => w.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

  for (const row of lines) {
    // In a two-column schedule the LEFT column is the entry's label and the
    // RIGHT is its text, and they must be kept apart before anything else
    // looks at the line.
    const split =
      options.twoColumnAt === "auto" ? row.gutter : (options.twoColumnAt as number | undefined);
    const usable = twoColumn && split !== null && split !== undefined;
    const left = usable ? join(row.words.filter((w) => w.xMin < split!)) : "";
    const right = usable ? join(row.words.filter((w) => w.xMin >= split!)) : "";
    const line = (twoColumn ? left || right : row.text).trim();
    if (!line) continue;
    if (options.endsAtLine?.test(line)) break;
    if (FURNITURE.some((re) => re.test(left || line))) continue;
    if (headingLine.test(bare(line)) || options.skipLines?.test(line)) continue;
    if (options.entryEndsAt?.test(line)) {
      closeEntry();
      suspended = true;
      continue;
    }
    if (twoColumn && right && FURNITURE.some((re) => re.test(right))) continue;

    if (options.sectionHeading?.test(line)) {
      closeEntry();
      const m = /^([IVX]+)\.\s*(.+)$/.exec(line);
      lists.push({ number: m?.[1] ?? line, title: m?.[2] ?? null, entries: [] });
      highest = 0;
      continue;
    }

    if (!authority) {
      const cite = AUTHORITY.exec(line);
      if (cite?.[1]) {
        authority = cite[1].replace(/\s+/g, " ");
        continue;
      }
    }

    if (usable) {
      // An opening line runs the columns together, so where a body-opening
      // pattern is given the WHOLE line is read and split on content; the
      // geometric split is right for every line after it.
      const whole = join(row.words);
      const source = options.rowBodyStarts ? whole : left;
      const opener = ENTRY_START.exec(
        source.replace(LEADING_ASTERISK, "").replace(LEADING_APPARATUS, ""),
      );
      const base = opener?.[1] ? Number.parseInt(opener[1], 10) : 0;
      if (opener?.[1] && opener[2] && base >= highest) {
        closeEntry();
        highest = base;
        let label = opener[2];
        let body = options.rowBodyStarts ? "" : right;
        if (options.rowBodyStarts) {
          const words = opener[2].split(/\s+/);
          let at = -1;
          for (let i = 0; i < words.length; i++) {
            if (options.rowBodyStarts.test(words.slice(i).join(" "))) {
              at = i;
              break;
            }
          }
          if (at >= 0) {
            label = words.slice(0, at).join(" ");
            body = words.slice(at).join(" ");
          } else {
            // No body on this line: the name stands alone and the body starts
            // on the next.
            label = opener[2];
            body = "";
          }
        }
        open = { number: opener[1], label, text: body };
        continue;
      }
      if (open) {
        if (left) open.label = `${open.label ?? ""} ${left}`.trim();
        if (right) open.text += open.text ? ` ${right}` : right;
      }
      continue;
    }

    if (!authority) {
      const cite = AUTHORITY.exec(line);
      if (cite?.[1]) {
        authority = cite[1].replace(/\s+/g, " ");
        continue;
      }
    }

    if (groupBy === "list") {
      const heading = LIST_HEADING.exec(line);
      if (heading?.[1] && heading[2]) {
        closeEntry();
        closeGroup();
        lists.push({ number: heading[1], title: heading[2], entries: [] });
        highest = 0;
        continue;
      }
      // Everything before the first List heading is the schedule's own heading
      // and its authority note.
      if (lists.length === 0) continue;
    } else if (groupBy === "part") {
      const part = PART_HEADING.exec(line);
      if (part?.[1]) {
        closeEntry();
        closeGroup();
        lists.push({ number: part[1], title: null, entries: [] });
        highest = 0;
        suspended = false;
        continue;
      }
      // Everything before the first Part is the schedule's own heading and its
      // authority note — or, for a table appended to a paragraph, that
      // paragraph's text, which belongs to the paragraph and not here.
      if (lists.length === 0) continue;
    }

    const stripped = line.replace(LEADING_ASTERISK, "").replace(LEADING_APPARATUS, "");

    if (options.closingNote?.test(stripped)) {
      closeEntry();
      // Named by what the print calls it — "Explanation" closes the Ninth,
      // "Total" closes the Fourth's table — so the row reads as the print
      // reads rather than as a number the schedule does not give it.
      open = { number: /^[A-Za-z]+/.exec(stripped)?.[0] ?? "Note", text: stripped };
      // Nothing after a closing rider opens an entry.
      highest = Number.POSITIVE_INFINITY;
      continue;
    }

    if (options.romanNumerals) {
      const roman = ROMAN_HEADING.exec(stripped);
      if (roman?.[1]) {
        closeEntry();
        open = { number: roman[1], text: "" };
        continue;
      }
      if (open) {
        open.text += open.text ? ` ${line}` : line;
        continue;
      }
      continue;
    }

    // A row of a DOT-LEADER table may drop the stop after its number — the
    // Fourth Schedule sets "[31 Jammu and Kashmir………4]" against "1. Andhra
    // Pradesh………[11]" — and the leader itself is proof the line is a row, so
    // the looser shape is safe here and nowhere else.
    const start =
      ENTRY_START.exec(stripped) ??
      (/\.{3,}/.test(stripped) ? DOT_LEADER_ROW.exec(stripped) : null);
    const base = start?.[1] ? Number.parseInt(start[1], 10) : 0;
    if (start?.[1] && start[2] && base >= highest) {
      closeEntry();
      suspended = false;
      orphan = "";
      highest = base;
      open = { number: start[1], text: start[2] };
      continue;
    }
    if (start?.[1] && base < highest) {
      diagnostics.push(`ignored non-ascending "${start[1]}." after entry ${highest}`);
    }

    if (suspended) continue;
    if (open) {
      open.text += ` ${line}`;
      continue;
    }
    // Held, not kept. A group whose whole content is unnumbered does exist —
    // Part IIA of the table appended to the Sixth Schedule's paragraph 20 is
    // the single "Tripura Tribal Areas District", and Appendix III is one
    // declaration with no numbering at all — and the print gives them no
    // number because there is nothing to distinguish them from. But an
    // ordinary Part opens with its own title set in small caps, and a numbered
    // schedule opens with its heading and authority note; taking either for an
    // entry gave the Second and Fifth Schedules a spurious one each. So the
    // line is remembered and becomes an entry only if nothing numbered turns
    // up to displace it.
    if (groupBy !== "none" ? lists.length > 0 : true) {
      // An asterisk row is an OMITTED entry and is kept where it stands: Part
      // III of the table opens with the "* * *" that stands for the Mizo
      // District, struck out in 1972. Held to the end of the group it would
      // have sorted after the districts that follow it in the print.
      if (!/[A-Za-z]/.test(line)) {
        currentList().entries.push({ number: "", text: line });
        continue;
      }
      orphan = orphan ? `${orphan} ${line}` : line;
      continue;
    }
    diagnostics.push(`before the first entry: ${line.slice(0, 60)}`);
  }
  closeEntry();
  closeGroup();

  for (const list of lists) {
    const name = list.number ? `${groupBy === "part" ? "Part" : "List"} ${list.number}` : "entries";
    diagnostics.push(`${name}${list.title ? ` (${list.title})` : ""}: ${list.entries.length}`);
  }
  return { authority, lists, diagnostics };
}
