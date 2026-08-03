/**
 * Rebuilds an act's bundle with its body-height footnotes removed (D-059).
 *
 * For the acts whose PDFs set footnotes at text size — see body-footnotes.ts for
 * why that is destructive and why it is not a parser change. Used by the
 * Special Marriage Act and the SC/ST (Prevention of Atrocities) Act.
 *
 * The three gates below are the whole point: this refuses to write a bundle
 * unless the repaired parse matches the act's OWN arrangement of sections, no
 * marginal note is footnote-shaped, and no body retains footnote apparatus. A
 * filter this aggressive is only safe when its result is checked, so the check
 * is not optional.
 *
 *   pnpm --filter @nexlex/ingest exec tsx src/repair-footnote-act.ts <slug> <act.xhtml>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

import { contentsSections, stripBodyHeightFootnotes } from "./body-footnotes";
import { parseInlineAct } from "./sources/gazette-inline";

const [slug, input] = process.argv.slice(2);
if (!slug || !input) {
  console.error("Usage: tsx src/repair-footnote-act.ts <slug> <act.xhtml>");
  process.exit(1);
}

const xhtml = readFileSync(input, "utf8");
const expected = contentsSections(xhtml);
const before = parseInlineAct(xhtml);
const { filtered, dropped } = stripBodyHeightFootnotes(xhtml);
const after = parseInlineAct(filtered);

console.log(`${slug}: dropped ${dropped.length} body-height footnote line(s) at the page foot`);
console.log(`${slug}: sections ${before.sections.length} → ${after.sections.length}`);

const got = after.sections.map((s) => s.number);
const missing = expected.filter((n) => !got.includes(n));
const extra = got.filter((n) => !expected.includes(n));
console.log(`${slug}: arrangement of sections lists ${expected.length}; parsed ${got.length}`);
if (missing.length) console.log(`  MISSING: ${missing.join(", ")}`);
// Extras are normal: repealed sections are printed in the body but often left
// out of the contents. They are reported, not treated as failures.
if (extra.length) console.log(`  extra (verify each is a repealed section): ${extra.join(", ")}`);

const suspect = after.sections.filter(
  (s) => s.marginalNote.length < 6 || /^(Subs|Ins|Rep|Omitted|The words)\.\s|^(Subs|Ins|Rep)$/.test(s.marginalNote),
);
if (suspect.length) {
  console.log(`  SUSPECT NOTES: ${suspect.map((s) => `§${s.number} "${s.marginalNote}"`).join("; ")}`);
}

// A REPEALED section's body legitimately IS a repeal citation — Prevention of
// Corruption §24 reads "Omitted by the Prevention of Corruption (Amendment)
// Act, 2018 (16 of 2018)…" and §31 "Rep. by the Repealing and Amending Act,
// 2001…". Residue is footnote apparatus embedded in a body that is otherwise
// the Act's text, so a body that OPENS with the citation is not residue.
const REPEAL_BODY = /^\s*\[?\s*(Omitted|Rep\.|Repealed|Rep\b)/i;
const residue = after.sections.filter(
  (s) =>
    !REPEAL_BODY.test(s.bodyMd) &&
    /Subs\. by|Ins\. by|w\.e\.f\.|omitted by Act|, ibid\./.test(s.bodyMd),
);
if (residue.length) {
  console.log(`  FOOTNOTE RESIDUE: ${residue.map((s) => `§${s.number}`).join(", ")}`);
}

if (missing.length > 0 || suspect.length > 0 || residue.length > 0) {
  console.error(`\n${slug}: refusing to write — the parse does not match the Act's own contents.`);
  process.exit(1);
}

const bundlesDir = join(import.meta.dirname, "..", "bundles");
const meta = JSON.parse(readFileSync(join(bundlesDir, `${slug}-meta.json`), "utf8")) as {
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
writeFileSync(join(bundlesDir, `${slug}.json`), `${JSON.stringify(bundle, null, 2)}\n`);
console.log(
  `${slug}: wrote bundle — ${bundle.sections.length} sections, ${after.chapters.length} divisions`,
);
