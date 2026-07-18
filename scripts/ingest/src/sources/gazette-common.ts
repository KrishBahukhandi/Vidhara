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

/** One or more statutory citations — the PDF can pad a space before the
 * period ("32 of 2012 .") or stack two on one line ("20 of 1958. 2 of 2016."). */
export const CITATION = /^(?:\d{1,3}\s+of\s+\d{4}\s*\.?\s*)+$/;
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

/**
 * Chapter titles are set in SMALL CAPS with an enlarged first letter on every
 * source-capitalized word; pdftotext emits that letter as its own token
 * ("A RREST OF PERSONS", "T RIAL BEFORE A C OURT OF S ESSION"). Lowercase
 * source words ("before", "a", "of") render intact — so a genuine article "A"
 * is followed by another SOLITARY capital (the next word's drop cap), never
 * by a full word, which makes the text-only repair unambiguous on this corpus:
 *   pass 1: adjacent solitary "O" + "F" → "OF" (the one drop-capped 2-letter word)
 *   pass 2: solitary capital + following ≥2-char capital token → join
 * Then tidy PDF spacing around punctuation. Known theoretical edge (a
 * capitalized 1-letter word followed by an intact lowercase-source word, e.g.
 * "A NEW TRIAL") does not occur in the ingested corpus — audit new acts'
 * chapter diffs on ingest.
 */
export function normalizeChapterTitle(raw: string): string {
  const tokens = raw.replace(/\s+/g, " ").trim().split(" ");

  const afterOf: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === "O" && tokens[i + 1] === "F") {
      afterOf.push("OF");
      i++;
    } else {
      afterOf.push(tokens[i]!);
    }
  }

  const joined: string[] = [];
  for (let i = 0; i < afterOf.length; i++) {
    const cur = afterOf[i]!;
    const next = afterOf[i + 1];
    if (/^[A-Z]$/.test(cur) && next && /^[A-Z]{2,}[A-Z'’-]*$/.test(next)) {
      joined.push(cur + next);
      i++;
    } else {
      joined.push(cur);
    }
  }

  return joined
    .join(" ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s+-\s+/g, "-");
}

/** Schedules/forms follow the last section ("THE SCHEDULE [See section…]",
 * "THE FIRST SCHEDULE") — statute text ends there. Case-sensitive: body
 * sentences say "the Schedule". */
export const SCHEDULE_HEADING =
  /^THE\s+(?:FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH)?\s*SCHEDULE\b/;

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
      title: normalizeChapterTitle(pendingChapterTitle.join(" ")),
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
      // Section flush is DEFERRED to the next section start: the running
      // section's note tail can wrap below this chapter heading (BNSS §391's
      // "themselves." prints under "CHAPTER XXIX").
      flushChapter();
      pendingChapterNumber = chapterMatch[1];
      continue;
    }
    if (pendingChapterNumber !== null && ALL_CAPS_LINE.test(body) && !SECTION_START.test(body)) {
      pendingChapterTitle.push(body);
      continue;
    }

    if (startsSection && sectionMatch?.[1] && sectionMatch[2] !== undefined) {
      // A long note can wrap BELOW the next section's start rows, so its tail
      // fragments were queued for the next section. A RAGGED note at section
      // start (its last fragment has no trailing period at all — "…when
      // committed before") is missing its tail: peel the queue's head through
      // the first period-ended fragment back to it. Any period-terminated
      // note (including "…, etc.") keeps the queue intact — a period-ended
      // head is then the next note printed early ("Stalking." above §78).
      const lastFragment = noteFragments[noteFragments.length - 1];
      if (currentNumber !== null && lastFragment && !/\.$/.test(lastFragment)) {
        const seal = pendingNoteFragments.findIndex((f) => /\.$/.test(f));
        if (seal >= 0) {
          noteFragments.push(...pendingNoteFragments.splice(0, seal + 1));
        }
      }
      // Flush BEFORE the pending chapter so the finishing section keeps the
      // chapter it was printed under.
      flushSection();
      flushChapter();
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
    // Between a chapter heading and the next section start, body-column text
    // is chapter-title material in ANY case ("Of abetment", "A.—Summons") —
    // never the running section's body. Margins above still flow to it.
    if (pendingChapterNumber !== null) continue;

    const lastParagraph = paragraphs[paragraphs.length - 1];
    if (NEW_PARAGRAPH.test(body) || !lastParagraph) {
      paragraphs.push([body]);
    } else {
      lastParagraph.push(body);
    }
  }

  flushSection();
  flushChapter();

  // Defensive: strip a trailing signatory block that slipped into the last
  // section's body — a rule line + all-caps name ("————— DIWAKAR SINGH,"),
  // with or without its own paragraph break.
  const last = sections[sections.length - 1];
  if (last) {
    last.bodyMd = last.bodyMd
      .replace(/\n\n[A-Z][A-Z\s.]+,$/m, "")
      .replace(/[\s\n]*[—–_]{2,}[\s\n]*[A-Z][A-Z\s.]+,?\s*$/, "")
      .trim();
  }

  return { sections, chapters, diagnostics };
}
