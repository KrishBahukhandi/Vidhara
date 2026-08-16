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
 * STATUS — NOT YET WIRED TO ANYTHING. There is no migration, no publish path,
 * no route and no renderer; nothing imports this file. It does not yet pass its
 * acceptance gate and must not be published until it does.
 *
 * Gate: the Act's own arrangement lists 51 plain Orders plus XVI-A and XXVII-A;
 * three further lettered Orders are real central law inserted after that
 * arrangement was typeset (XIII-A Summary Judgment and XV-A Case Management
 * Hearing from the Commercial Courts Act, XXXII-A family matters from 1976).
 * So ~56 distinct Orders.
 *
 * Where it stands: 55 Orders and 735 rules, of which 54 are distinct. Order VII
 * Rule 11 — the reason this exists — parses correctly, with its marginal note
 * and full body. Known gaps: Order XI is emitted twice, and XVI-A and XXVII-A
 * are missing, both almost certainly a State region opening or closing in the
 * wrong place. Those are the next thing to measure.
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

export interface CpcScheduleParseResult {
  orders: ParsedOrder[];
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

/** Strip amendment apparatus so "*[ORDER XV" and "“ORDER XV-A" both match. */
function stripMarkers(line: string): string {
  return line.replace(/^[\s*"“”'‘’\[\]]+/, "").trim();
}

const ORDER_HEADING = /^ORDER\s+([IVXLC]+(?:-[A-Z])?)\s*\.?$/i;
/** A rule start: "1." / "10A." followed by its run-in heading. */
const RULE_START = /^(\d+[A-Z]?)\.\s*(.+)$/;
/** Splits a run-in heading from its body at the em/en dash the print uses. */
const RUN_IN_SPLIT = /^(.{2,140}?)\s*[.]?\s*[—–―‒-]{1,2}\s*(.+)$/s;
/** Footnote apparatus, which is printed in the same shape as a rule. */
/**
 * A State-amendment banner. D-052/D-057 established the shape: anything opening
 * "STATE AMEN" (the print misspells it as STATE AMENEDMENT and STATE AMENDEMT),
 * and a region rather than a single block, because several States stack under
 * one banner.
 */
const STATE_BANNER = /^\s*STATE\s+AMEN/i;
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
    return { orders: [], diagnostics };
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

  let ruleNumber: string | null = null;
  let ruleParts: string[] = [];
  let lastRuleBase = 0;

  const flushRule = () => {
    if (ruleNumber === null) return;
    const raw = ruleParts.join(" ").replace(/\s+/g, " ").trim();
    if (!raw) {
      ruleNumber = null;
      ruleParts = [];
      return;
    }
    const split = RUN_IN_SPLIT.exec(raw);
    const marginalNote = split ? split[1]!.replace(/[[\]]/g, "").trim() : "";
    const bodyMd = split ? split[2]!.trim() : raw;
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
    if (current) orders.push(current);
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

      if (STATE_BANNER.test(bare)) {
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
        if (resumesByOrder || resumesByRule) {
          stateRegion = false;
        } else {
          continue;
        }
      }

      if (orderMatch) {
        flushOrder();
        started = true;
        current = { number: orderMatch[1]!.toUpperCase(), title: "", rules: [] };
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
          const piece = normalizeChapterTitle(bare);
          current!.title = current!.title ? `${current!.title} ${piece}` : piece;
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

  const ruleCount = orders.reduce((n, o) => n + o.rules.length, 0);
  diagnostics.push(`${orders.length} Order(s), ${ruleCount} rule(s)`);
  return { orders, diagnostics };
}
