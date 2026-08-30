/**
 * Acts whose PDFs print amendment footnotes at BODY HEIGHT (D-058, D-059).
 *
 * Most India Code PDFs set footnotes around 8.2pt, which the parser's height
 * filter separates cleanly. A few set them at 9.9-10pt — the same size as the
 * text — and then two things go wrong at once: the height filter cannot see
 * them, and D-050's footnote latch may not fire, because that latch is
 * deliberately one-way (a body-height line may be *skipped* by it but never
 * *set* it, since a genuine repealed section has the same shape).
 *
 * The consequence is not cosmetic. A footnote numbered "4." arriving before the
 * real section 4 claims that number, and every real section from there to the
 * next higher number is then rejected as non-increasing. The Special Marriage
 * Act lost sections 3 to 7 that way — section 4, the conditions for a valid
 * marriage, vanished outright — and the SC/ST (Prevention of Atrocities) Act
 * lost section 3, its central punishment provision.
 *
 * WHY THIS IS NOT IN THE PARSER. D-056 measured exactly this rule corpus-wide
 * and rejected it: shape plus page position cannot separate a footnote from a
 * repealed section, and the attempt cost ICA §§89-90, TP §80 and produced a
 * phantom MV §2B. It is only safe where the result can be checked against the
 * act's own arrangement of sections, which is what the caller does — and why
 * this is opt-in per act rather than applied to everything.
 *
 * WHAT IT DOES. Removes the `<word>` runs of lines that are at body height,
 * footnote-shaped, and in the bottom part of their page, then leaves the caller
 * to hand the result to the ORDINARY parser. Nothing is transcribed by hand and
 * no note, body or division comes from anywhere but the normal code path.
 */
const WORD =
  /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;
const PAGE_HEIGHT = /height="([\d.]+)"/;
const MIN_BODY_HEIGHT = 8.6;
const LINE_Y_TOLERANCE = 4;
const DEFAULT_PAGE_HEIGHT = 842;

/** The same shape the parser uses to recognise a small-type footnote. */
const FOOTNOTE =
  /^\d{1,2}\s*\.\s+.*(Subs\.|Ins\.|[Oo]mitted|Rep\.|[Aa]dded|by Act|by s\.|by A\.?\s?O\.|w\.e\.f\.|Vide |Cl\.|Sch\.)/;

/**
 * A RUN-IN HEADING protects a line, and it has to.
 *
 * Shape and position alone still catch real sections: Special Marriage §20 is
 * "Rights and disabilities not affected BY ACT.―Subject to…", and "by Act" is
 * one of the footnote pattern's own triggers. What no footnote carries is a
 * marginal note closed by a run-in dash — across the two acts repaired so far,
 * 56 of 57 and 40 of 41 footnote-shaped lines have none, and every line that
 * does is a genuine section. So a line that looks like a section start in the
 * way sections actually look is never removed.
 */
const RUN_IN_HEADING = /^\d{1,3}[A-Z]{0,2}\.\s*[^―—–]{3,120}[.\]]\s*[―—–]/;
/**
 * A REPEALED section, which the India Code prints WITHOUT a run-in dash.
 *
 * The bracket closes the marginal note instead, in either of two placements:
 *
 *   48. [Execution barred in certain cases.] Rep. by the Limitation Act, 1963…
 *   [130A. Transfer of policy of marine insurance.] Rep. by the Marine…
 *
 * With no dash, RUN_IN_HEADING does not protect them, and the footnote shape
 * matches both — a number, a full stop, and "Rep." further along. CPC §48 sits
 * at 0.80 of its page and was stripped outright.
 *
 * No footnote has this shape. A footnote's number is followed straight away by
 * the amendment verb ("1. Subs. by Act 3 of 1921…"); it never carries a
 * bracketed marginal note, and the bracket must close on a full stop for this
 * to match at all.
 */
const REPEALED_HEADING =
  /^\[?\s*\d{1,3}[A-Z]{0,2}\.\s*\[?\s*[^[\]]{3,120}\.\s*\]\s*(Rep\b|Omitted|Repealed)/i;
/** Either shape of section start — neither may be taken for a footnote. */
const SECTION_HEADING = (text: string): boolean =>
  RUN_IN_HEADING.test(text) || REPEALED_HEADING.test(text);

/** Where the footnote block may begin, as a fraction of page height. */
export const DEFAULT_PAGE_FOOT = 0.77;

/**
 * A DRAWN RULE, used as a DELIMITER PAIR.
 *
 * The Indian Succession Act's PDF prints a run of hyphens across the column
 * around each footnote block — 97 of them — and numbers the notes WITHOUT a
 * period ("1 The Act has been extended to Berar…", "3 Ins. by Act 18 of 1929,
 * s. 2."), so neither the page-foot test nor the footnote shape sees any of it.
 *
 * The rules come in PAIRS and the block sits between them; body text resumes
 * directly after the closing rule, often mid-sentence. Treating a rule as
 * "footnotes start here, to the end of the page" was tried and was badly wrong —
 * rules appear from 0.10 to 0.91 of page height and 40 pages carry more than
 * one, so latching to the page end dropped 1,008 lines and 60 real sections.
 * A pair also spans page breaks (the Act's very first block opens on page 1 and
 * closes on page 2), so the toggle is document-wide, not page-scoped.
 */
const RULE_LINE = /^[-–—_]{12,}$/;

interface Row {
  tag: string;
  text: string;
  height: number;
}

function groupRows(chunk: string): Map<number, Row[]> {
  const rows = new Map<number, Row[]>();
  for (const m of chunk.matchAll(WORD)) {
    const y = Number(m[4]);
    const key = [...rows.keys()].find((r) => Math.abs(r - y) <= LINE_Y_TOLERANCE) ?? y;
    const row = rows.get(key) ?? rows.set(key, []).get(key)!;
    row.push({ tag: m[0], text: m[5] ?? "", height: Number(m[4]) - Number(m[2]) });
  }
  return rows;
}

/**
 * The act's own arrangement of sections — read from the PDF's contents pages,
 * which is everything before the enactment formula. This is the acceptance test
 * a caller checks the repaired parse against, so it must come from the document
 * rather than be asserted anywhere.
 */
export function contentsSections(xhtml: string): string[] {
  const found: string[] = [];
  for (const chunk of xhtml.split(/<page\b/).slice(1)) {
    for (const [, row] of groupRows(chunk)) {
      const text = row.map((w) => w.text).join(" ").replace(/\s+/g, " ").trim();
      if (/enacted\s+as\b|enacted\s+by\s+Parliament|ENACT\s+AND\s+GIVE/i.test(text)) {
        return longestAscendingRun(found);
      }
      const m = /^(\d{1,3}[A-Z]{0,2})\.\s+[A-Z]/.exec(text);
      if (m?.[1]) found.push(m[1]);
    }
  }
  return longestAscendingRun(found);
}

/**
 * The arrangement of sections, picked out of everything else numbered like one.
 *
 * Section numbers ascend, so a number that goes backwards has left the list.
 * The front matter before the enactment formula can hold SEVERAL such lists,
 * and the CPC holds three kinds: it opens with 53 numbered amending Acts ("51.
 * The Factoring Regulation Act, 2011 (12 of 2011)."), then the 158 sections,
 * then the arrangement of the First Schedule's ORDERS, whose rules restart at 1
 * and are numbered in the same shape ("3A.", "8A.", "46C.") — 880 entries in
 * 54 runs. Read straight through, 44 Order rules were collected as sections the
 * Act was missing and the gate below could never pass; stopping at the first
 * reset instead kept the 53 amending Acts and lost every real section. Orders
 * are a separate table entirely (D-068).
 *
 * The arrangement is the longest of those runs. Every other act held here has
 * exactly one run, so this is inert for all of them.
 */
function longestAscendingRun(entries: string[]): string[] {
  const runs: string[][] = [];
  let current: string[] = [];
  let previous = 0;
  for (const entry of entries) {
    const base = Number.parseInt(entry, 10);
    if (base < previous) {
      runs.push(current);
      current = [];
    }
    if (!current.includes(entry)) current.push(entry);
    previous = base;
  }
  runs.push(current);
  return runs.reduce((best, run) => (run.length > best.length ? run : best), [] as string[]);
}

/**
 * Strips body-height footnote lines at the page foot.
 *
 * Latches per page once the block starts, because removing only the NUMBERED
 * first line leaves the wrapped remainder behind — "1963, s. 3 and Sch. I
 * (w.e.f. 1-10-1963)." sat inside five Special Marriage Act sections that way.
 * The latch is page-scoped, exactly as the parser's own is, so a section whose
 * body continues overleaf is unaffected — Special Marriage §4 wraps around its
 * page's footnote block and survives intact. It breaks on a real section start
 * appearing below the block, which no repaired act does but which must never be
 * swallowed if one did.
 */
export interface StripOptions {
  /** Fraction of page height below which a footnote block may begin. */
  pageFoot?: number;
  /**
   * What counts as body height, matching the parser's own floor.
   *
   * This filter only ever removes lines the PARSER would read as body — a
   * footnote set smaller than that is already handled by the footnote latch and
   * must be left alone. So the two have to agree: with 8.6 hardcoded here and
   * the parser running at 7.7 for the 2026 Constitution, this would have gone
   * looking for footnotes among lines the parser had already excluded.
   */
  minBodyHeight?: number;
  /** The PDF brackets its footnotes with drawn rules — see RULE_LINE. */
  ruleDelimited?: boolean;
}

export function stripBodyHeightFootnotes(
  xhtml: string,
  options: StripOptions = {},
): { filtered: string; dropped: string[] } {
  const pageFoot = options.pageFoot ?? DEFAULT_PAGE_FOOT;
  const bodyHeight = options.minBodyHeight ?? MIN_BODY_HEIGHT;
  const dropped: string[] = [];
  const parts = xhtml.split(/(<page\b)/);
  const out: string[] = [];
  /** Rule-delimited blocks cross page breaks, so this survives the page loop. */
  let betweenRules = false;
  for (const chunk of parts) {
    if (chunk === "<page" || !/<word /.test(chunk)) {
      out.push(chunk);
      continue;
    }
    const height = Number(PAGE_HEIGHT.exec(chunk)?.[1] ?? DEFAULT_PAGE_HEIGHT) || DEFAULT_PAGE_HEIGHT;
    let filtered = chunk;
    let inFootnotes = false;
    for (const [y, row] of [...groupRows(chunk).entries()].sort((a, b) => a[0] - b[0])) {
      if (Math.max(...row.map((w) => w.height)) < bodyHeight) continue;
      const text = row.map((w) => w.text).join(" ").replace(/\s+/g, " ").trim();

      if (options.ruleDelimited) {
        const rule = RULE_LINE.test(text.replace(/\s+/g, ""));
        if (rule) betweenRules = !betweenRules;
        if (!rule && !betweenRules) continue;
        dropped.push(text);
        for (const w of row) filtered = filtered.replace(w.tag, "");
        continue;
      }

      if (!inFootnotes) {
        if (y / height < pageFoot || !FOOTNOTE.test(text) || SECTION_HEADING(text)) continue;
        inFootnotes = true;
      } else if (SECTION_HEADING(text)) {
        break;
      }
      dropped.push(text);
      for (const w of row) filtered = filtered.replace(w.tag, "");
    }
    out.push(filtered);
  }
  return { filtered: out.join(""), dropped };
}
