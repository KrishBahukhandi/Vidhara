/**
 * Inline-heading act parser for the OLD codes (IPC 1860, CrPC 1973, Evidence
 * Act 1872). These pre-date the marginal-note column format: the section title
 * is a run-in heading —  `302. Punishment for murder.—Whoever commits murder…`
 * — so the note lives between the number and the em-dash, not in a margin.
 *
 * Consumes `pdftotext -bbox` XHTML (word coordinates + height). Design facts
 * verified on the India Code IPC/IEA PDFs:
 * - Amendment FOOTNOTES ("1. Subs. by Act 4 of 1898…") and superscript
 *   reference markers are set in SMALLER type (~8pt vs ~10pt body) at page
 *   bottoms; dropping sub-body-height words removes both cleanly.
 * - The table of contents ("ARRANGEMENT OF SECTIONS") repeats every section
 *   number; real text begins after the "…enacted as follows" formula.
 * - Section numbers still increase monotonically, so the strictly-increasing
 *   guard rejects any footnote number that survives.
 */
import type { GazetteParseResult, ParsedChapter, ParsedSection } from "./gazette-common";
import { END_SENTINELS, FURNITURE } from "./gazette-common";
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
/** Body type is 9–10pt; footnotes/superscript markers ~8.2pt. Threshold sits
 * between so borderline body pages (≈9.0pt) survive while footnotes drop. */
const MIN_BODY_HEIGHT = 8.6;
const LINE_Y_TOLERANCE = 4;
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

export function parseInlineAct(xhtml: string): GazetteParseResult {
  const diagnostics: string[] = [];
  const sections: ParsedSection[] = [];
  const chapters: ParsedChapter[] = [];

  let started = false;
  let ended = false;
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
    const title = pendingChapterTitle.join(" ").replace(/\s+/g, " ").trim();
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
    const words: Word[] = [];
    for (const m of pageXml.matchAll(WORD_TAG)) {
      const yMin = Number(m[2]);
      const yMax = Number(m[4]);
      if (yMax - yMin < MIN_BODY_HEIGHT) continue; // drop footnotes + superscripts
      words.push({ xMin: Number(m[1]), yMin, baseline: yMax, height: yMax - yMin, text: decodeEntities(m[5] ?? "") });
    }

    for (const line of groupIntoLines(words)) {
      const flat = line.map((w) => w.text).join(" ").replace(/\s+/g, " ").trim();
      if (!flat) continue;
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
  return { sections, chapters, diagnostics };
}
