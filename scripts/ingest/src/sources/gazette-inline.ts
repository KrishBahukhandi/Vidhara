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
import type {
  GazetteParseResult,
  ParsedChapter,
  ParsedSection,
  ParsedStateAmendment,
} from "./gazette-common";
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
/**
 * Schedules follow the last section — parsing ends. Ordinal form ("THE FIRST
 * SCHEDULE") and the unnumbered form ("THE SCHEDULE") both count: NDPS prints
 * only "THE SCHEDULE", and because that wasn't matched its entries — a numbered
 * list of psychotropic substances — were read as sections 84…110ZN (D-031).
 * Upper-case and anchored on purpose: body prose says "the Schedule" in mixed
 * case ("specified in the Schedule") and must not end the parse.
 *
 * What follows the word is what separates a heading from a quotation of one.
 * A heading either ends the line ("THE FIRST SCHEDULE") or continues into its
 * own title after a dash ("SCHEDULE.—[Enactments repealed].—Rep. by …", the
 * NI Act's repealed schedule). The Constitution instead footnotes an amendment
 * as `…for the heading ―THE STATES IN PART C OF THE FIRST` / `SCHEDULE‖
 * (w.e.f. 1-11-1956).` — that continuation line's lowercase tail sits below
 * body height and is filtered away, leaving exactly `SCHEDULE‖`, which a bare
 * prefix match read as the schedules beginning: it truncated the parse at
 * art. 239 and lost 223 articles. The ‖ is a closing quote mark, so requiring
 * end-of-line or a dash excludes it.
 */
const SCHEDULE_START =
  /^(?:THE\s+)?(?:(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH)\s+)?SCHEDULES?(?:\s+[IVXLC]+)?\s*(?:$|\.\s*$|\.?\s*[—–])/;
/**
 * India Code prints State amendments inline, after the central section they
 * modify: a "STATE AMENDMENT" banner, the amending text (often quoting whole
 * inserted sections), then a "[Vide <State> Act …]" citation. Everything in
 * between is law in ONE State only.
 *
 * Left unguarded this produced two defects (D-032, and ~95 already-published
 * sections): the amending text was appended to the central section's body, and
 * quoted insertions (ARB §8B) became phantom central sections. So the block is
 * SKIPPED — not stopped at, since the central Act resumes afterwards.
 *
 * A BANNER OPENS A REGION, NOT A BLOCK. This is the correction D-051 got half
 * right. One banner routinely covers many States in turn, each closing with its
 * own "[Vide …]" citation: the Registration Act runs 41 banners over 154 such
 * citations. Treating the citation as the terminator therefore dropped out of
 * the region into the NEXT State's amendment and read it as central law — which
 * is how nine provisions of Karnataka and Uttar Pradesh law came within one step
 * of being published as national law.
 *
 * D-051 patched that with a closed list of State names, on the theory that the
 * next block always announces itself with one. It usually does, and the patch
 * still missed six of the nine, for three separate reasons: a page number
 * between the citation and the name (the region resumes across a page break
 * eight times here), the print's own typos ("Uttarkhand"), and blocks that carry
 * no name at all and open straight into "Insertion of new section 80A.—After
 * section 80 of the Registration Act, 1908 (Central Act 16 of 1908)…".
 *
 * The region model needs none of that: nothing inside a banner is central law
 * until the central Act demonstrably resumes, so the parser stops trying to
 * recognise where one State ends and the next begins. The list of State names is
 * gone with it — a list that has to be complete and correctly spelled to keep
 * State law out of a national act was the wrong thing to depend on.
 */
const STATE_AMENDMENT_START = /^STATE\s+AMEN[DE]+MENTS?\b/;
/**
 * The amending instruction that introduces a State's change — "Amendment of
 * section 34 of XVI of 1908.—In the principal Act, in section 34,--",
 * "Insertion of proviso to section 53.—…", "Insertion of new section 80A.—After
 * section 80 of the Registration Act, 1908 (Central Act 16 of 1908)…".
 *
 * This opens a region in its own right, because the banner cannot be relied on
 * to be there: the Registration Act prints Uttarakhand's amendment of section 53
 * under nothing but the word "Uttarakhand", and section 53 accordingly went out
 * with a proviso of Uttarakhand law inside it. The instruction is the one part
 * of the block that is always present — it is what an amendment *is*.
 *
 * It is also the shape furthest from anything a principal Act says: sections
 * carry their number at line start, so a numberless line opening "Amendment of
 * section …" is amending apparatus. Verified against every act on disk — the
 * 200 instruction lines in ARB, CPC, HMA, LIM, MV, REG and TP are all State
 * amendments, and no section text changed anywhere when this began matching.
 */
const AMENDING_INSTRUCTION =
  /^(?:Amendment|Insertion|Substitution|Omission|Addition|Deletion|Renumbering|Repeal(?:ed)?)\s+(?:of|for|to|at)\s+(?:new\s+|the\s+)*(?:section|sub-section|clause|proviso|Part|Chapter|Schedule|Explanation|heading)\b/i;
/**
 * A one-line fragment left above a BANNERLESS block — the bare State name that
 * stands in for the banner. Dropped from the section being closed rather than
 * matched against a list of States: a list has to be complete AND correctly
 * spelled to keep State law out of a national act, and this print spells
 * Uttarakhand three different ways.
 *
 * Ending punctuation disqualifies it, because a sentence is not an orphan. The
 * first version of this rule allowed a trailing period and truncated section 78
 * of the Registration Act at "…necessary to effect the purposes of this / Act."
 * — the last line of its real text. Trimming published text to tidy up an
 * unrelated defect is worse than the defect, so this pattern errs toward
 * leaving the fragment in.
 */
const ORPHAN_FRAGMENT = /^[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,2}$/;
/**
 * The citation closing ONE State's amendment — "[Vide Kerala Act 21 of 1998,
 * s. 2]". Note what it does NOT do: end the banner's region. See below.
 */
const STATE_AMENDMENT_CITATION = /^\[?\s*Vide\b/i;
/**
 * A citation is a bracketed unit and long ones wrap. The J&K/Ladakh adaptation
 * order runs to three printed lines — "[Vide the Jammu and Kashmir
 * Reorganization (Adaptation of Central Laws) Order, 2020, notification / No.
 * S.O. 1123(E) dated (18-3-2020) and Vide … / … dated (23-10-2020).]" — and
 * treating only its first line as the citation left ARB §29B and CPC §35A
 * looking like State insertions. The unit ends at the closing bracket.
 */
const CITATION_END = /\]/;
/** Give up rather than eat the Act if a citation's bracket never closes. */
const CITATION_MAX_LINES = 6;
/**
 * The State named by a citation. Everything from "Vide" up to the instrument
 * word is the jurisdiction: "[Vide Karnataka Act 28 of 1975, s. 2]" is
 * Karnataka, and "[Vide the Jammu and Kashmir Reorganization (Adaptation of
 * Central Laws) Order, 2020…]" is Jammu and Kashmir. A leading "the" is the
 * print's, not part of the name.
 */
const CITATION_STATE =
  /\bVide\s+(?:the\s+)?([A-Za-z][A-Za-z\s&]*?)\s+(?:Act|Order|Ordinance|Regulation|Reorganisation|Reorganization|Amendment|Notification|Adaptation)\b/i;
/**
 * The same, for citations that omit the instrument word altogether — the
 * Contract Act closes Uttar Pradesh's amendment of s.55 with "[Vide Uttar
 * Pradesh 57 of 1976, s. 26]". Without this the State could not be named, and a
 * block whose State cannot be named is dropped, so that amendment stayed
 * invisible after the section it belonged to had been cleaned of it — the worst
 * of both. Falls back to the run of words before the Act's number.
 */
const CITATION_STATE_NO_INSTRUMENT =
  /\bVide\s+(?:the\s+)?([A-Za-z][A-Za-z\s&]*?)\s+(?:\d{1,4}|[IVXLC]+)\s+of\s+\d{4}/i;
/** The section an instruction names: "Amendment of section 34 of XVI of 1908",
 * "Insertion of new section 80A.—After section 80…". The base is what the
 * amendment attaches to, since an inserted "80A" hangs off s.80. */
const INSTRUCTION_TARGET = /\bsections?\s+(\d{1,3})/i;
/**
 * The Registration Act's citations spell three States wrong ("Uttarkhand",
 * "Uttar Pardesh") or lower-case ("kerala"), and left alone those become extra
 * jurisdictions in a list of who has amended a section — which misleads in the
 * opposite direction from the silence this is fixing.
 *
 * A closed list is what D-052 removed from the guard, so it is worth being
 * clear why one is acceptable here: this one decides a LABEL. A name it misses
 * is displayed as the source spells it, and the citation is shown verbatim
 * regardless. The list the guard used decided whether State law entered a
 * national act, where a miss published the wrong law.
 */
const STATE_SPELLING: Record<string, string> = {
  uttarkhand: "Uttarakhand",
  uttaranchal: "Uttarakhand",
  "uttar pardesh": "Uttar Pradesh",
  bengal: "Bengal",
  orissa: "Orissa",
};
function canonicalState(raw: string): string {
  const key = raw.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    STATE_SPELLING[key] ??
    key.replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\bAnd\b/g, "and")
  );
}
// Constitution uses PART headings; other acts CHAPTER. Both fold to chapters.
const CHAPTER_HEADING = /^(CHAPTER|PART)\s*([IVXLCDM]+)([A-Z])?$/;
/**
 * The same heading with its TITLE run onto the same line, usually because an
 * amendment inserted the chapter and the bracket swallowed the line break:
 * "[CHAPTER VA [F ORFEITURE OF ILLEGALLY ACQUIRED PROPERTY]". The bare pattern
 * above is anchored, so it missed these and the whole heading was appended to
 * the previous section's body (D-033 — NDPS §7/§68, NI §137, MV §144).
 *
 * The title must be upper-case to match, which is what keeps body prose out:
 * "…as specified in Part II of the Schedule" is mixed case and never matches.
 * Drop-capped titles ("F ORFEITURE") are covered by allowing single letters.
 */
const CHAPTER_HEADING_INLINE =
  /^(CHAPTER|PART)\s*([IVXLCDM]+)([A-Z])?\s*[[—–-]?\s*([A-Z][A-Z\s,.'()—–-]{5,}?)\s*\]?(?:\s|$)/;
const ALL_CAPS_LINE = /^[A-Z][A-Z0-9\s,.'()—–-]*$/;
/**
 * A title line for the heading just seen. Looser than ALL_CAPS_LINE because a
 * title carries the print's amendment apparatus: the Constitution sets Part
 * VIII's as "[THE UNION TERRITORIES]", Part VI's as "THE STATES4***" and Part
 * XXII's across two lines around a "2[…]" insertion — all of which the strict
 * pattern rejected, leaving those Parts with the generic "Chapter VIII" name.
 * The test is therefore "no lowercase, and at least three letters", which
 * rejects the lone marker digits and asterisk rows printed between headings
 * while still accepting the NI Act's letter-spaced titles ("OF R E A S O N A
 * B L E T I M E"), which have no two adjacent capitals at all.
 */
const CHAPTER_TITLE_LINE = /^(?=[^a-z]*$)(?:[^A-Za-z]*[A-Z]){3}/;
/**
 * Not every act shouts its titles. The Arbitration Act sets its Part names in
 * caps ("ARBITRATION") but its Chapter names in sentence case ("General
 * provisions", "Composition of arbitral tribunal"), which the upper-case test
 * rejects — leaving every ARB chapter named "Chapter I". Those lines are
 * *centred*, and body text never is: sections start at the left margin (x≈72)
 * and continuation lines only reach x≈104, while a centred heading starts past
 * x≈200. So a mixed-case line may be a title when it is centred, which is a
 * property of the printed page rather than of the words.
 *
 * Only the FIRST line after the heading, though: cross-headings are centred
 * too and sit below the title, so an unrestricted rule appended them to it —
 * "EXECUTION General" for CPC Part II, "FUNDAMENTAL RIGHTS General" for
 * Constitution Part III. An upper-case title may still run to several lines,
 * since that path is unaffected.
 */
const CENTRED_HEADING_MIN_X = 150;
/** A title stops at the next structural heading. Without this, the Constitution's
 * "PART V" swallowed the "CHAPTER I.—THE EXECUTIVE" line below it. The line is
 * tested after small-caps repair, because the print sets it as "C HAPTER I.—T
 * HE E XECUTIVE" and the raw form matches nothing. */
const NEXT_HEADING = /^(?:CHAPTER|PART)\b/;
/** Amendment apparatus inside a title: bracket pairs, asterisk elisions and
 * superscript marker digits are printer's marks, not words in the title. */
const TITLE_APPARATUS = /[[\]*\d]+/g;
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
  // Inside a "STATE AMENDMENT" region: every line is skipped until the CENTRAL
  // Act resumes, so neither its text nor its quoted insertions enter the Act.
  let stateAmendmentMode = false;
  // Section base in force when the region opened. A region's quoted insertions
  // are lettered variants of it ("8A"/"8B" after s.8; 80A–80G after s.80), so
  // the Act is taken to resume at the first base GREATER than this. That single
  // test is what makes the region model safe: an insertion can add letters to
  // the base but never advances past it, so no amount of stacked State text can
  // look like the Act resuming.
  let stateAmendmentBase = 0;
  let stateAmendmentRegions = 0;
  let stateAmendmentBlocks = 0;
  /** True from a closed "[Vide …]" citation until the next line of substance. */
  let sinceCitation = false;
  /** Lines consumed so far by a citation whose bracket has not yet closed. */
  let citationLines = 0;
  /** The section a region hangs off, as printed ("80", "16A"). */
  let stateAmendmentAnchor = "";
  /** Lines of the State block currently being read, and its citation so far. */
  let blockLines: string[] = [];
  let citationParts: string[] = [];
  const stateAmendments: ParsedStateAmendment[] = [];

  /** Files the block just closed by a citation. A block with no citation is
   * dropped rather than guessed at: without one there is no authority to show,
   * and an amendment we cannot attribute to a State is worse than none. */
  const closeStateBlock = () => {
    const citation = citationParts.join(" ").replace(/\s+/g, " ").trim();
    const text = blockLines.join(" ").replace(/\s+/g, " ").trim();
    blockLines = [];
    citationParts = [];
    if (!citation || !text) return;
    const state = (CITATION_STATE.exec(citation) ?? CITATION_STATE_NO_INSTRUMENT.exec(citation))?.[1]
      ?.replace(/\s+/g, " ")
      .trim();
    if (!state) return;
    // Prefer the section the instruction names over the one the region follows:
    // a block is usually printed under its target, but not always.
    const named = INSTRUCTION_TARGET.exec(text.slice(0, 160))?.[1];
    stateAmendments.push({
      sectionNumber: named ?? stateAmendmentAnchor,
      state: canonicalState(state),
      citation,
      text,
    });
  };
  let stateAmendmentSkipped = 0;
  let currentChapter: string | undefined;
  /** The Part currently in force, so Chapters printed under it can name it. */
  let currentPart: { number: string; title: string } | undefined;
  /** Parent Part of `currentChapter`, when that is a nested Chapter. */
  let currentChapterPart: string | undefined;
  let pendingChapterNumber: string | null = null;
  let pendingChapterKind: "chapter" | "part" = "chapter";
  let pendingChapterTitle: string[] = [];

  let currentNumber: string | null = null;
  let currentChapterForSection: string | undefined;
  let currentPartForSection: string | undefined;
  let rawParts: string[] = [];
  let lastBase = 0;
  /** The last section number as printed ("16A"), for anchoring State blocks. */
  let lastNumber = "";
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
    sections.push({
      number: currentNumber,
      chapterNumber: currentChapterForSection,
      partNumber: currentPartForSection,
      marginalNote,
      bodyMd,
    });
    currentNumber = null;
    rawParts = [];
  };
  const flushChapter = () => {
    if (pendingChapterNumber === null) return;
    const title =
      normalizeChapterTitle(pendingChapterTitle.join(" ")) ||
      `${pendingChapterKind === "part" ? "Part" : "Chapter"} ${pendingChapterNumber}`;
    const isPart = pendingChapterKind === "part";
    chapters.push({
      number: pendingChapterNumber,
      title,
      sortOrder: chapters.length + 1,
      kind: pendingChapterKind,
      // A Chapter belongs to the Part it was printed under. ARB repeats
      // "CHAPTER I" inside both PART I and PART II, so the parent is what
      // tells the two apart.
      ...(isPart ? {} : currentPart ? { partNumber: currentPart.number, partTitle: currentPart.title } : {}),
    });
    if (isPart) {
      currentPart = { number: pendingChapterNumber, title };
    }
    currentChapter = pendingChapterNumber;
    // Only a nested Chapter needs its Part recorded on the section; a section
    // sitting directly under a Part is identified by the Part alone.
    currentChapterPart = isPart ? undefined : currentPart?.number;
    pendingChapterNumber = null;
    pendingChapterKind = "chapter";
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
      const bodyHeight = line
        .filter((w) => w.height >= MIN_BODY_HEIGHT)
        .map((w) => w.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const fullLine = line.map((w) => w.text).join(" ").replace(/\s+/g, " ").trim();
      // A chapter title is set in small caps with an enlarged first letter, so
      // the height filter alone truncated the Limitation Act's part titles to
      // "P", "CO", "A", "M" — and dropped its PART II heading's title outright.
      // Recovering the small type is only safe while a title is actually being
      // collected: applied to every all-caps line it also drags in the
      // letter-spaced cross-headings that sit between sections ("P R E S E N T
      // M E N T" above NI §60), which belong to no section's body.
      const flat =
        bodyHeight && pendingChapterNumber !== null && ALL_CAPS_LINE.test(fullLine)
          ? fullLine
          : bodyHeight;
      const isSmallLine = !flat;
      if (isSmallLine) {
        const full = fullLine;
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
      /**
       * Once the footnote block has begun on this page, everything below it is
       * footnote material — including the occasional line the typesetter left
       * at BODY height. The Transfer of Property Act prints footnote 7 at 10pt
       * among neighbours at 8.1pt; the small-type path never saw it, and
       * "7. Subs. by the Adaptation of Laws…" then read as a plausible section 7
       * (7 > the section 3 in force), which in turn made the REAL sections 4, 5
       * and 6 look non-increasing and dropped all three. The Sale of Goods Act
       * loses s.3 the same way.
       *
       * Note the asymmetry: a body-height line may be *skipped* by the latch but
       * may never *set* it. Setting it would let a genuine repealed section —
       * "32. [Repeal.]—Rep. by Repealing and Amending Act, 1974" — silently
       * swallow the rest of its page.
       */
      if (footnotesStarted) continue;

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

      // ── State amendments ────────────────────────────────────────────────
      // Opening the block closes the section in progress, so no amending text
      // reaches its body.
      const banner = !stateAmendmentMode && STATE_AMENDMENT_START.test(flat);
      if (banner || (!stateAmendmentMode && AMENDING_INSTRUCTION.test(flat))) {
        // A bannerless block is announced only by its instruction, and the line
        // above it is usually the bare State name standing in for the banner.
        // Drop that one orphan so it does not close inside the section's text.
        // Only when there is no banner — where there IS one it is the separator,
        // and the line above it is the section's own last line.
        if (!banner && rawParts.length > 1 && ORPHAN_FRAGMENT.test(rawParts[rawParts.length - 1] ?? "")) {
          rawParts.pop();
        }
        flush();
        stateAmendmentMode = true;
        stateAmendmentBase = lastBase;
        stateAmendmentAnchor = lastNumber;
        stateAmendmentRegions += 1;
        blockLines = [];
        citationParts = [];
        // A bannerless block IS its instruction, so that line belongs to it.
        if (!banner) blockLines.push(flat);
        continue;
      }

      if (stateAmendmentMode) {
        // Page numbers and running heads are not substance: a page break
        // between two States' blocks must not read as the line after the
        // citation, which is one of the three ways D-051's latch was defeated.
        if (FURNITURE.some((re) => re.test(flat))) continue;

        // A citation closes one State's block, and only that. The region runs
        // on — the next line is as likely to be another State's amendment as
        // anything belonging to the Act.
        if (citationLines > 0) {
          citationParts.push(flat);
          if (CITATION_END.test(flat)) {
            citationLines = 0;
            sinceCitation = true;
            closeStateBlock();
          } else if (++citationLines > CITATION_MAX_LINES) {
            // Unclosed bracket. Stop consuming, but do NOT treat the Act as
            // resumed: falling back to the base test can only over-skip, while
            // trusting a citation we never saw end could publish State law.
            citationLines = 0;
            diagnostics.push(
              `State-amendment citation near §${stateAmendmentBase} ran past ${CITATION_MAX_LINES} lines with no closing bracket`,
            );
          }
          continue;
        }
        if (STATE_AMENDMENT_CITATION.test(flat)) {
          stateAmendmentBlocks += 1;
          citationParts.push(flat);
          if (CITATION_END.test(flat)) {
            sinceCitation = true;
            closeStateBlock();
          } else {
            citationLines = 1;
          }
          continue;
        }

        // Two ways the Act resumes, and it needs both.
        //
        // A section number PAST the one the region opened on can be nothing but
        // the Act: everything a State inserts is a lettered variant of that
        // number ("80A"–"80G" after s.80), which advances the letter and never
        // the base. This also covers regions printed with no closing citation
        // at all (ARB's first block).
        //
        // That test alone is not enough, because the Act's OWN lettered
        // sections are indistinguishable from insertions by number — HMA §13B
        // (divorce by mutual consent) sits directly after a State region opened
        // on §13, as do CPC §§35A–45 and ARB §29B. What separates them is where
        // they are printed: the Act resumes on the line after a citation, while
        // an insertion is introduced by its amending instruction ("Insertion of
        // new section 80A.—After section 80 of the principal Act…") and is
        // usually quoted besides. So a lettered section is the Act's own when it
        // directly follows a "[Vide …]" — which, across the Registration Act's
        // 151 cited blocks, is where every genuine resumption occurs.
        const resume = SECTION_START.exec(flat.replace(LEADING_MARKERS, ""));
        if (resume) {
          const base = Number.parseInt(resume[1] ?? "0", 10);
          if (base > stateAmendmentBase || sinceCitation) {
            stateAmendmentMode = false;
            // fall through: this line is a real section start
          } else {
            stateAmendmentSkipped += 1;
            sinceCitation = false;
            blockLines.push(flat);
            continue;
          }
        } else if (sinceCitation && CHAPTER_HEADING.test(flat.replace(LEADING_MARKERS, ""))) {
          // A Part heading is the Act resuming ONLY directly after a citation.
          // Elsewhere in the region it belongs to the amendment: Bengal inserts
          // a whole "PART XIIIA — OF TOUTS" carrying sections 80A to 80G, and
          // exiting on that heading published all seven as central law.
          stateAmendmentMode = false;
          // fall through: real chapter heading
        } else {
          sinceCitation = false;
          blockLines.push(flat); // amending prose — out of the Act, into the record
          continue;
        }
      }

      if (FURNITURE.some((re) => re.test(flat))) continue;

      // Any body-height content line closes an illustration block; the
      // heading (re)opens one. Furniture above stays neutral so a block can
      // continue past a page-number line onto the next page.
      illustrationMode = isIllustrationHeading(flat);

      // An inserted chapter carries a leading amendment bracket ("[CHAPTER VA"),
      // so strip markers before matching — otherwise the heading is not
      // recognised and lands in the previous section's body (D-033).
      const chapterLine = flat.replace(LEADING_MARKERS, "");
      const chapterMatch = CHAPTER_HEADING.exec(chapterLine);
      if (chapterMatch) {
        flush();
        flushChapter();
        pendingChapterNumber = `${chapterMatch[2]}${chapterMatch[3] ?? ""}`;
        pendingChapterKind = chapterMatch[1] === "PART" ? "part" : "chapter";
        continue;
      }
      const chapterInline = CHAPTER_HEADING_INLINE.exec(chapterLine);
      if (chapterInline) {
        flush();
        flushChapter();
        pendingChapterNumber = `${chapterInline[2]}${chapterInline[3] ?? ""}`;
        pendingChapterKind = chapterInline[1] === "PART" ? "part" : "chapter";
        // The title shared the line; keep it so the chapter is not left unnamed.
        if (chapterInline[4]) pendingChapterTitle.push(chapterInline[4]);
        continue;
      }
      // Section heading, ignoring any leading amendment bracket/marker.
      const headline = flat.replace(LEADING_MARKERS, "");
      const centred = (line[0]?.xMin ?? 0) >= CENTRED_HEADING_MIN_X;
      if (
        pendingChapterNumber !== null &&
        (CHAPTER_TITLE_LINE.test(flat) || (centred && pendingChapterTitle.length === 0)) &&
        !NEXT_HEADING.test(normalizeChapterTitle(headline)) &&
        !SECTION_START.test(headline)
      ) {
        pendingChapterTitle.push(flat.replace(TITLE_APPARATUS, " "));
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
          lastNumber = match[1];
          lastKey = key;
          currentNumber = match[1];
          currentChapterForSection = currentChapter;
          currentPartForSection = currentChapterPart;
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
  // Must sit OUTSIDE the illustration branch: State amendments are unrelated to
  // illustrations, and nesting these here meant they only reported for acts
  // that happened to have illustrations (silent on MV, which has six blocks).
  if (stateAmendmentRegions > 0) {
    diagnostics.push(
      `skipped ${stateAmendmentRegions} State-amendment region(s) covering ${stateAmendmentBlocks} cited block(s)` +
        (stateAmendmentSkipped > 0
          ? `, incl. ${stateAmendmentSkipped} State-inserted section(s) — verify none belong to the central Act`
          : ""),
    );
  }
  if (stateAmendmentMode) {
    diagnostics.push(
      "document ended inside a State-amendment region — check the tail was meant to be skipped",
    );
  }
  return { sections, chapters, diagnostics, stateAmendments };
}
