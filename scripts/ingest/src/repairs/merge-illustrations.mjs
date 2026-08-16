/**
 * Merge the D-067 illustration restorations into the committed bundles.
 *
 * SURGICAL, not wholesale. The bundles carry curated repairs the parser does
 * not reproduce (D-017's heading strips, D-025's repeal citations, D-063's
 * trailing cross-headings, D-066's cuts), so replacing a whole act from a
 * fresh parse would silently discard them — the trap D-037 and D-054 both
 * avoided by merging structure only.
 *
 * Two cases per changed section:
 *   · bundle body == old parse  → no curation here, take the new parse.
 *   · bundle body != old parse  → curated. Apply only the DELTA, and only if
 *     that delta is a pure suffix of the old parse, so the curation is
 *     untouched. Anything else refuses.
 *
 * Usage: node merge-illustrations.mjs [--write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = "/Users/krish/Documents/Bahukhandi-labs-projects/NexLex/scripts/ingest";
const WRITE = process.argv.includes("--write");
const ACTS = ["ipc", "ica", "tp", "ni", "isa", "cpc", "crpc"];

let applied = 0;
let refused = 0;

for (const slug of ACTS) {
  const oldP = JSON.parse(readFileSync(path.join(ROOT, ".sources", `${slug}-old.json`), "utf8"));
  const newP = JSON.parse(readFileSync(path.join(ROOT, ".sources", `${slug}-new.json`), "utf8"));
  const bundlePath = path.join(ROOT, "bundles", `${slug}.json`);
  const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));

  const oldBy = new Map(oldP.sections.map((s) => [s.number, s.bodyMd]));
  const newBy = new Map(newP.sections.map((s) => [s.number, s.bodyMd]));
  let touched = false;

  for (const sec of bundle.sections) {
    const ob = oldBy.get(sec.number);
    const nb = newBy.get(sec.number);
    if (ob === undefined || nb === undefined || ob === nb) continue;

    if (sec.bodyMd === ob) {
      console.log(`  ${slug} §${sec.number}: clean → new parse (${ob.length} → ${nb.length})`);
      sec.bodyMd = nb;
      touched = true;
      applied++;
      continue;
    }

    // Curated. Only a pure-suffix addition can be transplanted safely.
    if (nb.startsWith(ob)) {
      const delta = nb.slice(ob.length);
      console.log(
        `  ${slug} §${sec.number}: CURATED → append delta (+${delta.length}) ${JSON.stringify(delta.slice(0, 60))}`,
      );
      sec.bodyMd = sec.bodyMd + delta;
      touched = true;
      applied++;
      continue;
    }

    console.log(
      `  REFUSE ${slug} §${sec.number}: curated body and the change is not a pure suffix — needs a human`,
    );
    refused++;
  }

  if (touched && WRITE) {
    writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);
    console.log(`   ✎ wrote ${slug}.json`);
  }
}

console.log(`\n${WRITE ? "APPLIED" : "DRY RUN"}: ${applied} merged, ${refused} refused.`);
if (refused > 0) process.exitCode = 1;
