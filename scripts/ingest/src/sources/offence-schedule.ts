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
  /** The sub-section this row classifies, where the print names one ("1" for
   * the "64(1)" row). Absent when the row covers the whole section. */
  subsection?: string;
  /** Column 4's distinct values, Ditto resolved, in printed order. */
  cognizable: string[];
  /** Column 5's distinct values. */
  bailable: string[];
  /** Column 6's distinct values. */
  court: string[];
  /** True/false only where the section carries ONE value and that value says
   * so plainly; null where it is conditional ("According as offence abetted
   * is …") or where the section has tiers that differ. */
  isCognizable: boolean | null;
  isBailable: boolean | null;
  /** The section is classified more than one way — a graver form of the same
   * offence carries its own row. Renderers must not state a single answer. */
  hasTiers: boolean;
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
/** Two columns are never closer than this. Taking the six heaviest clusters
 * alone is not enough: a single stray cell-start can outrank a real column that
 * happens to have few wrapped lines on that page, and it did — one vote at
 * x=298 displaced the real column at x=392 and shifted every classification on
 * that page one place left, which is how sections 66 to 71 came out with
 * punishment text in the cognizable column. Separation makes the six chosen
 * positions describe a table rather than merely be popular. */
const MIN_COLUMN_SEPARATION = 30;
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
/**
 * Column 1's section number, with the sub-section the print sometimes names.
 *
 * Where a section's sub-sections are classified differently the schedule says
 * so in column 1 — "64(1)" is rape and "64(2)" is rape by a police officer, one
 * Court of Session each but reached by different routes. A pattern accepting
 * only a bare number silently dropped every such row, and with them section 64
 * itself: punishment for rape, absent from the table entirely.
 */
const SECTION_NUMBER = /^(\d{1,3}[A-Z]{0,2})(?:\(([0-9a-z]+)\))?\.?$/;
const DITTO = /^(ditto|do)\.?$/i;
/**
 * The values these three columns are allowed to take.
 *
 * One section often carries SEVERAL printed rows — a graver form of the same
 * offence, with its own punishment and its own classification — and none of
 * them repeats the section number, so a section's block is not one row. Rather
 * than guess where the print divides them (every rule for that split either
 * cut wrapped values in half or ran two rows together), a block is read for
 * the VALUES it contains: one distinct value per column means the section is
 * classified unambiguously, and more than one means the section has tiers and
 * the schedule itself must be consulted. Both are honest; only the first is
 * shown as a fact about the section.
 */
const VALUE_PATTERNS: RegExp[] = [
  // Most specific first, and each consumed whole: "According as offence
  // abetted is cognizable or non-cognizable." is ONE value, not three, and
  // reading it as three made four sections in five look tiered.
  //
  // The closing full stop is OPTIONAL because the print does not always set
  // one: section 351 gives "Non-cognizable" without a stop in its (2) and (3)
  // rows and with one in its (4), and requiring it dropped both of the first
  // two entirely.
  /^according as\b[^.]*\.?/i,
  /^court by which\b[^.]*\.?/i,
  /^court in which\b[^.]*\.?/i,
  /^non-\s*cognizable\.?(\s*\([^)]*\)\.?)?/i,
  /^cognizable\.?(\s*\([^)]*\)\.?)?/i,
  /^non-\s*bailable\.?(\s*\([^)]*\)\.?)?/i,
  /^bailable\.?(\s*\([^)]*\)\.?)?/i,
  /^court of session\.?/i,
  /^magistrate of the first class\.?/i,
  /^any magistrate\.?/i,
  /^the court of session\.?/i,
];

/**
 * The distinct values a cell holds, in the order the print sets them.
 *
 * Scanned left to right and consumed whole, so a value that contains a shorter
 * value inside it is read once.
 */
function valuesIn(cell: string): string[] {
  const text = cell
    .replace(/\s+/g, " ")
    // The print breaks "Non-cognizable" across lines as "Non-" / "cognizable",
    // and the two arrive as separate words. Nothing in this column's vocabulary
    // contains a hyphen followed by a space, so closing them up is safe.
    .replace(/-\s+/g, "-")
    .trim();
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (const pattern of VALUE_PATTERNS) {
      const m = pattern.exec(text.slice(i));
      if (!m) continue;
      // Stored without the trailing stop, so that a value the print closes and
      // one it does not are the same value rather than two tiers.
      const value = m[0].replace(/\s+/g, " ").replace(/\.$/, "").trim();
      if (value && !out.includes(value)) out.push(value);
      i += m[0].length;
      matched = true;
      break;
    }
    if (!matched) i++;
  }
  return out;
}

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
 * Cell-start positions and their weights for one set of lines.
 *
 * Every word that opens a line, or follows a gap wide enough to be a cell
 * boundary, votes for a position; the votes cluster on the column edges.
 */
function cellStartClusters(lines: Word[][]): { left: number; weight: number }[] {
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
  const positions = [...votes.entries()].sort((a, b) => a[0] - b[0]);
  const clusters: { left: number; weight: number }[] = [];
  for (const [x, n] of positions) {
    const last = clusters[clusters.length - 1];
    // A cluster is named by its LEFTMOST position: that is the column's true
    // edge, while heavier positions inside it are ordinary text.
    if (last && x - last.left <= COLUMN_CLUSTER) last.weight += n;
    else clusters.push({ left: x, weight: n });
  }
  return clusters;
}

/**
 * The six columns of the table as a whole.
 *
 * Taken over every page at once, because no single page is reliable: one page
 * may set a column that few of its cells wrap in, leaving a real edge with a
 * single vote that a stray cell-start elsewhere outranks. Across the schedule
 * the six are unmistakable (BNSS: 72, 107, 225, 324, 387, 454, carrying 430 to
 * 1,631 votes each) and every per-page variant sits within a few points of one.
 */
function globalColumns(allLines: Word[][]): number[] {
  const chosen: number[] = [];
  for (const c of cellStartClusters(allLines).sort((a, b) => b.weight - a.weight)) {
    if (chosen.length === COLUMNS) break;
    if (chosen.some((x) => Math.abs(x - c.left) < MIN_COLUMN_SEPARATION)) continue;
    chosen.push(c.left);
  }
  return chosen.sort((a, b) => a - b);
}

/**
 * This page's six edges: the table's columns, moved to where this page put them.
 *
 * The widths are not constant through the schedule — the BNSS sets column 4 at
 * x=294 on its first page and x=333 four pages later — so each page's own
 * cell-starts decide, but only ever by choosing WITHIN a column the whole table
 * agrees exists. That is what stops a single stray vote from becoming a seventh
 * column and shifting every classification on the page one place left, which is
 * how sections 66 to 71 first came out with punishment text under "cognizable".
 */
function pageColumns(lines: Word[][], columns: number[]): number[] {
  const best = columns.map(() => ({ left: 0, weight: -1 }));
  for (const c of cellStartClusters(lines)) {
    let nearest = 0;
    for (let i = 1; i < columns.length; i++) {
      if (Math.abs(c.left - columns[i]!) < Math.abs(c.left - columns[nearest]!)) nearest = i;
    }
    if (c.weight > best[nearest]!.weight) best[nearest] = { left: c.left, weight: c.weight };
  }
  // A column this page gave no evidence for keeps the table's own position.
  return best.map((b, i) => (b.weight > 0 ? b.left : columns[i]!));
}

function columnOf(x: number, edges: number[]): number {
  let index = 0;
  for (let i = 0; i < edges.length; i++) if (x + COLUMN_SLACK >= edges[i]!) index = i;
  return index;
}

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
  const bodies = pages.slice(firstPage, lastPage).map((page) => {
    const all = toLines(pageWords(page, stamps));
    const header = columnNumberRowIndex(all);
    return header >= 0 ? all.slice(header + 1) : all;
  });
  const columns = globalColumns(bodies.flat());
  if (columns.length < COLUMNS) {
    return { rows: [], diagnostics: [`found ${columns.length} columns, need ${COLUMNS}`] };
  }
  const region = bodies.map((lines) => ({ lines, edges: pageColumns(lines, columns) }));
  diagnostics.push(
    `pages ${firstPage + 1}–${lastPage}; table columns ${columns.join(", ")}`,
  );

  const blocks: { section: string; subsection?: string; cells: string[] }[] = [];
  let current: { section: string; subsection?: string; cells: string[] } | null = null;

  const commit = () => {
    if (!current) return;
    blocks.push(current);
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
        current = {
          section: sectionMatch[1]!,
          subsection: sectionMatch[2],
          cells: [...cells],
        };
        continue;
      }
      if (!current) continue;
      // A continuation line: append only where this row already reaches.
      for (let c = 1; c < COLUMNS; c++) {
        if (!cells[c]) continue;
        current.cells[c] = current.cells[c] ? `${current.cells[c]} ${cells[c]}` : cells[c]!;
      }
    }
  }
  commit();

  // Ditto means the row above — resolve before anything reads these.
  const carried: Record<number, string> = {};
  for (const block of blocks) {
    for (const column of [3, 4, 5]) {
      const value = block.cells[column]!.trim();
      if (!value || DITTO.test(value.replace(/[.\s]+$/, ""))) block.cells[column] = carried[column] ?? "";
      else carried[column] = value;
    }
  }

  const rows: OffenceClassification[] = blocks.map((block) => {
    const cognizable = valuesIn(block.cells[3]!);
    const bailable = valuesIn(block.cells[4]!);
    const court = valuesIn(block.cells[5]!);
    const hasTiers = cognizable.length > 1 || bailable.length > 1 || court.length > 1;
    const only = (values: string[], negative: RegExp, positive: RegExp): boolean | null => {
      if (values.length !== 1) return null;
      const v = values[0]!;
      if (/^according as/i.test(v)) return null;
      if (negative.test(v)) return false;
      if (positive.test(v)) return true;
      return null;
    };
    return {
      section: block.section,
      ...(block.subsection ? { subsection: block.subsection } : {}),
      cognizable,
      bailable,
      court,
      isCognizable: only(cognizable, /^non-\s*cognizable/i, /^cognizable/i),
      isBailable: only(bailable, /^non-\s*bailable/i, /^bailable/i),
      hasTiers,
    };
  });

  // A label the schedule prints twice is a label this parser has not fully
  // resolved. Section 61(2) is set as "61(2)" over "(a)" on the next line, so
  // its two rows — a conspiracy to commit a grave offence, and any other
  // conspiracy — both arrive as "61(2)" with different classifications. Rather
  // than pick one, both are marked as carrying more than one classification,
  // which is what stops either being stated as the answer for that section.
  const labelOf = (r: OffenceClassification) => `${r.section}|${r.subsection ?? ""}`;
  const labelCounts = new Map<string, number>();
  for (const r of rows) labelCounts.set(labelOf(r), (labelCounts.get(labelOf(r)) ?? 0) + 1);
  let repeated = 0;
  for (const r of rows) {
    if ((labelCounts.get(labelOf(r)) ?? 0) <= 1) continue;
    r.hasTiers = true;
    r.isCognizable = null;
    r.isBailable = null;
    repeated++;
  }
  if (repeated > 0) diagnostics.push(`${repeated} rows share a section label and are left unasserted`);

  const unread = rows.filter((r) => r.cognizable.length === 0 && r.bailable.length === 0 && r.court.length === 0);
  if (unread.length > 0) {
    diagnostics.push(
      `${unread.length} sections yielded no classification at all: ` +
        unread.slice(0, 8).map((r) => `s.${r.section}`).join(", "),
    );
  }
  const tiered = rows.filter((r) => r.hasTiers);
  diagnostics.push(`${rows.length} sections; ${tiered.length} carry more than one classification`);

  return { rows, diagnostics };
}
