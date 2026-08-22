/**
 * The Code of Civil Procedure's First Schedule — the Orders and Rules.
 *
 * This is 78% of the CPC by volume and none of it has ever been in the corpus
 * (the bundle's provenance has recorded that since 2026-07-29). It is also what
 * civil practice actually runs on: Order VII Rule 11, Order VIII Rule 6,
 * Order XXXIX, Order XLI.
 *
 * It needs its own parser rather than the section parser for one structural
 * reason: **rule numbers restart inside every Order**. The inline parser's
 * safety rests on a strictly-increasing section number, and Order II Rule 1
 * following Order I Rule 13 violates that on purpose. Everything else about a
 * Rule is shaped like a section — a run-in heading, "1. Who may be joined as
 * plaintiffs.—All persons may be joined…" — so the assembly is familiar; only
 * the numbering model differs.
 *
 * Traps this print sets, each found by looking at the document:
 *  · An Order heading can carry amendment apparatus: Order XV is printed
 *    "*[ORDER XV", so an anchored ORDER match misses it. Same class as the
 *    bracketed chapter headings of D-034.
 *  · Orders can be lettered: "ORDER XV-A" (Case Management Hearing, inserted
 *    2018), which also appears a second time quoted inside a State amendment.
 *  · A footnote is printed exactly like a rule — "1. Subs. by Act 104 of 1976,
 *    s. 52, for rules 1 and 3 respectively (w.e.f. 1-2-1977)." — so the height
 *    filter and the page-scoped footnote latch are what separate them, exactly
 *    as they do for sections.
 *  · State amendments insert whole Orders (Uttar Pradesh inserts an Order XV-A
 *    of its own) and rules into existing ones, so the D-052 region model is
 *    needed here too — and it must exit at the RULE level as well as the Order
 *    level, because a State block sits in the middle of Order VII and waiting
 *    for Order VIII swallowed the rest of it, Rule 11 included.
 *
 * KNOWN LIMIT, inherited from D-052: the region exits at a rule number past the
 * one in force, on that entry's measurement that an insertion letters the base
 * ("1A" after rule 1) rather than advancing it. A State inserting a plain
 * HIGHER number would therefore resume the region early and enter as central
 * law. Every State block in this document either substitutes an existing rule
 * number or letters one, so nothing here hits it — but it is the shape to check
 * first if State text ever appears in an Order.
 *
 * STATUS: live. 57 Orders (56 distinct — the Commercial Courts Act substituted
 * a parallel Order XI and the print carries both) and 728 rules, published to
 * act_orders / act_order_rules and rendered at /acts/cpc/orders.
 *
 * Acceptance gate: the Act's own arrangement lists 51 plain Orders plus XVI-A
 * and XXVII-A, and three further lettered Orders are central law inserted after
 * that arrangement was typeset (XIII-A Summary Judgment and XV-A Case
 * Management Hearing from the Commercial Courts Act, XXXII-A family matters
 * from 1976) — 56 distinct, which is what it produces.
 */
import { FURNITURE, normalizeChapterTitle } from "./gazette-common";

/** Below this height a word is footnote/small type (same threshold as the inline parser). */
const MIN_BODY_HEIGHT = 8.6;

export interface ParsedRule {
  number: string;
  marginalNote: string;
  bodyMd: string;
}

export interface ParsedOrder {
  number: string;
  title: string;
  rules: ParsedRule[];
}

export interface ParsedForm {
  number: string;
  title: string;
  bodyMd: string;
}

export interface ParsedAppendix {
  letter: string;
  title: string;
  forms: ParsedForm[];
}

export interface CpcScheduleParseResult {
  orders: ParsedOrder[];
  /**
   * The Appendices — 30% of the document and a different kind of content: not
   * provisions to read but forms to copy (a plaint for money lent, a decree for
   * possession). Their dotted runs are the fill-in blanks as printed, so they
   * are kept rather than collapsed as whitespace.
   */
  appendices: ParsedAppendix[];
  diagnostics: string[];
}

interface Word {
  text: string;
  xMin: number;
  yMin: number;
  height: number;
}

const WORD_RE =
  /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

/** Group words into visual lines by baseline proximity. */
function toLines(words: Word[]): Word[][] {
  const sorted = [...words].sort((a, b) => a.yMin - b.yMin || a.xMin - b.xMin);
  const lines: Word[][] = [];
  let cur: Word[] = [];
  let base = Number.NEGATIVE_INFINITY;
  for (const w of sorted) {
    if (cur.length === 0 || Math.abs(w.yMin - base) <= 3) {
      cur.push(w);
      if (cur.length === 1) base = w.yMin;
    } else {
      lines.push(cur.sort((a, b) => a.xMin - b.xMin));
      cur = [w];
      base = w.yMin;
    }
  }
  if (cur.length) lines.push(cur.sort((a, b) => a.xMin - b.xMin));
  return lines;
}

/**
 * Strip amendment apparatus from the head of a line.
 *
 * Three forms occur: "*[ORDER XV", "“ORDER XV-A", and — the one that cost both
 * Orders XVI-A and XXVII-A — a superscript footnote digit before the bracket,
 * "1 [ORDER XVI A". The digit is only removed when a bracket follows it, so a
 * rule start ("1. Definitions.—…") keeps its number.
 */
function stripMarkers(line: string): string {
  return line
    .replace(/^\s*\d+\s*(?=\[)/, "")
    .replace(/^[\s*"“”'‘’\[\]]+/, "")
    .trim();
}

/**
 * An Order heading. The letter suffix is separated by a HYPHEN in the
 * arrangement ("ORDER XVI-A") and by a SPACE in the body ("1 [ORDER XVI A"),
 * and the body form can carry a closing bracket ("ORDER XXVII A]"). Requiring
 * the hyphen lost both of those Orders entirely.
 */
const ORDER_HEADING = /^ORDER\s+([IVXLC]+)(?:[-\s]([A-Z]))?\s*[\].]?$/i;
/** A rule start: "1." / "10A." followed by its run-in heading. */
const RULE_START = /^(\d+[A-Z]?)\.\s*(.+)$/;
/**
 * Splits a run-in heading from its body.
 *
 * Two forms, and the order matters. A real dash (em, en, horizontal bar) can
 * stand on its own. A plain HYPHEN only counts when a period precedes it —
 * D-062 found this print uses ".-" as a run-in dash, but admitting a bare
 * hyphen split Order VIII Rule 6 inside the word "set-off", giving the note
 * "Particulars of set" and a body beginning "off to be given…".
 */
const RUN_IN_DASH = /^(.{2,140}?)\s*[—–―‒]{1,2}\s*(.+)$/s;
const RUN_IN_PERIOD_HYPHEN = /^(.{2,140}?)\.\s*[-]{1,2}\s*(.+)$/s;
/** Footnote apparatus, which is printed in the same shape as a rule. */
/**
 * A State-amendment banner. D-052/D-057 established the shape: anything opening
 * "STATE AMEN" (the print misspells it as STATE AMENEDMENT and STATE AMENDEMT),
 * and a region rather than a single block, because several States stack under
 * one banner.
 */
const STATE_BANNER = /^\s*STATE\s+AMEN/i;
/**
 * An amending instruction, which opens a region even where no banner is
 * printed — D-052's finding, and it happens here too. Uttar Pradesh's second
 * insertion into Order XV opens straight into "Uttar Pradesh Insertion of new
 * rule in Order XV" after a citation and a page number, with no STATE
 * AMENDMENT line, and its substituted rule 5 then entered as central law
 * alongside the real one.
 */
const AMENDING_INSTRUCTION =
  /^(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\s+)?(?:Amendment|Insertion|Substitution|Omission|Addition|Deletion)\s+of\s+(?:new\s+)?(?:rule|Order|section)\b/;
/** "[Vide Uttar Pradesh Act 57 of 1976, s. 8]" — the authority closing a State block. */
const VIDE_CITATION = /\[\s*Vide\b/i;
/**
 * The Orders end where the Appendices begin. Without this the parser ran on
 * into APPENDIX A and read its forms as rules of Order LI — including a
 * 23,863-character blob and entries like "On the……day of……20…, he lent the
 * defendant ……rupees". Ending the document is the most destructive thing this
 * parser does, so it announces itself (D-057).
 */
// Case-SENSITIVE and anchored at BOTH ends. The heading is set all-caps and
// alone on its line; body text says "…in the form in Appendix C, with such
// variations as circumstances may require", and an /i pattern matching a
// prefix ended the Schedule at Order XI. This is D-018's /THE GAZETTE OF
// INDIA/ lesson in a new place: never an unanchored case-insensitive regex
// for page furniture.
const APPENDIX_START = /^APPENDIX\s+[A-Z]\s*$/;
/**
 * An Appendix heading, in the three forms this print uses.
 *
 * Four of the nine are set with a DROP CAP, and because bbox words are ordered
 * by x-position the line reaches the parser as "A D PPENDIX" — a large "A",
 * the appendix letter, then "PPENDIX" in small caps. That is the same artifact
 * D-054 measured on "C HAPTER V" and D-055 on "I NTRODUCTION"; without it,
 * Appendices D, E, G and H were invisible and their forms were absorbed into
 * whichever Appendix was open (Appendix C ended up with 88).
 */
const APPENDIX_HEADING = /^APPENDIX[-\s]+([A-Z])\s*$/;
// Words are ordered by x, and the drop cap sits left of the small-caps
// remainder with the letter to its right: "A" @280, "PPENDIX" @288, "D" @324.
const APPENDIX_DROPCAP = /^A\s+PPENDIX[-\s]+([A-Z])\s*$/;

function matchAppendix(line: string): string | null {
  return (APPENDIX_HEADING.exec(line) ?? APPENDIX_DROPCAP.exec(line))?.[1] ?? null;
}
/** "No. 1" alone, or "No. 1 MONEY LENT" with the title run in. */
const FORM_HEADING = /^No\.\s*(\d+[A-Z]*)\s*(.*)$/;
/**
 * A rule whose entire body is amendment apparatus. FOOTNOTE_SHAPE catches the
 * common form at line start, but Order X carries "Explanation ins. by s. 59,
 * ibid. (w.e.f. 1-2-1977)." where a real word precedes the citation verb, so it
 * arrived as a second rule 2. Tested on the assembled body, and only when that
 * body is short — a genuine repealed rule opens with a citation and is allowed
 * (the correction D-059 had to make).
 */
const CITATION_ONLY = /\b(?:ins|subs|added|omitted|rep)\.\s+by\b/i;
const FOOTNOTE_SHAPE =
  /^\d+[A-Z]?\.\s*(?:Subs\.|Ins\.|Added|Omitted|Rep\.|Renumbered|The words|Certain words|Cl\.|Clause|Earlier|Now|See|Vide|w\.e\.f\.)/i;

const ROMAN_VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
function romanValue(s: string): number {
  const base = s.split("-")[0] ?? s;
  let total = 0;
  for (let i = 0; i < base.length; i += 1) {
    const cur = ROMAN_VALUES[base[i]!.toUpperCase()] ?? 0;
    const next = ROMAN_VALUES[base[i + 1]?.toUpperCase() ?? ""] ?? 0;
    total += cur < next ? -cur : cur;
  }
  return total;
}

export function parseCpcSchedule(xhtml: string): CpcScheduleParseResult {
  const diagnostics: string[] = [];

  // Words carry page structure only through their order in the file; pages are
  // <page> elements, so split on them to keep the footnote latch page-scoped
  // exactly as the section parser does.
  const allPages = xhtml.split(/<page\b/).slice(1);

  /**
   * The contents page lies — D-036's finding on the Limitation Act, and it is
   * true here at a larger scale. "THE FIRST SCHEDULE" appears twice: once in
   * the arrangement near the front, where every Order is listed with its rule
   * TITLES and no bodies, and once where the Schedule actually begins. Entering
   * at the first produced 110 Orders and 1,609 "rules" whose bodies were their
   * own headings ("Rejection of plaint."). The real Schedule is the LAST
   * occurrence, and it is identified by a page that carries the heading and is
   * followed by rules with run-in bodies rather than bare titles.
   */
  // "THE FIRST SCHEDULE" occurs on ~40 of this document's 347 pages — the
  // arrangement, the real start, and every running header and cross-reference
  // in between. Neither "first" nor "last" finds it: the first is the
  // arrangement (which yielded 110 Orders whose rule bodies were their own
  // titles) and the last is a cross-reference past the end of the Schedule
  // (which yielded none at all). The start is the first page carrying the
  // heading, an ORDER I, and actual rule text — a numbered run-in heading
  // closed by a dash, which the arrangement's bare titles never have.
  const RULE_TEXT = /\d+\s*\.?\s*[A-Z][^.]{3,90}\.\s*[—–―]/;
  let entry = -1;
  for (let i = 0; i < allPages.length; i += 1) {
    const txt = (allPages[i] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    if (/THE FIRST SCHEDULE/i.test(txt) && /\bORDER\s+I\b/.test(txt) && RULE_TEXT.test(txt)) {
      entry = i;
      break;
    }
  }
  if (entry === -1) {
    diagnostics.push("first schedule not found — no page carries the heading, ORDER I and rule text");
    return { orders: [], appendices: [], diagnostics };
  }
  diagnostics.push(`schedule starts on page ${entry + 1} of ${allPages.length}`);
  const pages = allPages.slice(entry);
  const orders: ParsedOrder[] = [];

  let started = false;
  let current: ParsedOrder | null = null;
  let pendingTitle = false;

  /**
   * Inside a State-amendment region every line is skipped, so neither the
   * State's text nor the Orders it inserts enter the central Schedule. Uttar
   * Pradesh alone inserts rules into Order XI and a whole Order XV-A, and
   * without this the parse produced Order XI three times and Order XV-A twice.
   *
   * The region ends the way D-052 established for sections: at the first Order
   * whose ROMAN BASE is greater than the one in force when the region opened.
   * An insertion adds a letter to the base ("XV-A" after Order XV) but never
   * advances past it, so no amount of stacked State text can look like the
   * central Schedule resuming.
   */
  let stateRegion = false;
  let stateBase = 0;
  let stateRuleBase = 0;
  /** Directly after a "[Vide …]" citation the State block has given its authority. */
  let sinceCitation = false;

  let ruleNumber: string | null = null;
  let ruleParts: string[] = [];
  let lastRuleBase = 0;

  // Appendices: same container/item shape as Orders/Rules, and read in the same
  // pass because they sit in the same document behind the same furniture,
  // height and marker handling.
  const appendices: ParsedAppendix[] = [];
  let inAppendices = false;
  let currentAppendix: ParsedAppendix | null = null;
  let pendingAppendixTitle = false;
  let formNumber: string | null = null;
  let formTitle = "";
  let formParts: string[] = [];
  let pendingFormTitle = false;
  /** Text seen inside an Appendix before any "No. N" heading. */
  let looseParts: string[] = [];

  const flushForm = () => {
    if (formNumber === null) return;
    // Joined with newlines, not spaces. A form is a layout as much as a text —
    // "IN THE COURT OF …" / "A.B. … Plaintiff" / "against" / "C.D. … Defendant"
    // is unusable as one paragraph — so its lines are kept and the renderer
    // preserves them.
    const body = formParts
      .map((l) => l.replace(/[ \t]+/g, " ").trimEnd())
      .join("\n")
      .trim();
    if (body || formTitle) {
      currentAppendix?.forms.push({
        number: formNumber,
        title: formTitle.trim() || `Form No. ${formNumber}`,
        bodyMd: body,
      });
    }
    formNumber = null;
    formTitle = "";
    formParts = [];
    pendingFormTitle = false;
  };

  const flushAppendix = () => {
    flushForm();
    if (currentAppendix) {
      // Appendix I (Statement of Truth, inserted 2018) is a single form with no
      // "No. N" heading at all, so nothing was collected for it. Text seen
      // inside an Appendix before any numbered form is that Appendix's own
      // single form rather than something to discard.
      const loose = looseParts
        .map((l) => l.replace(/[ \t]+/g, " ").trimEnd())
        .join("\n")
        .trim();
      if (currentAppendix.forms.length === 0 && loose.length > 120) {
        currentAppendix.forms.push({ number: "1", title: currentAppendix.title, bodyMd: loose });
      }
      const existing = appendices.find((a) => a.letter === currentAppendix!.letter);
      if (existing) {
        // The print repeats a heading (Appendix I appears twice — once as the
        // amendment's insertion header, once as the Appendix). Keep whichever
        // carries content rather than emitting both.
        if (currentAppendix.forms.length > existing.forms.length) {
          appendices[appendices.indexOf(existing)] = currentAppendix;
        }
      } else if (currentAppendix.forms.length > 0 || currentAppendix.title) {
        appendices.push(currentAppendix);
      }
    }
    currentAppendix = null;
    looseParts = [];
  };

  const flushRule = () => {
    if (ruleNumber === null) return;
    const raw = ruleParts.join(" ").replace(/\s+/g, " ").trim();
    if (!raw) {
      ruleNumber = null;
      ruleParts = [];
      return;
    }
    // A REPEALED rule's body legitimately is its repeal citation — Order XLV
    // prints "[Consolidation of suits.] Rep. by the Code of…" — so a bracketed
    // title followed by the citation is content, not apparatus. This is the
    // correction D-059 had to make for sections, in the same place.
    const isRepealedRule = /^\[[^\]]{3,90}\]\s*(?:Rep\.|Omitted)/i.test(raw);
    if (
      !isRepealedRule &&
      raw.length < 160 &&
      CITATION_ONLY.test(raw) &&
      /\bibid\b|w\.e\.f\.|Act \d+ of \d{4}/i.test(raw)
    ) {
      diagnostics.push(`dropped footnote read as a rule in Order ${current?.number}: "${raw.slice(0, 46)}"`);
      ruleNumber = null;
      ruleParts = [];
      return;
    }
    const split = RUN_IN_DASH.exec(raw) ?? RUN_IN_PERIOD_HYPHEN.exec(raw);
    // Trailing period trimmed so notes read like the section corpus's do.
    const marginalNote = split ? split[1]!.replace(/[[\]]/g, "").replace(/\.\s*$/, "").trim() : "";
    const bodyMd = split ? split[2]!.trim() : raw;
    if (current?.rules.some((r) => r.number === ruleNumber)) {
      // The schema requires one rule per number per Order, and silently
      // dropping the second would hide a real question about which is the
      // operative text. Kept as the first occurrence and reported.
      diagnostics.push(
        `Order ${current.number} rule ${ruleNumber} appears twice — kept the first ("${
          current.rules.find((r) => r.number === ruleNumber)?.marginalNote.slice(0, 40) ?? ""
        }"), dropped ("${(marginalNote || raw).slice(0, 40)}")`,
      );
      ruleNumber = null;
      ruleParts = [];
      return;
    }
    current?.rules.push({
      number: ruleNumber,
      marginalNote: marginalNote || raw.slice(0, 80).replace(/\s+\S*$/, "") || `Rule ${ruleNumber}`,
      bodyMd,
    });
    ruleNumber = null;
    ruleParts = [];
  };

  const flushOrder = () => {
    flushRule();
    // An Order with neither a title nor a rule is not an Order — it is a
    // running header or a cross-reference that matched the heading shape.
    if (current && (current.rules.length > 0 || current.title)) orders.push(current);
    current = null;
    lastRuleBase = 0;
  };

  for (const page of pages) {
    const words: Word[] = [];
    let m: RegExpExecArray | null;
    WORD_RE.lastIndex = 0;
    while ((m = WORD_RE.exec(page)) !== null) {
      words.push({
        text: decode(m[5] ?? ""),
        xMin: Number(m[1]),
        yMin: Number(m[2]),
        height: Number(m[4]) - Number(m[2]),
      });
    }
    // Page-scoped: once footnotes begin on a page, everything below is
    // apparatus — including the occasional line the typesetter left at body
    // height (the defect D-050 measured on this very act).
    let footnotesStarted = false;

    for (const line of toLines(words)) {
      const bodyWords = line.filter((w) => w.height >= MIN_BODY_HEIGHT);
      const flat = bodyWords
        .map((w) => w.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const fullLine = line
        .map((w) => w.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (!fullLine) continue;
      if (FURNITURE.some((re) => re.test(fullLine))) continue;

      const bareLine = stripMarkers(fullLine);
      const appendixLetter = matchAppendix(bareLine);
      if (appendixLetter) {
        // The Orders end here. Rather than stop, hand over to the Appendices —
        // same document, same machinery, different content.
        if (!inAppendices) {
          diagnostics.push(`Orders end at "${bareLine}"; reading the Appendices`);
          flushOrder();
          inAppendices = true;
        }
        flushAppendix();
        currentAppendix = { letter: appendixLetter, title: "", forms: [] };
        pendingAppendixTitle = true;
        continue;
      }

      if (inAppendices) {
        if (pendingAppendixTitle) {
          const piece = normalizeChapterTitle(bareLine).replace(/[[\]]/g, "").trim();
          // The title is one centred line; a form heading below it ends it.
          if (piece && !FORM_HEADING.test(bareLine)) {
            currentAppendix!.title = piece;
            pendingAppendixTitle = false;
            continue;
          }
          pendingAppendixTitle = false;
        }

        const form = FORM_HEADING.exec(bareLine);
        if (form) {
          flushForm();
          formNumber = form[1]!;
          const inlineTitle = (form[2] ?? "").trim();
          if (inlineTitle) {
            formTitle = normalizeChapterTitle(inlineTitle);
          } else {
            // Title sits on the next line.
            pendingFormTitle = true;
          }
          continue;
        }

        if (formNumber !== null) {
          if (pendingFormTitle) {
            formTitle = normalizeChapterTitle(bareLine);
            pendingFormTitle = false;
            continue;
          }
          formParts.push(fullLine);
        } else if (currentAppendix) {
          looseParts.push(fullLine);
        }
        continue;
      }

      // Small type: footnotes, and the apparatus that opens them.
      if (!flat) {
        if (FOOTNOTE_SHAPE.test(fullLine)) footnotesStarted = true;
        continue;
      }
      if (footnotesStarted) continue;
      if (FOOTNOTE_SHAPE.test(flat)) {
        footnotesStarted = true;
        continue;
      }

      const bare = stripMarkers(flat);

      if (STATE_BANNER.test(bare) || AMENDING_INSTRUCTION.test(bare)) {
        flushRule();
        stateRegion = true;
        stateBase = current ? romanValue(current.number) : 0;
        stateRuleBase = lastRuleBase;
        continue;
      }

      const orderMatch = ORDER_HEADING.exec(bare);

      if (stateRegion) {
        // The region ends where the CENTRAL Schedule demonstrably resumes, and
        // that can happen at either level. Testing only the Order was wrong:
        // a State block sits in the middle of Order VII, so waiting for
        // Order VIII swallowed the rest of Order VII's rules — Rule 11 among
        // them. A rule numbered above the one in force when the block opened
        // is the central Schedule continuing, because an insertion letters the
        // base ("10A" after rule 10) rather than advancing it.
        const ruleHere = RULE_START.exec(bare);
        const resumesByOrder = orderMatch !== null && romanValue(orderMatch[1]!) > stateBase;
        const resumesByRule =
          ruleHere !== null && parseInt(ruleHere[1]!, 10) > stateRuleBase && /[.]\s*[—–―]/.test(bare);
        // Directly after a citation, ANY Order heading resumes the central
        // Schedule — including a lettered one at the same base. Orders XVI-A and
        // XXVII-A are central insertions (Act 23 of 1942) printed immediately
        // after an Uttar Pradesh block, and the greater-base test alone read
        // them as more State text and dropped both.
        const resumesAfterCitation = sinceCitation && orderMatch !== null;
        if (resumesByOrder || resumesByRule || resumesAfterCitation) {
          stateRegion = false;
          sinceCitation = false;
        } else {
          // Tested against the UNSTRIPPED line: stripMarkers removes the
          // leading bracket, and "[Vide …]" is recognised by that bracket.
          if (VIDE_CITATION.test(flat)) sinceCitation = true;
          continue;
        }
      }

      if (orderMatch) {
        flushOrder();
        started = true;
        const orderNumber = orderMatch[2] ? `${orderMatch[1]!.toUpperCase()}-${orderMatch[2].toUpperCase()}` : orderMatch[1]!.toUpperCase();
        current = { number: orderNumber, title: "", rules: [] };
        lastRuleBase = 0;
        pendingTitle = true;
        continue;
      }
      if (!started) continue;

      if (pendingTitle) {
        // The line under the heading is the Order's title. A rule start means
        // the Order was printed without one.
        if (!RULE_START.test(bare)) {
          // Small caps leave a drop cap stranded — "P LAINT" for PLAINT — the
          // same repair chapter titles need (D-015/D-036).
          // Strip apparatus brackets ("Written statement, set-off and
          // counter-claim]") and skip a piece the title already carries — the
          // running head repeats Order V's title beneath its own heading, which
          // produced "Issue and service of summons Issue of Summons".
          const piece = normalizeChapterTitle(bare).replace(/[[\]]/g, "").trim();
          const already = current!.title;
          // A title can wrap — Order XXVII-A's runs "…as to the interpretation
          // of" / "the constitution" — but the line under a title is just as
          // often a CROSS-HEADING, and Order V's "Issue of Summons" beneath
          // "Issue and service of summons" produced a title carrying both.
          // A continuation is recognised by the line above ending mid-phrase
          // (on a connective) or the line below opening lowercase.
          const continues =
            !already ||
            /\b(?:of|to|as|the|for|in|and|or|by|on|under|with|from)$/i.test(already) ||
            /^[a-z]/.test(piece);
          if (piece && continues && !already.toLowerCase().includes(piece.toLowerCase())) {
            current!.title = already ? `${already} ${piece}` : piece;
          }
          continue;
        }
        pendingTitle = false;
      }

      const ruleMatch = RULE_START.exec(bare);
      if (ruleMatch) {
        const num = ruleMatch[1]!;
        const base = parseInt(num, 10);
        // Rule numbers restart per Order, so the guard is per-Order and only
        // needs to be strictly increasing WITHIN the current one.
        if (base >= lastRuleBase) {
          flushRule();
          ruleNumber = num;
          lastRuleBase = base;
          ruleParts = [ruleMatch[2] ?? ""];
          continue;
        }
        diagnostics.push(`skipped non-increasing "${num}." in Order ${current?.number}`);
      }

      if (ruleNumber !== null) ruleParts.push(bare);
    }
  }
  flushOrder();

  flushAppendix();
  return finish();

  function finish(): CpcScheduleParseResult {
  const ruleCount = orders.reduce((n, o) => n + o.rules.length, 0);

  // A repeated number is not automatically an error here. The Commercial
  // Courts Act 2015 substituted a whole parallel Order XI for suits before a
  // Commercial Division, and the print carries both. They are reported rather
  // than collapsed, because merging two Orders that the source keeps apart
  // would silently mix two bodies of law.
  const seen = new Map<string, number>();
  for (const o of orders) seen.set(o.number, (seen.get(o.number) ?? 0) + 1);
  for (const [number, count] of seen) {
    if (count > 1) diagnostics.push(`Order ${number} appears ${count}× — check both are central law`);
  }

  const formCount = appendices.reduce((n, a) => n + a.forms.length, 0);
  diagnostics.push(`${orders.length} Order(s), ${seen.size} distinct, ${ruleCount} rule(s)`);
  diagnostics.push(`${appendices.length} Appendix/Appendices, ${formCount} form(s)`);
  return { orders, appendices, diagnostics };
  }
}
