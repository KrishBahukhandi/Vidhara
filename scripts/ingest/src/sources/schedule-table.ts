/**
 * Three-column statutory schedule parser (`pdftotext -bbox` XHTML).
 *
 * The Limitation Act's Schedule — and the same shape elsewhere — is a table,
 * not sectional text: each row is an Article with a description, a period, and
 * the event the period runs from. Forcing that into the section model would
 * misrepresent it (D-035), so it gets its own bundle and its own table.
 *
 * Geometry, not whitespace: `-layout` collapses the columns wherever a cell
 * wraps, and the wrap points differ per page. Every word here carries its
 * x-coordinate, so the split is exact.
 *
 * Three things this parser learned from the 1963 print, each of which silently
 * corrupts the table if ignored:
 *
 * 1. **The contents page lies.** "THE SCHEDULE." appears in the table of
 *    contents ~450 lines before the real heading. Starting at the first match
 *    parses the Act's own sections 1–32 as Articles. The schedule is therefore
 *    only entered on a page that also carries the column header row.
 * 2. **Column edges are calibrated, not assumed.** The header words are
 *    centred over their columns and sit well left of the cell text they label
 *    ("Time" begins at x=364; its column's content begins at x=338), so no
 *    fixed slack works. Instead the widest empty vertical band inside a
 *    header-anchored window becomes the boundary — self-calibrating for any
 *    producer, and it reported 264–271 and 314–337 here.
 * 3. **Articles are not always one row.** Articles 114–116 carry lettered
 *    sub-items, each with its own period ("(a) … Ninety days · (b) … Thirty
 *    days"), and 115 nests (i)/(ii) under a (b) that has no period of its own.
 *    Flattening those into one cell yields "Ninety days. The Thirty days. The"
 *    — text that reads as law but is not. Rows are preserved.
 *
 * Row identity is the article number in column 1, accepted ONLY when it is the
 * next one expected. Descriptions begin with numerals routinely and footnote
 * markers restart at "1." on every page; strict succession keeps both out.
 */

export interface ScheduleRow {
  /** Sub-item label as printed ("(a)", "(i)"), absent on single-row articles. */
  label?: string;
  description: string;
  period: string;
  commencement: string;
}

export interface ScheduleArticle {
  number: string;
  division: string;
  partNumber?: string;
  partTitle?: string;
  rows: ScheduleRow[];
}

export interface ScheduleParseResult {
  articles: ScheduleArticle[];
  divisions: string[];
  diagnostics: string[];
}

interface Word {
  x: number;
  baseline: number;
  text: string;
}

const WORD_TAG =
  /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;

/** Words on one printed line share a baseline; small-caps runs differ in yMin. */
const LINE_Y_TOLERANCE = 3;
/** Used only if a page omits the header row (measured on the 1963 print). */
const FALLBACK_COL2_X = 268;
const FALLBACK_COL3_X = 325;
/** Centred headings start well right of the table's left edge. */
const HEADING_MIN_X = 150;

const DIVISION_HEADING = /^(FIRST|SECOND|THIRD|FOURTH|FIFTH)\s+DIVISION\b/;
const PART_HEADING = /^PART\s+([IVXLC]+)\s*\.?\s*[—–-]+\s*(.+)$/;
const ARTICLE_START = /^(\d{1,3})\s*\.$/;
/**
 * A line of nothing but digits is page furniture — either the folio or a
 * superscript amendment marker, which sits on its own baseline (the "1" of
 * `1[Sixty days]` is 4pt above the text it marks, outside the line tolerance).
 * Neither is statutory text; the bracketed text they annotate is kept.
 */
const PAGE_NUMBER = /^\d{1,4}$/;
const HEADER_ROW = /^Description\s+of/;
/**
 * The header row wraps on narrow pages — page 17 prints "Period of" and drops
 * "limitation" onto the next line, where it sits in the period column and
 * reads as a second period for whatever article ended the page (Article 70
 * acquired a phantom row worth "limitation"). Any short line made only of
 * header vocabulary, immediately after a header row, is that tail.
 */
const HEADER_TAIL_WORD = /^(description|of|suit|period|limitation|time|from|which|begins|to|run)$/i;
const HEADER_TAIL_MAX_WORDS = 3;
/**
 * Footnotes are numbered markers followed by amendment vocabulary, printed
 * below the last row. They restart at "1." on every page and would otherwise
 * be appended to whichever article the page ended on — and, worse, their text
 * spans the full page width, which would corrupt the column calibration.
 * Everything after one on the same page is furniture.
 */
const FOOTNOTE = /^\d{1,2}\s*\.?\s*(Subs|Ins|Omitted|Rep\b|Added|Cl\b|The\s+words|Certain\s+words)/i;
/** Lettered/roman/numbered sub-item openers: "(a) …", "(i) …", "(1) …". */
const SUB_ITEM = /^\(([a-z]{1,3}|\d{1,2})\)/;
/** The schedule's subtitle and authority line, printed under the heading. */
const SCHEDULE_FURNITURE = /^\(PERIODS|^\[See\s+section/i;

/**
 * PDF small caps arrive as separate words ("P" + "ART") because the capital
 * and the reduced-size letters are different runs. Rejoin a lone capital with
 * the upper-case run following it. Headings only — body prose is mixed case.
 */
function joinSmallCaps(text: string): string {
  return text.replace(/\b([A-Z])\s+([A-Z]{2,})/g, "$1$2");
}

function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Repairs artefacts of the print, never the wording: a sub-item marker glued
 * to its first word ("(a)where"), a word hyphenated across a line break
 * ("sub- section"), and the space pdftotext inserts before an em-dash that the
 * source sets tight ("acquittal, —"). Each is a spacing decision made by the
 * extractor, not by the legislature.
 */
function tidyCell(text: string): string {
  return normalise(text)
    .replace(/^(\([a-z0-9]{1,3}\))(?=\S)/i, "$1 ")
    .replace(/([a-z])- ([a-z])/g, "$1-$2")
    .replace(/(\S) +—/g, "$1—");
}

/** Small-caps headings shout at body size, and the source's capitalisation
 * carries no meaning; render them as titles. */
function titleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/(^|[\s(—–-])([a-z])/g, (_m, lead: string, ch: string) => lead + ch.toUpperCase())
    .replace(/\b(Of|To|The|For|And|In|An|Or|By|On|With|Is|There|Which|No)\b/g, (m, _g, offset: number) =>
      offset === 0 ? m : m.toLowerCase(),
    );
}

function parsePages(xhtml: string): Word[][] {
  return xhtml
    .split(/<page /)
    .slice(1)
    .map((page) => {
      const words: Word[] = [];
      for (const match of page.matchAll(WORD_TAG)) {
        const text = (match[5] ?? "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#39;/g, "'")
          .replace(/&apos;/g, "'")
          .replace(/&quot;/g, '"');
        if (text.trim()) words.push({ x: Number(match[1]), baseline: Number(match[4]), text });
      }
      return words;
    });
}

function groupLines(words: Word[]): Word[][] {
  const sorted = [...words].sort((a, b) => a.baseline - b.baseline || a.x - b.x);
  const lines: Word[][] = [];
  for (const word of sorted) {
    const last = lines[lines.length - 1];
    if (last?.[0] && Math.abs(last[0].baseline - word.baseline) <= LINE_Y_TOLERANCE) last.push(word);
    else lines.push([word]);
  }
  return lines.map((line) => line.sort((a, b) => a.x - b.x));
}

interface ScheduleLine {
  words: Word[];
  text: string;
  heading: string;
}

/**
 * Table rows only: everything from the real schedule heading onward, minus
 * page furniture, headings and footnotes. Both the calibration pass and the
 * parse pass read the same stream, so they can never disagree about which
 * lines are table content.
 */
function scheduleLines(pages: Word[][], startAt: string): { lines: ScheduleLine[]; headerRow?: Word[]; found: boolean } {
  const lines: ScheduleLine[] = [];
  let headerRow: Word[] | undefined;
  let started = false;
  let headerTailPending = false;

  for (const page of pages) {
    const grouped = groupLines(page);
    // The contents page names the schedule too; only a page carrying the
    // column header row is the schedule itself.
    const pageHasHeader = grouped.some((line) =>
      HEADER_ROW.test(normalise(line.map((w) => w.text).join(" "))),
    );
    if (!started && !pageHasHeader) continue;

    for (const line of grouped) {
      const text = normalise(line.map((w) => w.text).join(" "));
      if (!text) continue;
      const heading = normalise(joinSmallCaps(text));

      if (!started) {
        if (heading.toUpperCase().startsWith(startAt)) started = true;
        continue;
      }
      if (HEADER_ROW.test(text)) {
        headerRow ??= line;
        headerTailPending = true;
        continue;
      }
      if (headerTailPending) {
        headerTailPending = false;
        const words = text.split(" ");
        if (words.length <= HEADER_TAIL_MAX_WORDS && words.every((w) => HEADER_TAIL_WORD.test(w))) {
          continue;
        }
      }
      if (FOOTNOTE.test(text)) break; // footnotes end the page's table content
      if (PAGE_NUMBER.test(text) || SCHEDULE_FURNITURE.test(heading)) continue;

      lines.push({ words: line, text, heading });
    }
  }

  return { lines, headerRow, found: started };
}

/**
 * Boundary = midpoint of the widest fully empty vertical band inside a window
 * anchored on the header word. Cell text is left-aligned and ragged-right, so
 * the band between two columns is the one thing the print guarantees.
 */
function calibrate(lines: ScheduleLine[], headerRow: Word[] | undefined): { col2: number; col3: number } {
  const occupied = new Set<number>();
  for (const line of lines) {
    if ((line.words[0]?.x ?? 0) > HEADING_MIN_X) continue; // centred heading, spans columns
    for (const word of line.words) occupied.add(Math.floor(word.x));
  }

  const widestBand = (from: number, to: number): number | undefined => {
    let best: { width: number; mid: number } | undefined;
    let runStart: number | undefined;
    for (let x = from; x <= to; x += 1) {
      if (!occupied.has(x)) {
        runStart ??= x;
      } else {
        if (runStart !== undefined) {
          const width = x - runStart;
          if (width >= 4 && (!best || width > best.width)) best = { width, mid: Math.floor((runStart + x) / 2) };
        }
        runStart = undefined;
      }
    }
    return best?.mid;
  };

  const periodX = headerRow?.find((w) => /^Period$/i.test(w.text))?.x;
  const timeX = headerRow?.find((w) => /^Time$/i.test(w.text))?.x;

  return {
    col2: (periodX !== undefined ? widestBand(periodX - 60, periodX + 25) : undefined) ?? FALLBACK_COL2_X,
    col3: (timeX !== undefined ? widestBand(timeX - 90, timeX + 25) : undefined) ?? FALLBACK_COL3_X,
  };
}

/**
 * @param xhtml   `pdftotext -bbox` output for the whole act.
 * @param startAt Heading that opens the schedule; text before it is sectional
 *                and belongs to the gazette parser.
 */
export function parseScheduleTable(xhtml: string, startAt = "THE SCHEDULE"): ScheduleParseResult {
  const pages = parsePages(xhtml);
  const { lines, headerRow, found } = scheduleLines(pages, startAt);
  const diagnostics: string[] = [];
  if (!found) return { articles: [], divisions: [], diagnostics: [`schedule heading "${startAt}" not found`] };

  const { col2, col3 } = calibrate(lines, headerRow);
  diagnostics.push(`column boundaries calibrated at x=${col2} and x=${col3}`);

  const articles: ScheduleArticle[] = [];
  const divisions: string[] = [];
  let division = "";
  let partNumber: string | undefined;
  let partTitle: string | undefined;
  let article: ScheduleArticle | undefined;
  let row: ScheduleRow | undefined;
  let expected = 1;

  for (const line of lines) {
    const divisionMatch = line.heading.match(DIVISION_HEADING);
    if (divisionMatch) {
      division = titleCase(line.heading.replace(/\s*[—–-]\s*/, " — "));
      divisions.push(division);
      partNumber = undefined;
      partTitle = undefined;
      article = undefined;
      row = undefined;
      continue;
    }

    const partMatch = line.heading.match(PART_HEADING);
    if (partMatch && (line.words[0]?.x ?? 0) > HEADING_MIN_X) {
      partNumber = partMatch[1];
      partTitle = titleCase(normalise(partMatch[2] ?? ""));
      article = undefined;
      row = undefined;
      continue;
    }

    const cells: [string[], string[], string[]] = [[], [], []];
    for (const word of line.words) cells[word.x < col2 ? 0 : word.x < col3 ? 1 : 2].push(word.text);
    const [descWords, periodWords, timeWords] = cells;
    const period = normalise(periodWords.join(" "));
    const commencement = normalise(timeWords.join(" "));

    const startMatch = descWords[0]?.match(ARTICLE_START);
    if (startMatch) {
      const number = Number(startMatch[1]);
      if (number === expected) {
        const description = normalise(descWords.slice(1).join(" "));
        // Article 44 opens on "(a)" — the first row carries a label too.
        row = { label: description.match(SUB_ITEM)?.[0], description, period, commencement };
        article = { number: startMatch[1] ?? "", division, partNumber, partTitle, rows: [row] };
        articles.push(article);
        expected += 1;
        continue;
      }
      if (number > expected) {
        diagnostics.push(`saw article ${number} while expecting ${expected} — check for a dropped row`);
      }
    }

    if (!article) {
      diagnostics.push(`orphan line before the first article: "${line.text.slice(0, 60)}"`);
      continue;
    }

    const description = normalise(descWords.join(" "));
    const subItem = descWords[0]?.match(SUB_ITEM);
    // A lettered sub-item, or a second period inside one article, opens a row.
    if (subItem || (period && row?.period)) {
      row = { label: subItem?.[0], description, period, commencement };
      article.rows.push(row);
      continue;
    }

    if (!row) continue;
    if (description) row.description = row.description ? `${row.description} ${description}` : description;
    if (period) row.period = row.period ? `${row.period} ${period}` : period;
    if (commencement) {
      row.commencement = row.commencement ? `${row.commencement} ${commencement}` : commencement;
    }
  }

  // Tidy once, after accumulation — a word hyphenated across a line break is
  // only rejoinable when both halves sit in the same string.
  for (const entry of articles) {
    for (const cell of entry.rows) {
      cell.description = tidyCell(cell.description);
      cell.period = tidyCell(cell.period);
      cell.commencement = tidyCell(cell.commencement);
    }
  }

  return { articles, divisions, diagnostics };
}
