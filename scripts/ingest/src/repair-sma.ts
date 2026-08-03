/**
 * One-off: rebuild the Special Marriage Act bundle from its source PDF with the
 * body-height footnotes removed (D-058).
 *
 * WHY THIS ACT NEEDS IT. India Code's Special Marriage Act PDF prints amendment
 * footnotes at 9.9pt — the same size as its text — so the parser's height filter
 * cannot see them and the footnote-shaped guard cannot latch on them (D-050
 * permits a body-height line to be *skipped* by that latch but never to *set*
 * it, because a genuine repealed section has the same shape). Page 6's
 * footnotes are numbered 3, 5, 6 and 7, and they arrive BEFORE the real
 * sections 3 to 7 on pages 7 and 8. Each claimed its number, and the real
 * sections then read as non-increasing and were dropped:
 *
 *   §3 "Marriage Officers"                          → "Subs"
 *   §4 "Conditions relating to solemnization…"      → absent entirely
 *   §5 "Notice of intended marriage"                → "Omitted by Act 33 of 1969, s"
 *   §6 "Marriage Notice Book and publication"       → "Omitted by s"
 *   §7 "Objection to marriage"                      → "Subs"
 *
 * WHY IT IS NOT A PARSER CHANGE. D-056 measured exactly this fix as a general
 * rule and rejected it: shape plus page position cannot separate a footnote
 * from a repealed section across the corpus, and the attempt cost ICA §§89-90,
 * TP §80 and a phantom MV §2B. The rule is only safe where its result can be
 * checked against the act's own arrangement of sections — which is what this
 * script does, and why it is scoped to one act rather than shipped in the
 * parser.
 *
 * WHAT IT DOES. Drops <word> runs on lines that are (a) at body height,
 * (b) footnote-shaped, and (c) in the bottom quarter of their page — then hands
 * the result to the ordinary parser, so every note, body and division comes from
 * the same code path as every other act. Nothing is transcribed by hand.
 *
 * Usage: pnpm --filter @nexlex/ingest exec tsx src/repair-sma.ts <sma.xhtml>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

import { parseInlineAct } from "./sources/gazette-inline";

const WORD = /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;
const PAGE_HEIGHT = /height="([\d.]+)"/;
const MIN_BODY_HEIGHT = 8.6;
const LINE_Y_TOLERANCE = 4;
/** Same shape the parser uses for small-type footnotes. */
const FOOTNOTE =
  /^\d{1,2}\s*\.\s+.*(Subs\.|Ins\.|[Oo]mitted|Rep\.|[Aa]dded|by Act|by s\.|by A\.?\s?O\.|w\.e\.f\.|Vide |Cl\.|Sch\.)/;
/** Measured on this PDF: every footnote-shaped line sits at 0.775 or below the
 * page foot; the act's own text never starts a section below 0.898. */
const PAGE_FOOT = 0.77;
/**
 * A RUN-IN HEADING protects a line from the filter, and it has to.
 *
 * Shape and position alone still catch a real section: §20 reads "20. Rights
 * and disabilities not affected BY ACT.―Subject to the provisions of section
 * 19…", and "by Act" is one of the footnote pattern's own trigger phrases, so
 * the first version of this script dropped it. What no footnote in this PDF has
 * is a marginal note closed by a run-in dash — 56 of them have none, and the
 * single footnote-shaped line that does is §20 itself. So a line that looks
 * like a section start in the way sections actually look is never dropped.
 */
const RUN_IN_HEADING = /^\d{1,3}[A-Z]{0,2}\.\s*[^―—–]{3,120}[.\]]\s*[―—–]/;

/** The Act's arrangement of sections — the acceptance test, read from the PDF's
 * own contents pages rather than asserted here. */
function contentsSections(xhtml: string): string[] {
  const found: string[] = [];
  let started = false;
  for (const line of bodyLines(xhtml)) {
    if (!started) {
      if (/enacted\s+by\s+Parliament/i.test(line.text)) started = true;
      const m = /^(\d{1,3}[A-Z]{0,2})\.\s+[A-Z]/.exec(line.text);
      if (m?.[1] && !found.includes(m[1])) found.push(m[1]);
    }
  }
  return found;
}

interface Line {
  text: string;
  ratio: number;
  height: number;
}

function bodyLines(xhtml: string): Line[] {
  const out: Line[] = [];
  for (const page of xhtml.split(/<page\b/).slice(1)) {
    const height = Number(PAGE_HEIGHT.exec(page)?.[1] ?? 842) || 842;
    const words = [...page.matchAll(WORD)].map((m) => ({
      y: Number(m[4]),
      h: Number(m[4]) - Number(m[2]),
      t: m[5] ?? "",
    }));
    const rows = new Map<number, typeof words>();
    for (const w of words) {
      const key = [...rows.keys()].find((r) => Math.abs(r - w.y) <= LINE_Y_TOLERANCE) ?? w.y;
      (rows.get(key) ?? rows.set(key, []).get(key)!).push(w);
    }
    for (const [y, row] of rows) {
      const tallest = Math.max(...row.map((w) => w.h));
      out.push({
        text: row.map((w) => w.t).join(" ").replace(/\s+/g, " ").trim(),
        ratio: y / height,
        height: tallest,
      });
    }
  }
  return out;
}

/** Removes the <word> tags of every body-height footnote line at the page foot. */
function stripBodyHeightFootnotes(xhtml: string): { filtered: string; dropped: string[] } {
  const dropped: string[] = [];
  const pages = xhtml.split(/(<page\b)/);
  const out: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    const chunk = pages[i]!;
    if (chunk === "<page" || !/<word /.test(chunk)) {
      out.push(chunk);
      continue;
    }
    const height = Number(PAGE_HEIGHT.exec(chunk)?.[1] ?? 842) || 842;
    // Group this page's word tags by baseline so a whole line can be removed.
    const tags = [...chunk.matchAll(WORD)];
    const rows = new Map<number, { tag: string; text: string; h: number }[]>();
    for (const m of tags) {
      const y = Number(m[4]);
      const key = [...rows.keys()].find((r) => Math.abs(r - y) <= LINE_Y_TOLERANCE) ?? y;
      (rows.get(key) ?? rows.set(key, []).get(key)!).push({
        tag: m[0],
        text: m[5] ?? "",
        h: Number(m[4]) - Number(m[2]),
      });
    }
    let filtered = chunk;
    // Top-to-bottom, with a page-scoped latch: once the footnote block starts,
    // the rest of the page belongs to it. Without this only the NUMBERED first
    // line of each footnote went, and the wrapped remainder — "1963, s. 3 and
    // Sch. I (w.e.f. 1-10-1963)." — stayed behind in §§2, 15, 27, 29 and 34.
    // This is the same page-scoped rule the parser applies to small type; the
    // latch cannot escape the page, so a section whose body continues overleaf
    // (§4 does) is unaffected.
    let inFootnotes = false;
    for (const [y, row] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
      if (Math.max(...row.map((w) => w.h)) < MIN_BODY_HEIGHT) continue;
      if (y / height < PAGE_FOOT) continue;
      const text = row.map((w) => w.text).join(" ").replace(/\s+/g, " ").trim();
      if (!inFootnotes) {
        if (!FOOTNOTE.test(text) || RUN_IN_HEADING.test(text)) continue;
        inFootnotes = true;
      } else if (RUN_IN_HEADING.test(text)) {
        // A real section start below the block re-opens the act (does not occur
        // in this PDF, but the latch must never eat one).
        break;
      }
      dropped.push(text);
      for (const w of row) filtered = filtered.replace(w.tag, "");
    }
    out.push(filtered);
  }
  return { filtered: out.join(""), dropped };
}

const input = process.argv[2];
if (!input) {
  console.error("Usage: tsx src/repair-sma.ts <sma.xhtml>");
  process.exit(1);
}

const xhtml = readFileSync(input, "utf8");
const expected = contentsSections(xhtml);
const before = parseInlineAct(xhtml);
const { filtered, dropped } = stripBodyHeightFootnotes(xhtml);
const after = parseInlineAct(filtered);

console.log(`dropped ${dropped.length} body-height footnote line(s) at the page foot`);
console.log(`sections ${before.sections.length} → ${after.sections.length}`);

const got = after.sections.map((s) => s.number);
const missing = expected.filter((n) => !got.includes(n));
const extra = got.filter((n) => !expected.includes(n));
console.log(`arrangement of sections lists ${expected.length}; parsed ${got.length}`);
if (missing.length) console.log(`  MISSING: ${missing.join(", ")}`);
if (extra.length) console.log(`  extra:   ${extra.join(", ")}`);

const suspect = after.sections.filter(
  (s) => s.marginalNote.length < 6 || /^(Subs|Ins|Rep|Omitted|The words)\b/.test(s.marginalNote),
);
if (suspect.length) {
  console.log(`  SUSPECT NOTES: ${suspect.map((s) => `§${s.number} "${s.marginalNote}"`).join("; ")}`);
}

// No body may still carry footnote apparatus.
const residue = after.sections.filter((s) =>
  /Subs\. by|Ins\. by|w\.e\.f\.|omitted by Act|ibid\./.test(s.bodyMd),
);
if (residue.length) {
  console.log(`  FOOTNOTE RESIDUE in ${residue.length} bod(y|ies): ${residue.map((s) => `§${s.number}`).join(", ")}`);
}

if (missing.length > 0 || suspect.length > 0 || residue.length > 0) {
  console.error("\nRefusing to write the bundle — the parse does not match the Act's own contents.");
  process.exit(1);
}

const metaPath = join(import.meta.dirname, "..", "bundles", "sma-meta.json");
const meta = JSON.parse(readFileSync(metaPath, "utf8")) as {
  act: Record<string, unknown>;
  provenance: string;
};
const bundle = {
  act: meta.act,
  chapters: after.chapters,
  sections: after.sections.map((s) => ({
    number: s.number,
    chapterNumber: s.chapterNumber,
    ...(s.partNumber ? { partNumber: s.partNumber } : {}),
    marginalNote: s.marginalNote,
    bodyMd: s.bodyMd,
  })),
  ...(after.stateAmendments?.length ? { stateAmendments: after.stateAmendments } : {}),
  provenance: meta.provenance,
};
const outPath = join(import.meta.dirname, "..", "bundles", "sma.json");
writeFileSync(outPath, `${JSON.stringify(bundle, null, 2)}\n`);
console.log(`\nwrote ${outPath} — ${bundle.sections.length} sections, ${after.chapters.length} divisions`);
