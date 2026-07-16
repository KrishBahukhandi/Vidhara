/**
 * Canonical gazette frontend: consumes `pdftotext -bbox` XHTML, where every
 * word carries exact PDF-point coordinates AND height. Classification is
 * geometric and typographic — immune to the character-grid drift that plagues
 * -layout output.
 *
 * Position/side model (producer-independent — verified on the cairo-produced
 * BNS 2023 and the iTextSharp-produced BNSS/BSA 2023 PDFs, whose font-height
 * metrics disagree, so height is NOT used):
 * - Each page prints marginal notes in ONE outer column — right on recto,
 *   left on verso. A page is a RIGHT-note page iff several non-furniture lines
 *   carry a word starting at x ≥ RIGHT_NOTE_X (≈484; body ends ≈478).
 * - Right-note page: words at x ≥ RIGHT_NOTE_X are the note; the rest is body,
 *   which is flush-left — no left splitting (avoids false splits on body gaps).
 * - Left-note page: a line whose first word starts in the margin column
 *   (x ≤ LEFT_NOTE_ANCHOR) is a note prefix; it runs while words stay within
 *   the note zone (x ≤ LEFT_NOTE_ZONE) and the body resumes at x ≥ BODY_MIN.
 *   Body continuation lines are indented past the anchor, so they are never
 *   mistaken for notes.
 * - Statutory citations ("45 of 1860.") share the right column — recorded in
 *   diagnostics, excluded from notes/body.
 * - Content begins after the "B E it enacted…" drop-cap formula and ends at
 *   the signature block.
 */
import {
  assembleSections,
  CITATION,
  classifyRightFragment,
  ENACTMENT,
  END_SENTINELS,
  FURNITURE,
  type GazetteParseResult,
  type LineParts,
  SCHEDULE_HEADING,
} from "./gazette-common";

export interface Word {
  xMin: number;
  xMax: number;
  yMin: number;
  /** Text baseline (yMax from pdftotext). Words on one printed line share this
   * even when italic/emphasis runs have a different height and yMin. */
  baseline: number;
  height: number;
  text: string;
}

/** Body right edge ≈478; words starting at/after this are the right note column. */
const RIGHT_NOTE_X = 484;
/** Left notes' first word starts at x ≈ 57–58. */
const LEFT_NOTE_ANCHOR_MAX_X = 100;
/** Left note words stay within this column; body resumes past it. */
const LEFT_NOTE_ZONE_MAX_X = 135;
/** Every left-note word STARTS before this; body words never do. The note's
 * 9.6pt leading drifts into body lines' baseline window every few lines, and
 * body continuation words (x ≈ 117.6, xMax often ≤ 135) defeated an
 * xMax-based zone test — xMin separates the columns cleanly (note words
 * start ≤ ~106.5, body ≥ ~117.6). */
const LEFT_NOTE_WORD_MAX_X = 112;
/** Body resumes at the continuation edge (≈117.6) or section indent (≈142). */
const LEFT_BODY_RESUME_X = 115;
/** Body (section number / indented continuation) resumes at/after this. */
const BODY_MIN_X = 138;
/** Non-furniture lines with a right-column word needed to call a page recto. */
const RIGHT_NOTE_PAGE_MIN_LINES = 3;
/** Baseline (yMax) grouping tolerance; body line spacing is ≈12pt. */
const LINE_Y_TOLERANCE = 4;

const WORD_TAG =
  /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;

function decodeEntities(s: string): string {
  return s
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

/**
 * Groups a page's words into visual lines by shared text baseline (yMax).
 * Baseline — not yMin — because marginal notes and italic/emphasis runs are
 * set in smaller type: they share the body baseline but have a larger yMin,
 * which would scatter them into phantom lines if grouped by top edge.
 */
export function groupIntoLines(words: Word[]): Word[][] {
  const sorted = [...words].sort((a, b) => a.baseline - b.baseline || a.xMin - b.xMin);
  const lines: Word[][] = [];
  let current: Word[] = [];
  let currentBaseline = Number.NEGATIVE_INFINITY;

  for (const word of sorted) {
    if (current.length === 0 || Math.abs(word.baseline - currentBaseline) <= LINE_Y_TOLERANCE) {
      current.push(word);
      if (current.length === 1) currentBaseline = word.baseline;
    } else {
      lines.push(current.sort((a, b) => a.xMin - b.xMin));
      current = [word];
      currentBaseline = word.baseline;
    }
  }
  if (current.length > 0) lines.push(current.sort((a, b) => a.xMin - b.xMin));
  return lines;
}

/** A line has a left-margin note: first word in the anchor column, then a gap
 * to body resuming past the note zone. */
export function isLeftNoteLine(line: Word[]): boolean {
  const first = line[0];
  if (!first || first.xMin > LEFT_NOTE_ANCHOR_MAX_X) return false;
  let split = 0;
  while (
    split < line.length &&
    line[split]!.xMin <= LEFT_NOTE_WORD_MAX_X &&
    line[split]!.xMax <= LEFT_NOTE_ZONE_MAX_X
  )
    split++;
  if (split === 0 || split === line.length) return false;
  return line[split]!.xMin >= LEFT_BODY_RESUME_X;
}

/** A line has a right-margin NOTE (not merely a statutory citation, which
 * appears in the right column on left-note pages too). */
export function isRightNoteLine(line: Word[]): boolean {
  const rightWords = line.filter((w) => w.xMin >= RIGHT_NOTE_X);
  if (rightWords.length === 0) return false;
  return !CITATION.test(rightWords.map((w) => w.text).join(" ").trim());
}

/**
 * Determines a page's note side by weighing evidence: recto pages have many
 * right-margin notes, verso pages many left-margin notes. Citations (which sit
 * in the right column regardless of side) are excluded from right evidence.
 */
export function isRightNotePage(contentLines: Word[][]): boolean {
  let right = 0;
  let left = 0;
  for (const line of contentLines) {
    if (isRightNoteLine(line)) right++;
    if (isLeftNoteLine(line)) left++;
  }
  return right > left && right >= RIGHT_NOTE_PAGE_MIN_LINES;
}

/**
 * Classifies one visual line into margin / body / citation parts.
 * `rightNotePage` selects the primary note column, but right-column words
 * (x ≥ RIGHT_NOTE_X, past the body's right edge) are ALWAYS notes/citations —
 * a section's note occasionally sits on the right even on a left-note page.
 */
export function classifyLine(line: Word[], rightNotePage: boolean): LineParts {
  const parts: LineParts = {};

  const rightWords = line.filter((w) => w.xMin >= RIGHT_NOTE_X);
  let rest = line.filter((w) => w.xMin < RIGHT_NOTE_X);
  if (rightWords.length > 0) {
    classifyRightFragment(rightWords.map((w) => w.text).join(" ").trim(), parts);
  }

  // A statutory citation ("1 of 1872.") can sit in the LEFT margin beside its
  // body line on EITHER page side (BSA §170 hid behind one on a recto page).
  // Body text never starts in the anchor column, so a citation-shaped leading
  // zone fragment is stripped unconditionally.
  const anchor = rest[0];
  if (anchor && anchor.xMin <= LEFT_NOTE_ANCHOR_MAX_X) {
    let zone = 0;
    while (
      zone < rest.length &&
      rest[zone]!.xMin <= LEFT_NOTE_WORD_MAX_X &&
      rest[zone]!.xMax <= LEFT_NOTE_ZONE_MAX_X
    )
      zone++;
    const fragment = rest.slice(0, zone).map((w) => w.text).join(" ").trim();
    if (zone > 0 && CITATION.test(fragment)) {
      parts.citation = parts.citation ? `${parts.citation} ${fragment}` : fragment;
      rest = rest.slice(zone);
    }
  }

  // Left-note page: a margin prefix is present only when the FIRST word sits in
  // the anchor column; body words start at/after the continuation edge.
  if (!rightNotePage) {
    const first = rest[0];
    if (first && first.xMin <= LEFT_NOTE_ANCHOR_MAX_X) {
      let split = 0;
      while (
        split < rest.length &&
        rest[split]!.xMin <= LEFT_NOTE_WORD_MAX_X &&
        rest[split]!.xMax <= LEFT_NOTE_ZONE_MAX_X
      )
        split++;
      const bodyStart = rest[split];
      if (split > 0 && (bodyStart === undefined || bodyStart.xMin >= LEFT_BODY_RESUME_X)) {
        const fragment = rest.slice(0, split).map((w) => w.text).join(" ").trim();
        if (fragment) parts.margin = parts.margin ? `${fragment} ${parts.margin}` : fragment;
        rest = rest.slice(split);
      }
    }
  }

  const body = rest.map((w) => w.text).join(" ").replace(/\s+/g, " ").trim();
  if (body) parts.body = body;
  return parts;
}

export function parseGazetteBBox(xhtml: string): GazetteParseResult {
  const pages = xhtml.split(/<page /).slice(1);
  const lineParts: LineParts[] = [];
  let started = false;
  let ended = false;

  for (const pageXml of pages) {
    if (ended) break;
    const words: Word[] = [];
    for (const match of pageXml.matchAll(WORD_TAG)) {
      const yMin = Number(match[2]);
      const yMax = Number(match[4]);
      words.push({
        xMin: Number(match[1]),
        yMin,
        xMax: Number(match[3]),
        baseline: yMax,
        height: yMax - yMin,
        text: decodeEntities(match[5] ?? ""),
      });
    }

    const pageLines = groupIntoLines(words);
    // Page-side evidence is gathered only from real content lines — furniture
    // and anything from the end-signature block onward (a digital-certificate
    // dump lives in the right column and would skew the vote) are excluded.
    const sentinelIdx = pageLines.findIndex((line) =>
      END_SENTINELS.some((re) => re.test(line.map((w) => w.text).join(" "))),
    );
    const upto = sentinelIdx === -1 ? pageLines.length : sentinelIdx;
    const contentLines = pageLines.slice(0, upto).filter((line) => {
      const flat = line.map((w) => w.text).join(" ").trim();
      return !FURNITURE.some((re) => re.test(flat));
    });
    const rightNotePage = isRightNotePage(contentLines);

    for (const line of pageLines) {
      const flat = line.map((w) => w.text).join(" ");
      if (!started) {
        if (ENACTMENT.test(flat)) started = true;
        continue;
      }
      if (END_SENTINELS.some((re) => re.test(flat))) {
        ended = true;
        break;
      }
      if (SCHEDULE_HEADING.test(flat.trim())) {
        ended = true;
        break;
      }
      if (FURNITURE.some((re) => re.test(flat.trim()))) continue;
      lineParts.push(classifyLine(line, rightNotePage));
    }
  }

  return assembleSections(lineParts);
}
