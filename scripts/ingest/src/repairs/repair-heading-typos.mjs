/**
 * Two heading corrections the automated rules refuse, applied by hand and cited.
 *
 * D-074's cross-printing rule keys candidate renderings on their LETTERS, so it
 * can move a space and can never change a word. That property is worth keeping,
 * so neither of these is fixed by loosening it. They are recorded here instead,
 * one entry each, with the evidence and the exact expected before-value — the
 * script refuses if the bundle does not still hold what was measured, so it
 * cannot silently overwrite a later correction.
 *
 * Both are JUDGEMENTS, not mechanical repairs. They are listed in the decision
 * log and in each bundle's provenance so they can be reversed by reading this
 * file, not by re-deriving the reasoning.
 *
 * Usage: node repair-heading-typos.mjs [--write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const WRITE = process.argv.includes("--write");

const CORRECTIONS = [
  {
    slug: "ita",
    kind: "chapter",
    number: "V",
    from: "SECURE ELECTRONIC RECORDS ANS SECURE ELECTRONIC SIGNATURE",
    to: "SECURE ELECTRONIC RECORDS AND SECURE ELECTRONIC SIGNATURE",
    why:
      "The same PDF prints this heading twice and they disagree: the Arrangement " +
      "of Sections (p.1) reads 'RECORDS AND SECURE', the body heading (p.12) " +
      "reads 'RECORDS ANS SECURE'. Both are the official text; one is a misprint, " +
      "and ANS is not a word. Taking the contents-page reading.",
  },
  {
    slug: "ipc",
    kind: "chapter",
    number: "XIV",
    from:
      "OF OFFENCES AFFECTING THE PUBLIC HEALTH, SAFETY, CONVENIENCE, DECENCYAND MORALS",
    to:
      "OF OFFENCES AFFECTING THE PUBLIC HEALTH, SAFETY, CONVENIENCE, DECENCY AND MORALS",
    why:
      "BOTH printings fuse these two words, so D-074's cross-printing rule has " +
      "no second witness — and this is a defect of the PRINT, not of the " +
      "extraction: fitting per-glyph advance widths over the act's 105 distinct " +
      "small-cap tokens predicts DECENCYAND's box to within 0.6pt, while a real " +
      "inter-word space on that line measures 2.75pt. The same fit shows every " +
      "other fused heading in this act (GAINSTTHE, ONTEMPTSOF, OINAND …) is " +
      "fused in the print too; those eleven were separated from the contents " +
      "page, which sets them properly. This one is the same defect with no " +
      "parallel copy to cite, so the evidence is the line itself: it is a " +
      "comma-list whose every other member is a standalone noun (HEALTH, " +
      "SAFETY, CONVENIENCE, … MORALS), which makes DECENCYAND the penultimate " +
      "member fused to the list's conjunction.",
  },
];

let applied = 0;
let refused = 0;
const touched = new Set();

for (const fix of CORRECTIONS) {
  const bundlePath = path.join(ROOT, "bundles", `${fix.slug}.json`);
  const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
  const division = bundle.chapters.find(
    (c) => (c.kind ?? "chapter") === fix.kind && c.number === fix.number,
  );
  if (!division) {
    console.log(`${fix.slug} ${fix.kind} ${fix.number}: NOT FOUND — refused`);
    refused++;
    continue;
  }
  if (division.title === fix.to) {
    console.log(`${fix.slug} ${fix.kind} ${fix.number}: already corrected`);
    continue;
  }
  if (division.title !== fix.from) {
    console.log(
      `${fix.slug} ${fix.kind} ${fix.number}: REFUSED — bundle holds\n` +
        `    "${division.title}"\n  but this correction was measured against\n    "${fix.from}"`,
    );
    refused++;
    continue;
  }
  console.log(`${fix.slug} ${fix.kind} ${fix.number}\n  - ${fix.from}\n  + ${fix.to}\n  ${fix.why}\n`);
  division.title = fix.to;
  applied++;
  touched.add(fix.slug);
  if (WRITE) writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);
}

console.log(`applied: ${applied}   refused: ${refused}`);
console.log(WRITE ? `written: ${[...touched].join(", ") || "nothing"}` : "dry run — pass --write to apply.");
