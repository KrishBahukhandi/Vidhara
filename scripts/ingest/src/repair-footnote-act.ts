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

const [slug, input, ...flags] = process.argv.slice(2);
if (!slug || !input) {
  console.error(
    "Usage: tsx src/repair-footnote-act.ts <slug> <act.xhtml> [--rule-delimited] " +
      "[--page-foot 0.65] [--accept-residue 1,60] [--min-body-height 7.7] [--min-word-height 6]",
  );
  process.exit(1);
}
/** The PDF draws rules around its footnote blocks (Indian Succession). */
const ruleDelimited = flags.includes("--rule-delimited");
/**
 * Where the footnote block may begin, as a fraction of page height.
 *
 * 0.77 fits most prints. The CPC needs 0.65: its page 56 opens a block at 0.675
 * and left §60 (property liable to attachment) carrying two amendment notes
 * mid-body. Swept from 0.77 down to 0.50 the act holds at 171 sections with no
 * section missing from its own arrangement, and the parse stops changing below
 * 0.65 — so that is the loosest setting that buys anything and the tightest
 * that buys all of it.
 */
/**
 * Sections whose footnote residue is KNOWN, inspected, and accepted.
 *
 * The gate below refuses to write a bundle that still carries amendment
 * apparatus in a body, and that refusal is the point — it is what makes a
 * filter this aggressive safe to run. But a blanket refusal on one irreducible
 * section also means shipping the twelve the run does fix, which is the worse
 * trade.
 *
 * The one entry this exists for is CPC §1. Its extent footnote runs from 0.43
 * to 0.90 of page 34 and opens "1. This Act has been amended in its application
 * to Assam by Assam Acts 2 of 1941 and 3 of 1953" — footnote-shaped to a reader
 * but carrying none of the amendment verbs FOOTNOTE keys on ("by Assam Acts",
 * not "by Act"), so nothing arms the latch and no page-foot threshold from 0.77
 * down to 0.50 reaches it. Widening the verb list, or reading the page's body
 * size as the tallest well-represented class rather than the modal one, both
 * work here and both put every chapter-opener page in the corpus at risk of
 * having its body read as heading type. Not worth one section.
 *
 * Named per run rather than stored, so an accepted defect stays visible in the
 * command that produced the bundle instead of becoming invisible.
 */
/**
 * Smallest word height that counts as body type, for a print set below 8.6.
 *
 * The 2026 Constitution alone needs it here: 8.96pt body on some pages, 8.10pt
 * on others, footnotes 7.24pt throughout. See InlineParseOptions.minBodyHeight.
 */
const floorFlag = flags.indexOf("--min-body-height");
const minBodyHeight = floorFlag >= 0 ? Number(flags[floorFlag + 1]) : undefined;
if (floorFlag >= 0 && !(minBodyHeight! > 0 && minBodyHeight! < 20)) {
  console.error("--min-body-height takes a point size, e.g. 7.7");
  process.exit(1);
}

/** Smallest word height that is text at all — see InlineParseOptions. */
const wordFlag = flags.indexOf("--min-word-height");
const minWordHeight = wordFlag >= 0 ? Number(flags[wordFlag + 1]) : undefined;
if (wordFlag >= 0 && !(minWordHeight! > 0 && minWordHeight! < 20)) {
  console.error("--min-word-height takes a point size, e.g. 6");
  process.exit(1);
}

const acceptFlag = flags.indexOf("--accept-residue");
const accepted = acceptFlag >= 0 ? (flags[acceptFlag + 1] ?? "").split(",").filter(Boolean) : [];

const pageFootFlag = flags.indexOf("--page-foot");
const pageFoot = pageFootFlag >= 0 ? Number(flags[pageFootFlag + 1]) : undefined;
if (pageFootFlag >= 0 && !(pageFoot! > 0 && pageFoot! < 1)) {
  console.error("--page-foot takes a fraction of page height, e.g. 0.65");
  process.exit(1);
}

const xhtml = readFileSync(input, "utf8");
const expected = contentsSections(xhtml);
const before = parseInlineAct(xhtml, { minBodyHeight, minWordHeight });
const { filtered, dropped } = stripBodyHeightFootnotes(xhtml, { ruleDelimited, pageFoot, minBodyHeight });
const after = parseInlineAct(filtered, { minBodyHeight, minWordHeight });

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

// Length alone is a poor test: "Costs", "Notice", "Sale" and "Decree" are all
// real marginal notes in the CPC, and flagging CPC §35 ("Costs") failed a parse
// that was correct. The footnote-fragment shapes are caught by the alternation
// beside it, which is what actually matters — "Subs", "Ins" and "Rep" are
// matched there whole.
const suspect = after.sections.filter(
  (s) => s.marginalNote.length < 4 || /^(Subs|Ins|Rep|Omitted|The words)\.\s|^(Subs|Ins|Rep)$/.test(s.marginalNote),
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
const unexpected = residue.filter((s) => !accepted.includes(s.number));
if (residue.length) {
  console.log(
    `  FOOTNOTE RESIDUE: ${residue.map((s) => `§${s.number}${accepted.includes(s.number) ? " (accepted)" : ""}`).join(", ")}`,
  );
}
const staleAccepts = accepted.filter((n) => !residue.some((s) => s.number === n));
if (staleAccepts.length) {
  // An accept that no longer matches anything is a claim about the parse that
  // has stopped being true; it must not sit in a command line unnoticed.
  console.error(`\n${slug}: --accept-residue names ${staleAccepts.join(", ")}, which have no residue. Drop them.`);
  process.exit(1);
}

if (missing.length > 0 || suspect.length > 0 || unexpected.length > 0) {
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
