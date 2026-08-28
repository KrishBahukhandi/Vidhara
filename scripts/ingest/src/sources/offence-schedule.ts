/**
 * The First Schedule's classification of offences (`pdftotext -bbox` XHTML).
 *
 * The CrPC and the BNSS each close with a six-column table that says, for every
 * offence in the code it serves, whether it is cognizable, whether it is
 * bailable, and which court may try it. It is the first thing anyone asks after
 * "what does this section say?", and it is the one fact a bare-act reader
 * cannot get from the section's own text.
 *
 * NOTE WHOSE SECTIONS THESE ARE. The CrPC's schedule classifies **IPC**
 * sections and the BNSS's classifies **BNS** sections — a row keys to the
 * substantive code, not to the procedural one the schedule is printed in. So
 * these attach to IPC and BNS section pages.
 *
 * WHAT IS TAKEN, AND WHAT IS DELIBERATELY NOT. Only columns 1, 4, 5 and 6 —
 * the section number and the three classifications. Columns 2 and 3 (offence,
 * punishment) are the print's own precis of a section whose authoritative text
 * this corpus already carries in full, and the schedule itself says they are
 * "not intended as the definition of, and the punishment prescribed for, the
 * offence … but merely as indication of the substance of the section". Storing
 * a lossy paraphrase beside the real thing would be a liability, and unlike the
 * three classifications it could not be validated against anything.
 *
 * Three properties of the print drive the design:
 *
 * 1. **Columns are found by where cells START, and PER PAGE.** The column
 *    numbers "1 2 3 4 5 6" are centred over their columns and sit far from the
 *    text they label — the BNSS centres column 3 at x=260 over content running
 *    225–330, so a boundary derived from header centres lands *inside* column 3
 *    and drags its punishment text into the cognizable column. Every wrapped
 *    line in a cell instead begins exactly at its column's left edge, so those
 *    left edges cluster hard and are what an occupancy profile shows as sharp
 *    rises.
 *
 *    Per page, because **the column widths are not constant through the
 *    table**: the BNSS sets column 4 at x=294 on its first page and x=333 four
 *    pages later, so one calibration over the whole schedule puts the abetment
 *    rows' "According as offence abetted is cognizable" into the punishment
 *    column. A page that cannot be calibrated inherits the last page that
 *    could, which is what carries the handful of short continuation pages.
 *
 * 2. **"Ditto" means the row above.** The print sets a repeated classification
 *    as "Ditto" — 1 in 4 rows in the CrPC — and a row lifted onto its own page
 *    saying "Ditto" tells a reader nothing. It is resolved by carrying the last
 *    real value forward per column, which is what the word means.
 *
 * 3. **The classifications are a closed vocabulary, so they can be checked.**
 *    "Cognizable", "Non-cognizable", "Bailable", "Non-bailable", "Court of
 *    Session", "Any Magistrate", "Magistrate of the first class" and a small
 *    number of conditional forms ("According as offence abetted is …") account
 *    for nearly every cell. Anything else is reported as a diagnostic rather
 *    than published, so a column that silently slipped shows up as a wall of
 *    unrecognised values instead of as plausible-looking law.
 */

export interface OffenceClassification {
  /** Section of the SUBSTANTIVE code (IPC/BNS), as printed. */
  section: string;
  /** Column 4, Ditto resolved, as printed. */
  cognizable: string;
  /** Column 5, Ditto resolved, as printed. */
  bailable: string;
  /** Column 6, Ditto resolved, as printed. */
  court: string;
  /** True/false where the printed text says so plainly; null where it is
   * conditional ("According as offence abetted is cognizable or not"). */
  isCognizable: boolean | null;
  isBailable: boolean | null;
  /** Where one section carries several rows, the order they are printed in. */
  rowIndex: number;
}

export interface OffenceScheduleResult {
  rows: OffenceClassification[];
  diagnostics: string[];
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

/** Words this tall are the repository's page stamp, not table text (D-077). */
const MAX_TEXT_HEIGHT = 14;
/** Same baseline within this many points is the same visual line. */
const LINE_TOLERANCE = 3;
/** A word starting this far after the previous word's end begins a new cell. */
const CELL_GAP = 6;
/** Cell-start positions within this distance are the same column. */
const COLUMN_CLUSTER = 8;
/** A word may sit this far left of its column's edge and still belong to it —
 * centred cells ("Ditto" alone in a wide column) drift right, never left, but
 * the first character of an italic or bracketed cell can overhang slightly. */
const COLUMN_SLACK = 3;

const COLUMNS = 6;

/** Part I opens under this; Part II ("against other laws") ends it — those rows
 * are keyed by punishment range rather than by section and have no section page
 * to attach to. Dashes vary between the two prints, hence the class. */
const PART_ONE = /OFFENCES\s+UNDER\s+THE\s+(INDIAN\s+PENAL\s+CODE|BHARATIYA\s+NYAYA\s+SANHITA)/i;
const PART_TWO = /CLASSIFICATION\s+OF\s+OFFENCES\s+AGAINST\s+OTHER\s+LAWS/i;
/** The column-number row, reprinted at the top of every page of the table. It
 * is also the only reliable proof that a page IS the table: both prints name
 * Part I in their Arrangement of Sections hundreds of pages earlier, and
 * entering there parses the entire Act as a six-column table (the same trap
 * schedule-table.ts records for the Limitation Act's contents page). */
const COLUMN_NUMBER_ROW = /^1\s+2\s+3\s+4\s+5\s+6$/;
function columnNumberRowIndex(lines: Word[][]): number {
  return lines.findIndex((line) => {
    const tokens = line.map((w) => w.text.trim()).filter(Boolean);
    return tokens.length === COLUMNS && tokens.every((t, i) => t === String(i + 1));
  });
}
function hasColumnNumberRow(lines: Word[][]): boolean {
  return columnNumberRowIndex(lines) >= 0;
}

/**
 * Tokens of the repository's page stamp (D-077), which lands inside table cells
 * on the BNSS print. The smallest of its glyph runs is 11.79pt against a 12.22pt
 * body, so no height cut reaches it; what marks it is that it repeats on nearly
 * every page at a size almost nothing else uses.
 */
function stampTokens(pages: string[]): Set<string> {
  const heights = new Map<number, number>();
  const pagesFor = new Map<string, Set<number>>();
  pages.forEach((page, index) => {
    for (const m of page.matchAll(WORD_TAG)) {
      const height = Math.round((Number(m[4]) - Number(m[2])) * 100) / 100;
      heights.set(height, (heights.get(height) ?? 0) + 1);
      const key = `${m[5] ?? ""}|${height}`;
      const seen = pagesFor.get(key) ?? new Set<number>();
      seen.add(index);
      pagesFor.set(key, seen);
    }
  });
  let body = 0;
  let commonest = 0;
  for (const [h, n] of heights) if (n > commonest) [commonest, body] = [n, h];
  const total = [...heights.values()].reduce((a, b) => a + b, 0);
  const stamps = new Set<string>();
  if (pages.length < 4) return stamps;
  for (const [key, seen] of pagesFor) {
    const text = key.slice(0, key.lastIndexOf("|"));
    const height = Number(key.slice(key.lastIndexOf("|") + 1));
    if (!/[A-Za-z]/.test(text)) continue;
    if (height === body) continue;
    if ((heights.get(height) ?? 0) > total * 0.01) continue;
    if (seen.size < pages.length * 0.6) continue;
    stamps.add(key);
  }
  return stamps;
}
/** A section number in column 1: "302", "115", "376AB". */
const SECTION_NUMBER = /^(\d{1,3}[A-Z]{0,2})\.?$/;
const DITTO = /^(ditto|do)\.?$/i;

function decode(s: string): string {
  return s
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replace(/&#(\d+);/g, (_, c: string) => String.fromCodePoint(Number(c)));
}

function pageWords(pageXml: string, stamps: Set<string> = new Set()): Word[] {
  const out: Word[] = [];
  for (const m of pageXml.matchAll(WORD_TAG)) {
    const yMin = Number(m[2]);
    const yMax = Number(m[4]);
    const height = yMax - yMin;
    if (height > MAX_TEXT_HEIGHT) continue;
    if (stamps.has(`${m[5] ?? ""}|${Math.round(height * 100) / 100}`)) continue;
    out.push({
      xMin: Number(m[1]),
      xMax: Number(m[3]),
      baseline: yMax,
      height,
      text: decode(m[5] ?? ""),
    });
  }
  return out;
}

function toLines(words: Word[]): Word[][] {
  const sorted = [...words].sort((a, b) => a.baseline - b.baseline || a.xMin - b.xMin);
  const lines: Word[][] = [];
  let current: Word[] = [];
  let base = Number.NEGATIVE_INFINITY;
  for (const w of sorted) {
    if (current.length === 0 || Math.abs(w.baseline - base) <= LINE_TOLERANCE) {
      current.push(w);
      if (current.length === 1) base = w.baseline;
    } else {
      lines.push(current.sort((a, b) => a.xMin - b.xMin));
      current = [w];
      base = w.baseline;
    }
  }
  if (current.length > 0) lines.push(current.sort((a, b) => a.xMin - b.xMin));
  return lines;
}

/**
 * The six column left edges, learned from where cells begin.
 *
 * See note 1 in the file comment: the header cannot supply these. Every word
 * that opens a line, or follows a gap wide enough to be a cell boundary, votes
 * for a position; the votes cluster on the column edges and the six heaviest
 * clusters are the columns.
 */
function columnEdges(lines: Word[][]): number[] {
  const votes = new Map<number, number>();
  for (const line of lines) {
    let previousEnd: number | null = null;
    for (const w of line) {
      if (previousEnd === null || w.xMin - previousEnd > CELL_GAP) {
        const key = Math.round(w.xMin);
        votes.set(key, (votes.get(key) ?? 0) + 1);
      }
      previousEnd = w.xMax;
    }
  }
  // Merge neighbouring positions into clusters, then keep the heaviest six.
  const positions = [...votes.entries()].sort((a, b) => a[0] - b[0]);
  const clusters: { left: number; weight: number }[] = [];
  for (const [x, n] of positions) {
    const last = clusters[clusters.length - 1];
    if (last && x - last.left <= COLUMN_CLUSTER) {
      // The cluster is named by its LEFTMOST position: that is the column's
      // true edge, while heavier positions inside it are ordinary text.
      last.weight += n;
    } else {
      clusters.push({ left: x, weight: n });
    }
  }
  return clusters
    .sort((a, b) => b.weight - a.weight)
    .slice(0, COLUMNS)
    .map((c) => c.left)
    .sort((a, b) => a - b);
}

function columnOf(x: number, edges: number[]): number {
  let index = 0;
  for (let i = 0; i < edges.length; i++) if (x + COLUMN_SLACK >= edges[i]!) index = i;
  return index;
}

/** Reading of a classification cell, where the print states one plainly. */
function readFlag(text: string, negative: RegExp, positive: RegExp): boolean | null {
  const t = text.trim();
  // A conditional cell states no classification of its own.
  if (/^according as/i.test(t)) return null;
  if (negative.test(t)) return false;
  if (positive.test(t)) return true;
  return null;
}

/** Cells the print uses over and over. Anything outside this is reported. */
const EXPECTED_COGNIZABLE = /^(non-\s*)?cognizable\b/i;
const EXPECTED_BAILABLE = /^(non-\s*)?bailable\b/i;
const EXPECTED_COURT = /^(court|any magistrate|magistrate|the court|sessions)/i;
const CONDITIONAL = /^according as/i;

export function parseOffenceSchedule(xhtml: string): OffenceScheduleResult {
  const diagnostics: string[] = [];
  const pages = xhtml.split(/<page /).slice(1);

  // Confine to Part I. Part II classifies by punishment range rather than by
  // section, so it has nothing to attach to and is left for another day.
  let firstPage = -1;
  let lastPage = pages.length;
  for (let i = 0; i < pages.length; i++) {
    const flat = pages[i]!.replace(/<[^>]+>/g, " ");
    if (firstPage < 0 && PART_ONE.test(flat) && hasColumnNumberRow(toLines(pageWords(pages[i]!)))) {
      firstPage = i;
    }
    if (firstPage >= 0 && i > firstPage && PART_TWO.test(flat)) {
      lastPage = i;
      break;
    }
  }
  if (firstPage < 0) {
    return { rows: [], diagnostics: ["no 'OFFENCES UNDER THE …' heading — not a classification schedule"] };
  }

  // Everything above a page's column-number row is heading or explanatory note
  // — page 1 of the BNSS table carries five paragraphs of notes set across the
  // full table width, which otherwise arrive as cell text in columns 4 to 6.
  const stamps = stampTokens(pages.slice(firstPage, lastPage));
  const region: { lines: Word[][]; edges: number[] }[] = [];
  let lastEdges: number[] | null = null;
  let inherited = 0;
  for (const page of pages.slice(firstPage, lastPage)) {
    const all = toLines(pageWords(page, stamps));
    const header = columnNumberRowIndex(all);
    const lines = header >= 0 ? all.slice(header + 1) : all;
    const own = columnEdges(lines);
    const usable = own.length === COLUMNS;
    if (usable) lastEdges = own;
    else inherited++;
    const edges = usable ? own : lastEdges;
    if (!edges) continue; // nothing to calibrate against yet
    region.push({ lines, edges });
  }
  if (region.length === 0) {
    return { rows: [], diagnostics: ["no page in the schedule could be calibrated"] };
  }
  diagnostics.push(
    `pages ${firstPage + 1}–${lastPage}; ${region.length} calibrated` +
      (inherited > 0 ? `, ${inherited} inheriting the previous page's columns` : ""),
  );

  const rows: OffenceClassification[] = [];
  let current: { section: string; cells: string[] } | null = null;
  const perSection = new Map<string, number>();

  const commit = () => {
    if (!current) return;
    const index = perSection.get(current.section) ?? 0;
    perSection.set(current.section, index + 1);
    rows.push({
      section: current.section,
      cognizable: current.cells[3]!.trim(),
      bailable: current.cells[4]!.trim(),
      court: current.cells[5]!.trim(),
      isCognizable: null,
      isBailable: null,
      rowIndex: index,
    });
    current = null;
  };

  for (const { lines, edges } of region) {
    for (const line of lines) {
      const cells = Array.from({ length: COLUMNS }, () => "");
      for (const w of line) {
        const c = columnOf(w.xMin, edges);
        cells[c] = cells[c] ? `${cells[c]} ${w.text}` : w.text;
      }
      const flat = cells.join(" ").replace(/\s+/g, " ").trim();
      if (!flat) continue;
      if (COLUMN_NUMBER_ROW.test(flat)) continue;
      // A chapter banner inside the schedule spans the table and opens no row.
      if (/^CHAPTER\b/i.test(flat) && !SECTION_NUMBER.test(cells[0]!.trim())) continue;

      const head = cells[0]!.trim();
      const sectionMatch = SECTION_NUMBER.exec(head);
      if (sectionMatch) {
        commit();
        current = { section: sectionMatch[1]!, cells: [...cells] };
        continue;
      }
      // A continuation line: append only where this row already reaches.
      if (current) {
        for (let c = 1; c < COLUMNS; c++) {
          if (!cells[c]) continue;
          current.cells[c] = current.cells[c] ? `${current.cells[c]} ${cells[c]}` : cells[c]!;
        }
      }
    }
  }
  commit();

  // Ditto means the row above — resolve before anything reads these.
  const carried = { cognizable: "", bailable: "", court: "" } as Record<string, string>;
  for (const row of rows) {
    for (const key of ["cognizable", "bailable", "court"] as const) {
      const value = row[key];
      if (!value || DITTO.test(value.replace(/[.\s]+$/, ""))) {
        row[key] = carried[key] ?? "";
      } else {
        carried[key] = value;
      }
    }
    row.isCognizable = readFlag(row.cognizable, /^non-\s*cognizable/i, /^cognizable/i);
    row.isBailable = readFlag(row.bailable, /^non-\s*bailable/i, /^bailable/i);
  }

  // Every cell should be one of a small set of printed forms. Report the rest.
  const odd = (label: string, ok: RegExp) =>
    rows.filter((r) => {
      const v = (r as unknown as Record<string, string>)[label]!.trim();
      return v.length > 0 && !ok.test(v) && !CONDITIONAL.test(v);
    });
  for (const [label, ok] of [
    ["cognizable", EXPECTED_COGNIZABLE],
    ["bailable", EXPECTED_BAILABLE],
    ["court", EXPECTED_COURT],
  ] as const) {
    const bad = odd(label, ok);
    if (bad.length > 0) {
      diagnostics.push(
        `${bad.length} unrecognised ${label} values, e.g. ` +
          bad
            .slice(0, 4)
            .map((r) => `s.${r.section} "${(r as unknown as Record<string, string>)[label]!.slice(0, 48)}"`)
            .join("; "),
      );
    }
  }
  const empty = rows.filter((r) => !r.cognizable && !r.bailable && !r.court);
  if (empty.length > 0) diagnostics.push(`${empty.length} rows carry no classification at all`);

  return { rows, diagnostics };
}
