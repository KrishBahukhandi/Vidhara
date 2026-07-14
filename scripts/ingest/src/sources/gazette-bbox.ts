/**
 * Canonical gazette frontend: consumes `pdftotext -bbox` XHTML, where every
 * word carries exact PDF-point coordinates AND height. Classification is
 * geometric and typographic — immune to the character-grid drift that plagues
 * -layout output.
 *
 * Measured on the official BNS 2023 PDF (A4, 595pt wide):
 * - Marginal notes are set in SMALLER type: word height ≈ 8.8pt vs body ≈ 11pt.
 *   That is the primary discriminator — on crowded lines the left-note column
 *   (x ∈ [~58, ~140]) and the body column (x ≥ ~108) touch with ~1pt gaps, so
 *   position alone cannot split them.
 * - Left notes: small words anchored at x ≈ 58, confined to x ≤ ~150.
 *   (Small type elsewhere — Illustrations blocks — runs past x > 150 and is
 *   kept as body.)
 * - Right notes: any word at xMin ≥ ~484 (body ends ≈ 482).
 * - Statutory citations ("45 of 1860.") share the right column — recorded in
 *   diagnostics, excluded from notes/body.
 * - Content begins after the "B E it enacted…" drop-cap formula and ends at
 *   the signature block.
 */
import {
  assembleSections,
  classifyRightFragment,
  ENACTMENT,
  END_SENTINELS,
  FURNITURE,
  type GazetteParseResult,
  type LineParts,
} from "./gazette-common";

export interface Word {
  xMin: number;
  xMax: number;
  yMin: number;
  height: number;
  text: string;
}

const RIGHT_NOTE_X = 484;
/** Note type ≈ 8.8pt tall; body ≈ 11pt. */
const NOTE_MAX_HEIGHT = 10;
/** Left notes anchor at x ≈ 58 … */
const LEFT_NOTE_ANCHOR_MAX_X = 100;
/** … and never extend past ~140; small type beyond this is body (Illustrations). */
const LEFT_NOTE_ZONE_MAX_X = 150;
const LINE_Y_TOLERANCE = 3;

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

/** Groups a page's words (already in reading order) into visual lines. */
export function groupIntoLines(words: Word[]): Word[][] {
  const sorted = [...words].sort((a, b) => a.yMin - b.yMin || a.xMin - b.xMin);
  const lines: Word[][] = [];
  let current: Word[] = [];
  let currentY = Number.NEGATIVE_INFINITY;

  for (const word of sorted) {
    if (current.length === 0 || Math.abs(word.yMin - currentY) <= LINE_Y_TOLERANCE) {
      current.push(word);
      if (current.length === 1) currentY = word.yMin;
    } else {
      lines.push(current.sort((a, b) => a.xMin - b.xMin));
      current = [word];
      currentY = word.yMin;
    }
  }
  if (current.length > 0) lines.push(current.sort((a, b) => a.xMin - b.xMin));
  return lines;
}

/** Classifies one visual line into margin / body / citation parts. */
export function classifyLine(line: Word[]): LineParts {
  const parts: LineParts = {};

  const rightWords = line.filter((w) => w.xMin >= RIGHT_NOTE_X);
  const mainWords = line.filter((w) => w.xMin < RIGHT_NOTE_X);

  if (rightWords.length > 0) {
    classifyRightFragment(rightWords.map((w) => w.text).join(" ").trim(), parts);
  }
  if (mainWords.length === 0) return parts;

  // Left marginal note: SMALL type anchored in the left column and confined to
  // the note zone. Small type running wider is body (Illustrations blocks).
  const smallWords = mainWords.filter((w) => w.height < NOTE_MAX_HEIGHT);
  let bodyWords = mainWords;
  if (
    smallWords.length > 0 &&
    smallWords[0]!.xMin <= LEFT_NOTE_ANCHOR_MAX_X &&
    smallWords.every((w) => w.xMax <= LEFT_NOTE_ZONE_MAX_X)
  ) {
    const fragment = smallWords.map((w) => w.text).join(" ").trim();
    if (fragment) parts.margin = parts.margin ? `${fragment} ${parts.margin}` : fragment;
    bodyWords = mainWords.filter((w) => w.height >= NOTE_MAX_HEIGHT);
  }

  const body = bodyWords.map((w) => w.text).join(" ").replace(/\s+/g, " ").trim();
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
      words.push({
        xMin: Number(match[1]),
        yMin,
        xMax: Number(match[3]),
        height: Number(match[4]) - yMin,
        text: decodeEntities(match[5] ?? ""),
      });
    }

    for (const line of groupIntoLines(words)) {
      const flat = line.map((w) => w.text).join(" ");
      if (!started) {
        if (ENACTMENT.test(flat)) started = true;
        continue;
      }
      if (END_SENTINELS.some((re) => re.test(flat))) {
        ended = true;
        break;
      }
      if (FURNITURE.some((re) => re.test(flat.trim()))) continue;
      lineParts.push(classifyLine(line));
    }
  }

  return assembleSections(lineParts);
}
