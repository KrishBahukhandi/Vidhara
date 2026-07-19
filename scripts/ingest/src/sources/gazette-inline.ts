/**
 * Inline-heading act parser for the OLD codes (IPC 1860, CrPC 1973, Evidence
 * Act 1872). These pre-date the marginal-note column format: the section title
 * is a run-in heading —  `302. Punishment for murder.—Whoever commits murder…`
 * — so the note lives between the number and the em-dash, not in a margin.
 *
 * Consumes `pdftotext -bbox` XHTML (word coordinates + height). Design facts
 * verified on the India Code IPC/ICA/CrPC PDFs:
 * - Amendment FOOTNOTES ("1. Subs. by Act 4 of 1898…") sit at page bottoms in
 *   ~8.2pt type; superscript reference markers are ~6.3pt; body is ~10pt.
 * - ILLUSTRATIONS are set in the SAME ~8.1–8.2pt type as footnotes, but
 *   inline: they follow an "Illustration(s)" heading line and end at the next
 *   body-height line. Height alone cannot separate the two — position and
 *   shape can. Small text is therefore kept only inside an illustration block
 *   (heading seen, no body line yet), and a page-scoped latch drops
 *   footnote-shaped small lines ("1. Subs. by Act …") plus everything small
 *   after them on that page. Blocks span page breaks (IPC §108, ICA §74,
 *   CrPC §300 wrap pages), so the mode survives page boundaries; bare
 *   page-number lines are neutral. IEA sets illustrations at body height and
 *   is unaffected either way.
 * - The table of contents ("ARRANGEMENT OF SECTIONS") repeats every section
 *   number; real text begins after the "…enacted as follows" formula.
 * - Section numbers still increase monotonically, so the strictly-increasing
 *   guard rejects any footnote number that survives.
 */
import type { GazetteParseResult, ParsedChapter, ParsedSection } from "./gazette-common";
import { END_SENTINELS, FURNITURE, normalizeChapterTitle } from "./gazette-common";
import { deriveSortKey } from "../sort-key";

interface Word {
  xMin: number;
  yMin: number;
  baseline: number;
  height: number;
  text: string;
}

const WORD_TAG =
  /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;
/** Body type is 9–10pt; footnotes/illustrations ~8.2pt. Threshold sits
 * between so borderline body pages (≈9.0pt) survive while small type routes
 * through the illustration/footnote logic below. */
const MIN_BODY_HEIGHT = 8.6;
/** Superscript reference markers are ~6.3pt — below every real text tier.
 * Words under this height are dropped unconditionally. */
const MIN_WORD_HEIGHT = 7;
const LINE_Y_TOLERANCE = 4;
/** Footnote first lines: "1. Subs. by Act 22 of 2018, s. 7, …". Verified
 * against all 182 footnote blocks in the IPC/ICA/CrPC PDFs, including the 11
 * that directly follow an illustration block with no body line between. */
const FOOTNOTE_START =
  /^\d{1,2}\s*\.\s+.*(Subs\.|Ins\.|[Oo]mitted|Rep\.|[Aa]dded|by Act|by s\.|by A\.?\s?O\.|w\.e\.f\.|Vide |Cl\.|Sch\.)/;
/** "Illustrations" / "Illustration" as the whole line, tolerating the PDF's
 * glyph confusions ("IIIustrations") and one stray ≤2-char artifact token
 * ("Illustrations z"). Normalizes a leading l/1 run to i before matching. */
const ILLUSTRATION_WORD = /^i+l*ustrations?$/;
function isIllustrationHeading(text: string): boolean {
  const tokens = text.split(" ");
  if (tokens.length === 0 || tokens.length > 2) return false;
  const head = (tokens[0] ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/^[l1]+/, (m) => "i".repeat(m.length));
  if (!ILLUSTRATION_WORD.test(head)) return false;
  return tokens.length === 1 || (tokens[1] ?? "").replace(/[^A-Za-z0-9]/g, "").length <= 2;
}
// "It is enacted as follows:—" (IPC) / "BE it enacted by Parliament in the
// twenty-fourth Year…" (CrPC) / "…ADOPT, ENACT AND GIVE TO OURSELVES THIS
// CONSTITUTION" (COI preamble). A SECOND occurrence mid-document marks an
// appended amendment act — parsing stops there.
const ENACTED = /enacted\s+(?:as\s+follows|by\s+Parliament)|ENACT\s+AND\s+GIVE\s+TO\s+OURSELVES/i;
/** Schedules follow the last article of the Constitution — parsing ends. */
const SCHEDULE_START =
  /^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH)\s+SCHEDULE/;
// Constitution uses PART headings; other acts CHAPTER. Both fold to chapters.
const CHAPTER_HEADING = /^(?:CHAPTER|PART)\s*([IVXLCDM]+)([A-Z])?$/;
const ALL_CAPS_LINE = /^[A-Z][A-Z0-9\s,.'()—–-]*$/;
// Section start: "302. <rest…>" — the run-in title may wrap onto later lines,
// so the title/body split happens after the whole section is accumulated.
// \s* not \s+: some PDFs drop the space after the number ("16.“Undue…").
// \s?\. : the PDF sometimes splits "174A ." with a space before the period.
const SECTION_START = /^(\d{1,3}[A-Z]{0,2})\s?\.\s*(\S.*)$/;
// Amendment brackets can eat the number's period ("1[17 “Government”.—…" →
// "17 “Government”.—…"). Only a quote-led title is accepted dotless.
const SECTION_START_NODOT = /^(\d{1,3}[A-Z]{0,2})\s+([“"].*)$/;
// Title ends at the first ".—"/".–" (em/en dash). Non-greedy, length-capped so
// a stray mid-body dash can't swallow a paragraph as the "title".
const TITLE_SPLIT = /^(.{3,160}?)\.\s*[—–]\s*([\s\S]*)$/;
// Fallback for run-in titles with no dash (mostly repealed sections:
// "Definition of “Queen”. Omitted by the A. O. 1950."): split at the first
// sentence period.
const TITLE_PERIOD_SPLIT = /^(.{3,120}?)\.\s+([\s\S]*)$/;
/** Amendment/footnote glyphs that can precede a section number at line start —
 * brackets/stars, and a body-height footnote digit directly before an opening
 * bracket ("4 [174A. Non-appearance…"). */
const LEADING_MARKERS = /^(?:\d{1,2}\s*\[|[[\]*\s])+/;

function decodeEntities(s: string): string {
  return s
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function groupIntoLines(words: Word[]): Word[][] {
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

export interface InlineParseOptions {
  /** Keep small-font illustration text (the default). `false` replicates the
   * legacy behavior that dropped illustrations along with footnotes — used by
   * the regression parity check when re-ingesting an already-published act. */
  keepIllustrations?: boolean;
}

export function parseInlineAct(
  xhtml: string,
  options: InlineParseOptions = {},
): GazetteParseResult {
  const keepIllustrations = options.keepIllustrations ?? true;
  const diagnostics: string[] = [];
  const sections: ParsedSection[] = [];
  const chapters: ParsedChapter[] = [];

  let started = false;
  let ended = false;
  /** Inside an illustration block: heading seen, no body-height line since.
   * Survives page breaks — blocks wrap pages (IPC §108, CrPC §300). */
  let illustrationMode = false;
  let illustrationLines = 0;
  let currentChapter: string | undefined;
  let pendingChapterNumber: string | null = null;
  let pendingChapterTitle: string[] = [];

  let currentNumber: string | null = null;
  let currentChapterForSection: string | undefined;
  let rawParts: string[] = [];
  let lastBase = 0;
  /** Sort key (base + letter fraction) — "120A" must sort after "120". */
  let lastKey = 0;

  const flush = () => {
    if (currentNumber === null) return;
    const raw = rawParts.join(" ").replace(/\s+/g, " ").trim();
    const split = TITLE_SPLIT.exec(raw) ?? TITLE_PERIOD_SPLIT.exec(raw);
    // Strip stray amendment brackets from an extracted title.
    let marginalNote = split ? (split[1] ?? "").replace(/[[\]]/g, "").trim() : "";
    const bodyMd = split ? (split[2] ?? "").trim() : raw;
    // Never-empty guarantee (heavily-amended/repealed old sections): fall back
    // to the leading text of the body, then to the bare section label.
    if (!marginalNote) {
      marginalNote =
        raw.replace(/[[\]]/g, "").slice(0, 80).replace(/\s+\S*$/, "").trim() ||
        `Section ${currentNumber}`;
    }
    sections.push({ number: currentNumber, chapterNumber: currentChapterForSection, marginalNote, bodyMd });
    currentNumber = null;
    rawParts = [];
  };
  const flushChapter = () => {
    if (pendingChapterNumber === null) return;
    const title = normalizeChapterTitle(pendingChapterTitle.join(" "));
    chapters.push({
      number: pendingChapterNumber,
      title: title || `Chapter ${pendingChapterNumber}`,
      sortOrder: chapters.length + 1,
    });
    currentChapter = pendingChapterNumber;
    pendingChapterNumber = null;
    pendingChapterTitle = [];
  };

  for (const pageXml of xhtml.split(/<page /).slice(1)) {
    if (ended) break;
    /** Footnotes claim the rest of the page's small text once they start. */
    let footnotesStarted = false;
    const words: Word[] = [];
    for (const m of pageXml.matchAll(WORD_TAG)) {
      const yMin = Number(m[2]);
      const yMax = Number(m[4]);
      if (yMax - yMin < MIN_WORD_HEIGHT) continue; // drop superscript markers
      words.push({ xMin: Number(m[1]), yMin, baseline: yMax, height: yMax - yMin, text: decodeEntities(m[5] ?? "") });
    }

    for (const line of groupIntoLines(words)) {
      // Legacy view: body-height words only — everything below routes through
      // the illustration/footnote branch and NEVER reaches the pipeline.
      const flat = line
        .filter((w) => w.height >= MIN_BODY_HEIGHT)
        .map((w) => w.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const isSmallLine = !flat;
      if (isSmallLine) {
        const full = line.map((w) => w.text).join(" ").replace(/\s+/g, " ").trim();
        if (!full || !started) continue;
        // A small-type "Illustrations" heading opens a block too (ICA prints
        // one at 7.2pt); body-height headings are handled below.
        if (isIllustrationHeading(full)) {
          illustrationMode = true;
          if (keepIllustrations && currentNumber !== null) rawParts.push(full);
          continue;
        }
        if (footnotesStarted) continue;
        if (FOOTNOTE_START.test(full)) {
          footnotesStarted = true; // block mode survives for the next page
          continue;
        }
        // Letterless small lines are markers, never prose: superscript
        // footnote references rendered ≥7pt (ICA §74's "1" above the
        // amendment bracket, 7.2pt), stray bracket digits, asterisk rows.
        if (!/[A-Za-z]/.test(full)) continue;
        if (illustrationMode && keepIllustrations && currentNumber !== null) {
          rawParts.push(full);
          illustrationLines++;
        }
        continue;
      }
      if (!started) {
        if (ENACTED.test(flat)) started = true;
        continue;
      }
      if (ENACTED.test(flat)) {
        diagnostics.push(`stopped at appended amendment act: "${flat.slice(0, 60)}"`);
        ended = true;
        break;
      }
      if (SCHEDULE_START.test(flat)) {
        diagnostics.push(`stopped at schedules: "${flat.slice(0, 40)}"`);
        ended = true;
        break;
      }
      if (END_SENTINELS.some((re) => re.test(flat))) {
        ended = true;
        break;
      }
      if (FURNITURE.some((re) => re.test(flat))) continue;

      // Any body-height content line closes an illustration block; the
      // heading (re)opens one. Furniture above stays neutral so a block can
      // continue past a page-number line onto the next page.
      illustrationMode = isIllustrationHeading(flat);

      const chapterMatch = CHAPTER_HEADING.exec(flat);
      if (chapterMatch) {
        flush();
        flushChapter();
        pendingChapterNumber = `${chapterMatch[1]}${chapterMatch[2] ?? ""}`;
        continue;
      }
      // Section heading, ignoring any leading amendment bracket/marker.
      const headline = flat.replace(LEADING_MARKERS, "");
      if (pendingChapterNumber !== null && ALL_CAPS_LINE.test(flat) && !SECTION_START.test(headline)) {
        pendingChapterTitle.push(flat);
        continue;
      }
      flushChapter();

      const match = SECTION_START.exec(headline) ?? SECTION_START_NODOT.exec(headline);
      if (match?.[1]) {
        const base = parseInt(match[1], 10);
        const key = deriveSortKey(match[1]);
        // Run-in headings always continue with a Title ("16. Equality of…",
        // "[31. Compulsory…", "31. “…”"). A number at line start followed by
        // lowercase (or nothing) is a WRAPPED cross-reference ("…of article\n
        // 30. shall…") — never a section start.
        const titleShaped = /^[A-Z“"[(]/.test(match[2] ?? "");
        // Sort-KEY strictly increases (so "120A" follows "120", "498A"
        // follows "498"); the BASE may only step forward a little.
        const plausible = titleShaped && key > lastKey && base - lastBase <= 20;
        if (plausible) {
          flush();
          lastBase = base;
          lastKey = key;
          currentNumber = match[1];
          currentChapterForSection = currentChapter;
          rawParts = [match[2] ?? ""];
          continue;
        }
        if (key <= lastKey) diagnostics.push(`skipped non-increasing "${match[1]}." (footnote/list) near §${lastBase}`);
      }

      if (currentNumber !== null) rawParts.push(flat);
    }
  }

  flush();
  flushChapter();
  if (keepIllustrations && illustrationLines > 0) {
    diagnostics.push(`kept ${illustrationLines} illustration line(s)`);
  }
  return { sections, chapters, diagnostics };
}
