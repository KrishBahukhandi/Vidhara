/**
 * Shared assembly for Gazette-of-India act parsing: a stream of classified
 * lines (margin / body / citation fragments) is folded into chapters and
 * sections. Frontends: gazette-pdf.ts (pdftotext -layout, legacy) and
 * gazette-bbox.ts (pdftotext -bbox word coordinates, canonical).
 */

export interface ParsedSection {
  number: string;
  chapterNumber?: string;
  marginalNote: string;
  bodyMd: string;
}

export interface ParsedChapter {
  number: string;
  title: string;
  sortOrder: number;
}

export interface GazetteParseResult {
  sections: ParsedSection[];
  chapters: ParsedChapter[];
  diagnostics: string[];
}

export interface LineParts {
  /** Marginal-note fragment (left or right column), if any. */
  margin?: string;
  /** Body-column text, if any. */
  body?: string;
  /** Right-column statutory citation, if any. */
  citation?: string;
  /** Right-aligned signature fragment (document tail), if any. */
  signature?: string;
}

export const CITATION = /^\d{1,3}\s+of\s+\d{4}\.?$/;
/** Right-aligned signatory names ("DIWAKAR SINGH,") — never marginal notes. */
export const SIGNATURE_FRAGMENT = /^[A-Z][A-Z\s.]{3,},$/;
// \s* not \s+: the gazette text layer sometimes drops the space after the
// section number ("192.Whoever malignantly…").
// Trailing text is optional: when a section's marginal note is long, the
// gazette can print the bare number ("262.") on its own line with the body
// starting below. The plausibility guard (strictly increasing) rejects stray
// bare numbers from lists.
const SECTION_START = /^(\d{1,3}[A-Z]{0,2})\.\s*(.*)$/;
// \s* not \s+: tight kerning in the PDF text layer yields "CHAPTERI".
const CHAPTER_HEADING = /^CHAPTER\s*([IVXLCDM]+)$/;
const ALL_CAPS_LINE = /^[A-Z][A-Z\s,.'()—–-]*$/;
const NEW_PARAGRAPH =
  /^(\(\d+[A-Za-z]?\)|\([a-z]{1,4}\)|\([ivxlc]{1,6}\)|Explanation|Illustrations?\b|Exception|Provided\b|Note\.)/;

export const FURNITURE = [
  // Case-SENSITIVE: the masthead is all-caps; body text routinely says
  // "notification in the Gazette of India" (an /i here ate IEA §113 whole).
  /THE GAZETTE OF INDIA/,
  /^\s*EXTRAORDINARY\s*$/i,
  /^\s*\[?PART\s+II\b/i,
  /^\s*SEC\.?\s*\d+\]/i,
  /^[\s_]+$/,
  /^\s*\d+\s*$/, // bare page numbers
  /REGISTERED NO\./i,
  /^\s*No\.\s*\d+\]\s/,
  /NEW DELHI,/,
];

/** "B E it enacted…": the ornamental drop-cap splits into separate words. */
export const ENACTMENT = /B\s?E\s+it\s+enacted\s+by\s+Parliament/i;

export const END_SENTINELS = [
  /Legislative Counsel/i,
  /Secretary to the Govt/i,
  /UPLOADED BY THE MANAGER/i,
  /MGIPMRND/,
  /Digitally signed/i,
];

export function classifyRightFragment(fragment: string, parts: LineParts): void {
  if (CITATION.test(fragment)) parts.citation = fragment;
  else if (SIGNATURE_FRAGMENT.test(fragment)) parts.signature = fragment;
  else parts.margin = parts.margin ? `${parts.margin} ${fragment}` : fragment;
}

function normalizeNote(fragments: string[]): string {
  return fragments
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\s*\.\s*$/, "")
    .trim();
}

function finishBody(paragraphs: string[][]): string {
  return paragraphs
    .filter((p) => p.length > 0)
    .map((p) => p.join(" ").replace(/\s+/g, " ").trim())
    .join("\n\n");
}

/**
 * Folds a stream of classified lines into sections/chapters. The stream must
 * already be limited to document content (frontends handle the enactment
 * formula start and signature-block end), but sentinel/furniture text that
 * slips through is tolerated via the same regexes.
 */
export function assembleSections(lines: Iterable<LineParts>): GazetteParseResult {
  const diagnostics: string[] = [];
  const chapters: ParsedChapter[] = [];
  const sections: ParsedSection[] = [];

  let currentChapter: string | undefined;
  let pendingChapterNumber: string | null = null;
  let pendingChapterTitle: string[] = [];

  let currentNumber: string | null = null;
  let noteFragments: string[] = [];
  /** Margin fragments seen between sections — belong to the NEXT section. */
  let pendingNoteFragments: string[] = [];
  let paragraphs: string[][] = [];
  let lastBaseNumber = 0;
  /**
   * Body lines since the current section's last note fragment. A note is
   * vertically contiguous with its section's opening lines; a margin fragment
   * arriving after ≥2 note-less body lines belongs to the NEXT section
   * (gazette prints it just above that section's start — e.g. "Stalking.").
   */
  let bodyLinesSinceNote = 0;
  /**
   * Marginal notes end with a period. Once sealed, further margin fragments
   * belong to the NEXT section — a long previous note can physically overflow
   * past a short section's start rows, and the next note can begin printing
   * before its own section start line.
   */
  let noteSealed = false;

  const flushSection = () => {
    if (currentNumber === null) return;
    sections.push({
      number: currentNumber,
      chapterNumber: currentChapter,
      marginalNote: normalizeNote(noteFragments),
      bodyMd: finishBody(paragraphs),
    });
    currentNumber = null;
    noteFragments = [];
    paragraphs = [];
  };

  const flushChapter = () => {
    if (pendingChapterNumber === null) return;
    chapters.push({
      number: pendingChapterNumber,
      title: pendingChapterTitle.join(" ").replace(/\s+/g, " ").trim(),
      sortOrder: chapters.length + 1,
    });
    currentChapter = pendingChapterNumber;
    pendingChapterNumber = null;
    pendingChapterTitle = [];
  };

  for (const { margin, body, citation, signature } of lines) {
    if (citation) diagnostics.push(`citation near §${currentNumber ?? "?"}: ${citation}`);
    if (signature) diagnostics.push(`signature fragment dropped: ${signature}`);

    // Decide the body line's meaning FIRST: a margin fragment sharing a line
    // with a section start belongs to the NEW section, not the previous one.
    const chapterMatch = body === undefined ? null : CHAPTER_HEADING.exec(body);
    let sectionMatch = body === undefined ? null : SECTION_START.exec(body);
    if (sectionMatch && sectionMatch[1] && sectionMatch[2] !== undefined) {
      const base = parseInt(sectionMatch[1], 10);
      // Section numbers strictly increase. A start must advance the counter;
      // a small forward jump is fine (tolerates a missed start), but a repeat
      // or backward number is body text (numbered lists, "(1)"-style clauses,
      // sub-item "1." inside a section). Cap the jump so a stray large number
      // ("45 of 1860", schedule rows) can't hijack the sequence.
      const plausible =
        lastBaseNumber === 0 || (base > lastBaseNumber && base - lastBaseNumber <= 20);
      if (!plausible) {
        diagnostics.push(
          `implausible section start "${sectionMatch[1]}." after §${lastBaseNumber} — treated as body`,
        );
        sectionMatch = null;
      }
    }
    const startsSection = Boolean(sectionMatch && !chapterMatch);

    if (margin) {
      const inDocument =
        lastBaseNumber > 0 || chapters.length > 0 || pendingChapterNumber !== null;
      if (startsSection || currentNumber === null) {
        if (startsSection || inDocument) pendingNoteFragments.push(margin);
        // else: preamble noise before the first chapter/section — dropped.
      } else if (bodyLinesSinceNote >= 2 || noteSealed) {
        pendingNoteFragments.push(margin); // next section's note
      } else {
        noteFragments.push(margin);
        bodyLinesSinceNote = 0;
        if (/\.$/.test(margin) && !/\betc\.$/.test(margin)) noteSealed = true;
      }
    }

    if (body === undefined) continue;
    if (!margin && currentNumber !== null && !startsSection) bodyLinesSinceNote += 1;

    if (chapterMatch?.[1]) {
      flushSection();
      flushChapter();
      pendingChapterNumber = chapterMatch[1];
      continue;
    }
    if (pendingChapterNumber !== null && ALL_CAPS_LINE.test(body) && !SECTION_START.test(body)) {
      pendingChapterTitle.push(body);
      continue;
    }
    flushChapter();

    if (startsSection && sectionMatch?.[1] && sectionMatch[2] !== undefined) {
      flushSection();
      currentNumber = sectionMatch[1];
      lastBaseNumber = parseInt(sectionMatch[1], 10);
      noteFragments = pendingNoteFragments;
      pendingNoteFragments = [];
      // Bare-number start ("262." alone) → empty opening paragraph; the body
      // text on following lines fills it.
      paragraphs = sectionMatch[2].trim() ? [[sectionMatch[2].trim()]] : [[]];
      bodyLinesSinceNote = 0;
      noteSealed =
        noteFragments.length > 0 && /\.$/.test(noteFragments[noteFragments.length - 1]!);
      continue;
    }

    if (currentNumber === null) continue; // preamble between enactment and §1

    const lastParagraph = paragraphs[paragraphs.length - 1];
    if (NEW_PARAGRAPH.test(body) || !lastParagraph) {
      paragraphs.push([body]);
    } else {
      lastParagraph.push(body);
    }
  }

  flushSection();
  flushChapter();

  // Defensive: strip a trailing right-aligned signatory name that slipped
  // into the last section's body (layout variants).
  const last = sections[sections.length - 1];
  if (last) {
    last.bodyMd = last.bodyMd.replace(/\n\n[A-Z][A-Z\s.]+,$/m, "").trim();
  }

  return { sections, chapters, diagnostics };
}
