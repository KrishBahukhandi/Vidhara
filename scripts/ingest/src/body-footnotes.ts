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

/** Where the footnote block may begin, as a fraction of page height. */
export const DEFAULT_PAGE_FOOT = 0.77;

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
      if (/enacted\s+as\b|enacted\s+by\s+Parliament|ENACT\s+AND\s+GIVE/i.test(text)) return found;
      const m = /^(\d{1,3}[A-Z]{0,2})\.\s+[A-Z]/.exec(text);
      if (m?.[1] && !found.includes(m[1])) found.push(m[1]);
    }
  }
  return found;
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
export function stripBodyHeightFootnotes(
  xhtml: string,
  pageFoot: number = DEFAULT_PAGE_FOOT,
): { filtered: string; dropped: string[] } {
  const dropped: string[] = [];
  const parts = xhtml.split(/(<page\b)/);
  const out: string[] = [];
  for (const chunk of parts) {
    if (chunk === "<page" || !/<word /.test(chunk)) {
      out.push(chunk);
      continue;
    }
    const height = Number(PAGE_HEIGHT.exec(chunk)?.[1] ?? DEFAULT_PAGE_HEIGHT) || DEFAULT_PAGE_HEIGHT;
    let filtered = chunk;
    let inFootnotes = false;
    for (const [y, row] of [...groupRows(chunk).entries()].sort((a, b) => a[0] - b[0])) {
      if (Math.max(...row.map((w) => w.height)) < MIN_BODY_HEIGHT) continue;
      if (y / height < pageFoot) continue;
      const text = row.map((w) => w.text).join(" ").replace(/\s+/g, " ").trim();
      if (!inFootnotes) {
        if (!FOOTNOTE.test(text) || RUN_IN_HEADING.test(text)) continue;
        inFootnotes = true;
      } else if (RUN_IN_HEADING.test(text)) {
        break;
      }
      dropped.push(text);
      for (const w of row) filtered = filtered.replace(w.tag, "");
    }
    out.push(filtered);
  }
  return { filtered: out.join(""), dropped };
}
