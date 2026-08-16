/**
 * Category-A repair: text that is NOT the provision, appended to the end of a
 * body — cross-headings, stacked chapter markers, footnote apparatus, and in
 * one case the whole First Schedule.
 *
 * Every repair is a CUT, never a write. Each entry names the exact string where
 * the non-statute text begins; the script keeps everything before it and drops
 * the rest. Nothing is composed, inferred or recalled — D-011/ADR-6, and D-031
 * is the entry recording what happened the one time statute text came from
 * memory instead of the source.
 *
 * Each cut is anchored on a marker that must appear EXACTLY ONCE. If it appears
 * zero times the section is already repaired (idempotent re-run) or has changed
 * shape; if more than once the anchor is ambiguous. Both refuse.
 *
 * Usage: node repair-category-a.mjs [--write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const BUNDLES = "/Users/krish/Documents/Bahukhandi-labs-projects/NexLex/scripts/ingest/bundles";
const WRITE = process.argv.includes("--write");

/** slug → [ [sectionNumber, cutAtMarker, why] ] */
const REPAIRS = {
  pocso: [
    ["4", " B.—A", "next sub-part's heading marker"],
    ["10", " E.—S", "next sub-part's heading marker"],
  ],
  cpc: [
    // Cutting at the cross-heading alone left the whole footnote block behind
    // ("1. Explanation ins. by Act 104 of 1976 …"), which is apparatus, not the
    // provision. The section itself ends at sub-section (3).
    [
      "67",
      " 1. Explanation ins. by Act 104 of 1976",
      "footnote block + a drop-cap-split cross-heading for the next section",
    ],
  ],
  crpc: [
    ["327", " for “Magistrate” (w.e.f. 18-12-1978).", "footnote apparatus"],
    ["484", "THE FIRST SCHEDULE", "the entire First Schedule, absorbed into Repeal and savings"],
  ],
  gca: [
    ["20", " “Act “on", "stray fragment"],
    ["30A", " “Act", "stray fragment"],
  ],
  ndps: [["2", " 1. Ins. by Act 2 of 1989", "footnote apparatus"]],
  part: [["58", " 1. The words “the Crown", "footnote apparatus"]],
  tp: [["121", " . words “with the previous sanction", "footnote apparatus"]],
};

let changed = 0;
let refused = 0;

for (const [slug, items] of Object.entries(REPAIRS)) {
  const file = path.join(BUNDLES, `${slug}.json`);
  const bundle = JSON.parse(readFileSync(file, "utf8"));
  let touched = false;

  for (const [number, marker, why] of items) {
    const sec = bundle.sections.find((s) => s.number === number);
    if (!sec) {
      console.log(`REFUSE ${slug} §${number}: section not in bundle`);
      refused++;
      continue;
    }
    const body = sec.bodyMd ?? "";
    const occurrences = body.split(marker).length - 1;
    if (occurrences === 0) {
      console.log(`SKIP   ${slug} §${number}: marker absent (already repaired?)`);
      continue;
    }
    if (occurrences > 1) {
      console.log(`REFUSE ${slug} §${number}: marker appears ${occurrences}× — ambiguous`);
      refused++;
      continue;
    }
    const cut = body.indexOf(marker);
    const kept = body.slice(0, cut).trimEnd();
    const dropped = body.slice(cut);

    // A cut that removes most of a body, or leaves a body that no longer ends
    // like a sentence, is a cut that has probably found the wrong boundary.
    if (kept.length < body.length * 0.3) {
      console.log(`REFUSE ${slug} §${number}: would drop ${Math.round((1 - kept.length / body.length) * 100)}% of the body`);
      refused++;
      continue;
    }
    if (!/[.;:?!”’")\]*]$/.test(kept)) {
      console.log(`REFUSE ${slug} §${number}: remainder would not end like a sentence → ${JSON.stringify(kept.slice(-60))}`);
      refused++;
      continue;
    }

    console.log(`\n── ${slug} §${number} — ${why}`);
    console.log(`   keep  …${JSON.stringify(kept.slice(-70))}`);
    console.log(`   drop  ${JSON.stringify(dropped.slice(0, 110))}${dropped.length > 110 ? "…" : ""}`);
    console.log(`   ${body.length} → ${kept.length} chars (−${body.length - kept.length})`);

    sec.bodyMd = kept;
    touched = true;
    changed++;
  }

  if (touched && WRITE) {
    writeFileSync(file, `${JSON.stringify(bundle, null, 2)}\n`);
    console.log(`\n   ✎ wrote ${slug}.json`);
  }
}

console.log(`\n${WRITE ? "APPLIED" : "DRY RUN"}: ${changed} repaired, ${refused} refused.`);
if (refused > 0) process.exitCode = 1;
