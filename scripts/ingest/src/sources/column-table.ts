/**
 * A statutory table of ANY width, read by its own printed headings
 * (`pdftotext -bbox` XHTML).
 *
 * THE MOTIVATING CASE is the inventory annexed to Appendix I of the
 * Constitution: the First Schedule to the 2015 India–Bangladesh boundary
 * agreement lists roughly 300 enclaves in six columns — Sl. No., Name of
 * Chhits, Chhit No., the police station each lies within in Bangladesh, the one
 * in West Bengal, and the area in acres. Every one of those columns is a fact
 * about a place that a reader may need to look up, and none of them is prose.
 *
 * WHY IT IS NOT list-schedule.ts. That parser reads a numbered LIST — one
 * column of text per entry — and this table's rows are numbered and ascending
 * too, so they open as entries there and the other five columns arrive
 * flattened into the first one's body, in whatever order the words happened to
 * be printed. It is also not schedule-table.ts, which is the Limitation Act's
 * three named columns and nothing else. What is general here is the SHAPE: a
 * numbered row, N cells, and headings that name them.
 *
 * Three things the print decides, each of which this parser measures rather
 * than assumes:
 *
 * 1. **A page is the table only if it carries the headings.** Every parser in
 *    this directory has learned the same lesson from a different print — the
 *    Limitation Act's contents page names its schedule 450 lines early
 *    (schedule-table.ts), both classification schedules name Part I hundreds of
 *    pages early (offence-schedule.ts), and a running header names the schedule
 *    it belongs to on every page of it (list-schedule.ts). The headings are
 *    reprinted at the top of every page of a table and nowhere else, so they
 *    are both the proof and the anchor.
 *
 * 2. **The headings anchor the columns; the emptiness between them places the
 *    boundary.** A heading is set centred over its column as often as not — the
 *    Limitation Act's "Time" begins at x=364 over content beginning at x=338 —
 *    so a boundary midway between two headings can fall inside a column and
 *    take its cells with it. What two consecutive headings do guarantee is that
 *    the gutter lies BETWEEN them, and within that bracket the least-covered x
 *    is the gutter itself. Occupancy, not arithmetic, which is what carries
 *    both prints in offence-schedule.ts.
 *
 * 3. **Boundaries are found per page, and inherited when a page has none.** A
 *    table that runs across pages is re-laid out on each of them; the BNSS
 *    moves a column 39 points in four pages. A continuation page that reprints
 *    no headings keeps the last page's measurements.
 *
 * A row opens on a line whose FIRST cell is a number, and only when that number
 * is not smaller than the last one seen — the same succession guard the other
 * table parsers use, because a cell that wraps onto a line beginning with a
 * numeral ("1160.30 acres") is otherwise indistinguishable from a new row.
 */

export interface ColumnTableRow {
  /** As printed, from the first column: "1", "137". */
  number: string;
  /** One string per heading, in printed order; "" where the print leaves a
   * cell blank. Always as long as `columns`. */
  cells: string[];
  /** The heading this row was printed under, where the table has any. */
  division?: string;
}

export interface ColumnTableResult {
  /** The headings, as given — stored as the schedule's column_labels. */
  columns: string[];
  rows: ColumnTableRow[];
  diagnostics: string[];
}

export interface ColumnTableOptions {
  /**
   * The headings as printed, in order.
   *
   * Given rather than discovered, for the reason act_schedules stores them:
   * they are what the table calls its own columns and the page renders as its
   * header, so they are content, not a detail of extraction. They are also how
   * the header row is recognised — see FIRST TOKENS below.
   */
  columns: string[];
  /**
   * A line that ends the table wherever on a page it falls. The annexure to
   * Appendix I runs three schedules together, and the one after this table
   * begins part-way down the page the last rows end on.
   */
  endsAtLine?: RegExp;
  /** A page whose heading ends the table, matched against a whole line with
   * brackets and spaces removed — the same shape list-schedule.ts uses. */
  endsBefore?: RegExp;
  /**
   * A heading printed ACROSS the table that opens a group of rows: the First
   * Schedule divides its enclaves into those transferred to India and those
   * transferred to Bangladesh, and the numbering restarts under each.
   */
  groupHeading?: RegExp;
  /** Page furniture: a running header, a folio line, a note under the table. */
  skipLines?: RegExp;
  /** Smallest word height that is body type. */
  minHeight?: number;
  /** Largest. Above this is the repository's page watermark, not text. */
  maxHeight?: number;
}

interface Word {
  xMin: number;
  xMax: number;
  baseline: number;
  height: number;
  text: string;
}

interface Line {
  text: string;
  words: Word[];
}

const WORD_TAG =
  /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;

/** Body 8.10pt in the 2026 Constitution print; footnotes 7.24pt below it, the
 * repository's watermark 11.79pt and up above it. */
const DEFAULT_MIN_HEIGHT = 7.7;
const DEFAULT_MAX_HEIGHT = 11;
/** Words on one printed line share a baseline. Cells are set to the top of
 * their row rather than centred in it, so this is the leading, not a row. */
const LINE_TOLERANCE = 4;
/**
 * How many consecutive lines a header row may occupy. "Lying within Police
 * station Bangladesh" does not fit its column and wraps; its neighbour wraps
 * with it, so the block is read as one and the columns' first words are found
 * in it by x rather than in reading order — reading order interleaves two
 * wrapped headings and puts "Lying within" twice before either finishes.
 */
const HEADER_MAX_LINES = 3;
/** Two columns are never closer than this; a repeated word inside a heading
 * cannot therefore be mistaken for the next heading's first word. */
const MIN_COLUMN_SEPARATION = 12;
/** A folio, or a superscript marker sitting on its own baseline. */
const PAGE_NUMBER = /^\d{1,4}$/;
/**
 * A row's first cell: the serial number, alone, with whatever apparatus an
 * amendment wrapped it in. Anything else in that column is a wrapped cell.
 */
const ROW_NUMBER = /^\[?\s*(\d{1,4}[A-Z]?)\s*[.)\]]*$/;
/**
 * A footnote's first line, and where on a page a block of them may begin — the
 * latch list-schedule.ts records, needed here for the same reason: this print
 * sets a footnote's first line at 7.24pt but WRAPS it at 8.9pt, inside the body
 * window, so the wrap alone would arrive as a cell of whatever row the page
 * ended on. Once a footnote-shaped line appears low on a page, the rest of that
 * page is footnote.
 */
const FOOTNOTE_START =
  /^\d{1,2}\s*\.\s+.*(Subs\.|Ins\.|Omitted|Rep\.|Added|deleted|w\.e\.f\.|by Act|by s\.|, ibid|renumbered)/i;
const PAGE_FOOT = 0.6;
/** Small enough to be a superscript marker rather than any kind of text. */
const MIN_LEGIBLE_HEIGHT = 6.5;

/** A line reduced to what a heading test should see: no brackets, no spaces. */
const bare = (line: string): string => line.replace(/[[\]\s]/g, "");
/** A token reduced to what a heading match should see: letters and digits. */
const key = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, "");

function decode(s: string): string {
  return s
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replace(/&#(\d+);/g, (_, c: string) => String.fromCodePoint(Number(c)));
}

function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Repairs artefacts of the extractor, never the wording: a word hyphenated
 * across a line break ("Khagra- bari"), and the space pdftotext inserts before
 * an em-dash the source sets tight. Both are spacing decisions made by the
 * print, and a name is the one thing in this table a reader will type.
 */
function tidyCell(text: string): string {
  return normalise(text)
    .replace(/([a-z])- ([a-z])/g, "$1-$2")
    .replace(/(\S) +—/g, "$1—");
}

function pageLines(page: string, min: number, max: number): Line[] {
  const height = Number(/height="([\d.]+)"/.exec(page)?.[1] ?? 0) || 0;
  const words: Word[] = [];
  for (const m of page.matchAll(WORD_TAG)) {
    const tall = Number(m[4]) - Number(m[2]);
    // Read below the body window as well as inside it: the line that arms the
    // footnote latch is itself too small to be body.
    if (tall < MIN_LEGIBLE_HEIGHT || tall > max) continue;
    const text = decode(m[5] ?? "")
      // Zero-width characters survive trim() and are invisible in a diff;
      // symbol-font footnote markers land in the PRIVATE USE AREA and attach
      // at either end of a word (D-089). Stripped here rather than on the
      // assembled line, so a cell and the line it came from can never differ.
      .replace(/[\u200b-\u200f\u2060\ufeff]/g, "")
      .replace(/[\u2020\u2021\uf000-\uf0ff]/g, "")
      .replace(/\u00a0/g, " ")
      .trim();
    if (!text) continue;
    words.push({
      xMin: Number(m[1]),
      xMax: Number(m[3]),
      baseline: Number(m[4]),
      height: tall,
      text,
    });
  }
  words.sort((a, b) => a.baseline - b.baseline || a.xMin - b.xMin);

  const lines: Line[] = [];
  let current: Word[] = [];
  let base = Number.NEGATIVE_INFINITY;
  let footnotes = false;
  const push = () => {
    if (current.length === 0) return;
    const sorted = current.sort((a, b) => a.xMin - b.xMin);
    const text = normalise(sorted.map((w) => w.text).join(" "));
    const tallest = Math.max(...sorted.map((w) => w.height));
    const atFoot = height > 0 && base / height >= PAGE_FOOT;
    if (text && atFoot && FOOTNOTE_START.test(text)) footnotes = true;
    if (text && !footnotes && tallest >= min) {
      lines.push({ text, words: sorted.filter((w) => w.height >= min) });
    }
    current = [];
  };
  for (const w of words) {
    if (current.length > 0 && Math.abs(w.baseline - base) > LINE_TOLERANCE) push();
    if (current.length === 0) base = w.baseline;
    current.push(w);
  }
  push();
  return lines.filter((line) => line.words.length > 0);
}

/**
 * FIRST TOKENS. A header row is a block of up to three consecutive lines
 * carrying the first word of every heading, in order and at increasing x.
 *
 * The first word rather than the whole heading, because a heading that does not
 * fit its column wraps and two that wrap together interleave: read in reading
 * order the block gives "Lying within", "Lying within", "police station
 * Bangladesh", "police station W. Bengal", so no heading appears whole. The
 * first word of a wrapped heading is always on its first line and always at its
 * column's own x, which is exactly what an anchor needs to be.
 *
 * Returns the x of each heading's first word, or null if the block is not a
 * header row.
 */
function anchorsIn(block: Line[], columns: string[]): number[] | null {
  const firsts = columns.map((c) => key(c.trim().split(/\s+/)[0] ?? ""));
  if (firsts.some((f) => !f)) return null;
  const words = block.flatMap((line) => line.words).sort((a, b) => a.xMin - b.xMin);

  const anchors: number[] = [];
  let at = 0;
  for (const first of firsts) {
    const previous = anchors[anchors.length - 1] ?? Number.NEGATIVE_INFINITY;
    let found = -1;
    for (let i = at; i < words.length; i++) {
      const word = words[i]!;
      if (word.xMin - previous < MIN_COLUMN_SEPARATION) continue;
      if (key(word.text) !== first) continue;
      found = i;
      break;
    }
    if (found < 0) return null;
    anchors.push(words[found]!.xMin);
    at = found + 1;
  }
  return anchors;
}

/** The header row on a page: where it starts, where it ends, and the anchors it
 * yields. The FIRST such block on the page — a table reprints its headings at
 * the top of every page it runs across. */
function headerOn(lines: Line[], columns: string[]): { at: number; through: number; anchors: number[] } | null {
  // Every word any heading is made of. What the anchors do not consume, this
  // does: see the tail below.
  const vocabulary = new Set(
    columns.flatMap((column) => column.split(/\s+/).map(key)).filter(Boolean),
  );
  for (let i = 0; i < lines.length; i++) {
    for (let take = 1; take <= HEADER_MAX_LINES && i + take <= lines.length; take++) {
      const anchors = anchorsIn(lines.slice(i, i + take), columns);
      if (!anchors) continue;
      // THE HEADER TAIL. The anchors are found on as few lines as carry every
      // heading's first word — usually one — but the headings themselves wrap
      // past it, and what is left over is still header: "Sl. Name of Chhit
      // Lying within Lying within Area in" anchors the columns, and "No. Chhits
      // No. PS Bangladesh PS W. Bengal acres" is the rest of the same row.
      // Unconsumed it arrives as the table's first line of cells.
      //
      // A line is tail only while every word in it is a word some heading is
      // made of, and only within the block — the same test schedule-table.ts
      // uses for the "limitation" that page 17 of the Limitation Act drops onto
      // a line of its own.
      let through = i + take;
      while (through < lines.length && through - i < HEADER_MAX_LINES) {
        const tokens = lines[through]!.text.split(/\s+/).map(key).filter(Boolean);
        if (tokens.length === 0 || !tokens.every((token) => vocabulary.has(token))) break;
        through++;
      }
      return { at: i, through, anchors };
    }
  }
  return null;
}

/**
 * The gutter between two anchors: the middle of the widest least-covered run of
 * x inside the bracket.
 *
 * The LEAST covered, not an empty one. A gutter is rarely empty in a print set
 * this tight — one long word of a name overhangs it, and a single such word
 * left one page of the Constitution's First Schedule with no empty run at all
 * (D-089). The middle, because a cell is assigned by where its words BEGIN: an
 * overhanging word still begins in its own column, so any x inside the run
 * divides the same way and the middle is the furthest from being wrong.
 */
function boundaryBetween(lines: Line[], from: number, to: number): number {
  const covered = new Map<number, number>();
  for (const line of lines) {
    for (const w of line.words) {
      for (let x = Math.floor(w.xMin); x <= Math.ceil(w.xMax); x++) {
        covered.set(x, (covered.get(x) ?? 0) + 1);
      }
    }
  }
  let least = Number.POSITIVE_INFINITY;
  for (let x = from; x <= to; x++) least = Math.min(least, covered.get(x) ?? 0);

  let best: [number, number] | null = null;
  let run: number | null = null;
  for (let x = from; x <= to + 1; x++) {
    const atLeast = x <= to && (covered.get(x) ?? 0) === least;
    if (atLeast && run === null) run = x;
    if (!atLeast && run !== null) {
      if (!best || x - run > best[1] - best[0]) best = [run, x - 1];
      run = null;
    }
  }
  return best ? Math.floor((best[0] + best[1]) / 2) : Math.floor((from + to) / 2);
}

/** Whether a page opens any row at all: a first cell that is a number, and not
 * one that goes backwards. What tells a continuation page of the table from the
 * page after it. */
function opensARow(lines: Line[], boundaries: number[], highest: number): boolean {
  return lines.some((line) => {
    const first = normalise(
      line.words
        .filter((w) => columnOf(w.xMin, boundaries) === 0)
        .map((w) => w.text)
        .join(" "),
    );
    const opener = ROW_NUMBER.exec(first);
    return Boolean(opener?.[1]) && Number.parseInt(opener![1]!, 10) >= highest;
  });
}

/** Which column a word sits in, given the boundaries between them. */
function columnOf(x: number, boundaries: number[]): number {
  let index = 0;
  while (index < boundaries.length && x >= boundaries[index]!) index++;
  return index;
}

export function parseColumnTable(xhtml: string, options: ColumnTableOptions): ColumnTableResult {
  const columns = options.columns.map((c) => normalise(c));
  const diagnostics: string[] = [];
  if (columns.length < 2) {
    return { columns, rows: [], diagnostics: ["a table needs at least two columns"] };
  }
  const min = options.minHeight ?? DEFAULT_MIN_HEIGHT;
  const max = options.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const byPage = xhtml
    .split(/<page /)
    .slice(1)
    .map((page) => pageLines(page, min, max));

  const whole = (pattern: RegExp) =>
    new RegExp(`^(?:${pattern.source})$`, pattern.flags.includes("i") ? "i" : "");
  const endLine = options.endsBefore ? whole(options.endsBefore) : null;

  const rows: ColumnTableRow[] = [];
  let boundaries: number[] | null = null;
  let inherited = 0;
  let firstPage = -1;
  let lastPage = -1;
  let open: ColumnTableRow | null = null;
  let cells: string[][] = [];
  let division: string | undefined;
  /** Row numbers ascend within a group; one that goes backwards is a wrapped
   * cell that happens to begin with a numeral, not a new row. */
  let highest = 0;
  let stop = false;

  const closeRow = () => {
    if (!open) return;
    open.cells = cells.map((cell) => tidyCell(cell.join(" ")));
    rows.push(open);
    open = null;
  };

  for (let p = 0; p < byPage.length && !stop; p++) {
    const lines = byPage[p]!;
    if (firstPage >= 0 && endLine && lines.some((l) => endLine.test(bare(l.text)))) break;

    const header = headerOn(lines, columns);
    if (header) {
      // Every page of a table reprints its headings, and they are measured
      // again on each: the columns are re-laid out page by page.
      // Calibrated on the table's CELLS only: a group heading is printed
      // across the columns and covers the gutters, and a folio sits over one
      // of them. Either lifts the floor the boundary is read from.
      const body = lines
        .slice(header.through)
        .filter(
          (l) =>
            !options.groupHeading?.test(l.text) &&
            !options.skipLines?.test(l.text) &&
            !PAGE_NUMBER.test(l.text),
        );
      boundaries = [];
      for (let i = 0; i < header.anchors.length - 1; i++) {
        boundaries.push(
          boundaryBetween(body, Math.round(header.anchors[i]!) + 1, Math.round(header.anchors[i + 1]!) - 1),
        );
      }
      if (firstPage < 0) {
        firstPage = p;
        diagnostics.push(`columns at x=${boundaries.join(", ")}`);
      }
    } else if (firstPage < 0) {
      continue; // not the table yet — a contents page naming it is not it
    } else if (boundaries && !opensARow(lines, boundaries, highest)) {
      // WHERE THE TABLE STOPS when the caller has not said. A page that neither
      // reprints the headings nor opens a row is not this table any more, and
      // read as one its prose arrives as cells of whatever row the last page
      // ended on — the failure offence-schedule.ts records as "39 pages of
      // prose read as a six-column table". The annexure this parser was written
      // for continues after the inventory with boundary descriptions, so the
      // page after the last row is exactly that prose.
      diagnostics.push(`page ${p + 1} carries neither the headings nor a row — the table ends`);
      break;
    } else {
      inherited++;
    }
    if (!boundaries) continue;
    lastPage = p;

    for (const line of header ? lines.slice(header.through) : lines) {
      if (options.endsAtLine?.test(line.text)) {
        stop = true;
        break;
      }
      if (options.skipLines?.test(line.text) || PAGE_NUMBER.test(line.text)) continue;

      if (options.groupHeading?.test(line.text)) {
        closeRow();
        division = normalise(line.text);
        // Each group numbers its own rows from 1 — the enclaves transferred
        // one way are numbered independently of those transferred the other.
        highest = 0;
        continue;
      }

      const parts: string[][] = columns.map(() => []);
      for (const word of line.words) parts[columnOf(word.xMin, boundaries)]!.push(word.text);
      const first = normalise(parts[0]!.join(" "));
      const opener = ROW_NUMBER.exec(first);
      const number = opener?.[1] ? Number.parseInt(opener[1], 10) : 0;

      if (opener?.[1] && number >= highest) {
        closeRow();
        if (number > highest + 1 && highest > 0) {
          diagnostics.push(`row ${number} follows ${highest} — check the print for a dropped row`);
        }
        highest = number;
        open = { number: opener[1], cells: [], ...(division ? { division } : {}) };
        cells = parts.map((cell) => (cell.length > 0 ? [normalise(cell.join(" "))] : []));
        cells[0] = [opener[1]];
        continue;
      }
      if (opener?.[1]) {
        diagnostics.push(`ignored non-ascending row "${opener[1]}" after row ${highest}`);
      }
      if (!open) {
        // Everything above the first row of the first page is the table's own
        // title and whatever the schedule says before it.
        if (line.text.trim()) diagnostics.push(`before the first row: ${line.text.slice(0, 60)}`);
        continue;
      }
      // A wrapped cell continues in the column it was printed in — except the
      // first, which holds the serial number and nothing else. A row opens only
      // when that column is a number ALONE, so anything else arriving there
      // afterwards is a line the geometry misplaced or a numeral the print set
      // for its own reasons; appended, it would corrupt the one value the row
      // is keyed and cited by. Dropped, and said so.
      if (!opener?.[1] && first) {
        diagnostics.push(`row ${open.number}: dropped "${first}" from the first column`);
      }
      parts.forEach((cell, index) => {
        if (index > 0 && cell.length > 0) cells[index]!.push(normalise(cell.join(" ")));
      });
    }
  }
  closeRow();

  if (firstPage < 0) {
    return { columns, rows: [], diagnostics: [`no page carries the headings ${columns.join(" | ")}`] };
  }
  diagnostics.push(
    `pages ${firstPage + 1}–${lastPage + 1}` +
      (inherited > 0 ? `, ${inherited} inheriting the previous page's columns` : ""),
  );
  diagnostics.push(`${rows.length} row(s)`);
  return { columns, rows, diagnostics };
}
