/**
 * Legacy gazette frontend: consumes `pdftotext -layout` output. Character-grid
 * columns DRIFT in this format (the same note column lands at col 84–98
 * depending on kerning), so this path is heuristic — kept for environments
 * without -bbox output and as documentation of the layout. PREFER
 * gazette-bbox.ts (word coordinates, drift-free); the CLI auto-selects it.
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
} from "./gazette-common";

export type { GazetteParseResult, ParsedChapter, ParsedSection } from "./gazette-common";

const RIGHT_COL = 80;
/** Note fragments are short words; anything longer is a mis-split body. */
const MAX_NOTE_FRAGMENT = 40;

/**
 * Split one raw layout line into margin / body / citation parts.
 * `leftMargins`: whether this page prints notes on the left (col 0).
 * `noteCol`: calibrated right-note start column (null = uncalibrated).
 */
export function splitLine(
  raw: string,
  leftMargins = true,
  noteCol: number | null = null,
): LineParts {
  const line = raw.replace(/\t/g, "  ").trimEnd();
  if (!line.trim()) return {};

  const firstCharAt = line.length - line.trimStart().length;
  const parts: LineParts = {};
  const noteWindowStart = noteCol !== null ? noteCol - 2 : RIGHT_COL;

  if (firstCharAt >= Math.min(noteWindowStart, RIGHT_COL)) {
    classifyRightFragment(line.trim(), parts);
    return parts;
  }

  let bodyStart = firstCharAt;

  if (leftMargins && firstCharAt === 0) {
    // Left marginal note, possibly followed by body after a wide gap. The gap
    // must appear early — the left note column is narrow.
    const gap = /\s{3,}/.exec(line);
    if (!gap || gap.index === 0) {
      parts.margin = line.trim();
      return parts;
    }
    if (gap.index <= 30) {
      parts.margin = line.slice(0, gap.index).trim();
      bodyStart = gap.index + gap[0].length;
    }
  }

  // Trailing right-column fragment after the LAST wide gap, if it starts in
  // the note window. Greedy (.*) anchors the split at the last ≥3-space run.
  let body = line.slice(bodyStart);
  const tail = /^(.*\S)\s{3,}(\S.*)$/.exec(body);
  if (tail?.[1] && tail[2]) {
    const fragmentStartCol = bodyStart + (tail[0].length - tail[2].length);
    if (fragmentStartCol >= noteWindowStart && tail[2].trim().length <= MAX_NOTE_FRAGMENT) {
      classifyRightFragment(tail[2].trim(), parts);
      body = tail[1];
    }
  }

  const bodyText = body.trim();
  if (bodyText) parts.body = bodyText;
  return parts;
}

/**
 * Detects the column where right-margin notes start, from lines where a wide
 * gap makes the split unambiguous. Returns the modal start column (null when
 * the document has too few right-margin notes to calibrate).
 */
export function detectRightNoteColumn(lines: string[]): number | null {
  const counts = new Map<number, number>();
  for (const raw of lines) {
    const line = raw.replace(/\t/g, "  ").trimEnd();
    const firstCharAt = line.length - line.trimStart().length;
    if (!line.trim() || firstCharAt >= RIGHT_COL) continue;
    const tail = /^(.*\S)\s{3,}(\S.*)$/.exec(line);
    if (!tail?.[2] || tail[2].trim().length > MAX_NOTE_FRAGMENT) continue;
    const startCol = tail[0].length - tail[2].length;
    if (startCol < RIGHT_COL) continue;
    if (CITATION.test(tail[2].trim())) continue;
    counts.set(startCol, (counts.get(startCol) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestCount = 2; // require at least 3 samples
  for (const [col, count] of counts) {
    if (count > bestCount) {
      best = col;
      bestCount = count;
    }
  }
  return best;
}

interface Page {
  lines: string[];
  leftMargins: boolean;
}

/**
 * Splits layout text into pages (\f) and detects each page's marginal-note
 * side: left-note pages have col-0 lines that are short fragments or
 * fragment + wide-gap + body; right-note pages have flush full-width body.
 */
export function paginate(text: string): Page[] {
  return text.split("\f").map((pageText) => {
    const lines = pageText.split("\n");
    let leftEvidence = 0;
    let rightEvidence = 0;
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line || line.startsWith(" ")) continue;
      if (FURNITURE.some((re) => re.test(line))) continue;
      const gap = /\s{3,}/.exec(line);
      if ((gap && gap.index <= 30) || line.length <= 30) leftEvidence++;
      else if (line.length > 50) rightEvidence++;
    }
    return { lines, leftMargins: leftEvidence >= rightEvidence };
  });
}

export function parseGazetteLayoutText(text: string): GazetteParseResult {
  const allLines = text.split("\n");
  const rightNoteCol = detectRightNoteColumn(allLines);
  const pages = paginate(text);

  const lineParts: LineParts[] = [];
  let started = false;
  let ended = false;

  for (const page of pages) {
    if (ended) break;
    for (const raw of page.lines) {
      if (!started) {
        if (ENACTMENT.test(raw)) started = true;
        continue;
      }
      if (END_SENTINELS.some((re) => re.test(raw))) {
        ended = true;
        break;
      }
      if (FURNITURE.some((re) => re.test(raw))) continue;
      lineParts.push(splitLine(raw, page.leftMargins, rightNoteCol));
    }
  }

  return assembleSections(lineParts);
}
