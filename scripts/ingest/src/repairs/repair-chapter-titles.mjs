/**
 * Merge the D-074 chapter-title repairs into the committed bundles.
 *
 * SURGICAL, like merge-illustrations.mjs and for the same reason: the bundles
 * carry curated fixes the parser does not reproduce, so a wholesale replacement
 * would silently discard them (the trap D-037 and D-054 both avoided).
 *
 * Three kinds of change, each with its own gate:
 *
 *  · TITLE. Accepted only when the repair leaves the title's LETTERS unchanged
 *    — a pure re-spacing — or when the bundle's title is the shredded drop-cap
 *    form whose letters are a subsequence of the repair (IPC Chapter VII, held
 *    as "O O R A, N A F"). Anything else refuses: a title whose words changed
 *    is not a spacing repair and wants a human.
 *
 *  · A CHAPTER THE PARSE NOW FINDS. The NI Act's Chapter V was invisible while
 *    its heading was letter-spaced, so its eighteen sections were filed under
 *    Chapter IV. Added with the fresh parse's sort order.
 *
 *  · A SECTION'S CHAPTER. Applied only where the bundle agrees with the OLD
 *    parse — i.e. nobody curated that assignment by hand — and only when the
 *    section's own text is untouched by this change.
 *
 * Usage: node repair-chapter-titles.mjs [--write]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const WRITE = process.argv.includes("--write");
const OLD = JSON.parse(readFileSync("/tmp/snap-old.json", "utf8"));
const NEW = JSON.parse(readFileSync(process.env.SNAP_NEW ?? "/tmp/snap-new.json", "utf8"));
/**
 * Acts whose SOURCE was re-fetched, so there is no old parse to compare the
 * bundle against and the "did a human curate this?" gate cannot run. Their
 * division list is rebuilt from the fresh parse instead — titles and section
 * assignment only. Section TEXT is never touched here, which matters for the
 * IT Act specifically: India Code now serves a stamped rendering whose
 * footnotes leak into 19 bodies, so the fresh parse is a better witness for
 * headings and a worse one for text. Every rebuilt title is printed for review.
 */
const REBUILD = new Set((process.env.REBUILD_CHAPTERS ?? "").split(",").filter(Boolean));

const letters = (s) => (s ?? "").replace(/[^A-Za-z]/g, "").toUpperCase();
/** Everything but the spaces. Two titles equal here differ ONLY in spacing, so
 * a repair between them cannot change a word, a hyphen or a stop. */
const unspaced = (s) => (s ?? "").replace(/\s+/g, "");
/** A lone letter that is not the word "A" or "I" — the mark of a title the
 * height filter or the tracking shredded. */
const shreddedTokens = (s) =>
  (s ?? "").split(/\s+/).filter((t) => /^[A-Za-z]$/.test(t) && !/^[AI]$/i.test(t)).length;
const tokenCount = (s) => (s ?? "").split(/\s+/).filter(Boolean).length;
/** Is `short` what the height filter left of `full`? Every letter of `short`,
 * in order, drawn from `full` — the drop caps of a shredded small-caps title. */
const isShreddedForm = (short, full) => {
  let i = 0;
  for (const ch of full) if (i < short.length && short[i] === ch) i++;
  return i === short.length && short.length < full.length;
};
// Bundles written before `kind` existed carry chapters without it; they are
// all chapters, which is what the field defaults to everywhere else.
const key = (c) => `${c.kind ?? "chapter"}|${c.number}|${c.partNumber ?? ""}`;

let titlesFixed = 0, chaptersAdded = 0, sectionsRefiled = 0, refused = 0;

for (const slug of Object.keys(NEW)) {
  const bundlePath = path.join(ROOT, "bundles", `${slug}.json`);
  let bundle;
  try {
    bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
  } catch {
    console.log(`${slug}: no bundle, skipped`);
    continue;
  }
  const fresh = NEW[slug];
  const before = OLD[slug];

  if (REBUILD.has(slug)) {
    const freshByNumber = new Map(fresh.sections.map((x) => [x.number, x.chapterNumber ?? ""]));
    let refiled = 0;
    for (const section of bundle.sections) {
      const now = freshByNumber.get(section.number);
      if (now === undefined || now === (section.chapterNumber ?? "")) continue;
      console.log(`${slug} s.${section.number}: chapter "${section.chapterNumber ?? ""}" -> "${now}"`);
      section.chapterNumber = now;
      refiled++;
    }
    console.log(`${slug} REBUILDS its ${fresh.chapters.length} divisions from the re-fetched source:`);
    for (const c of fresh.chapters) console.log(`    ${c.kind} ${String(c.number).padEnd(8)} ${c.title}`);
    bundle.chapters = fresh.chapters.map((c) => ({
      number: c.number,
      title: c.title,
      sortOrder: c.sortOrder,
      kind: c.kind,
      ...(c.partNumber ? { partNumber: c.partNumber } : {}),
    }));
    sectionsRefiled += refiled;
    titlesFixed += fresh.chapters.length;
    if (WRITE) writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);
    continue;
  }

  if (!before) {
    console.log(`${slug}: no baseline parse — skipped (pass REBUILD_CHAPTERS=${slug} to rebuild)`);
    continue;
  }
  const freshByKey = new Map(fresh.chapters.map((c) => [key(c), c]));
  const bundleByKey = new Map(bundle.chapters.map((c) => [key(c), c]));

  // 1. titles
  for (const [k, chapter] of bundleByKey) {
    const repaired = freshByKey.get(k);
    if (!repaired || repaired.title === chapter.title) continue;
    const a = letters(chapter.title);
    const b = letters(repaired.title);
    // The bundle may already hold a curated, correct title, and a fresh parse
    // is not automatically better than a human's: CrPC Chapter XVIII reads
    // "TRIAL BEFORE A COURT OF SESSION" in the bundle and "ACOURT" from the
    // parse. So a repair must both leave everything-but-the-spaces alone AND
    // be repairing something — a shredded title, or one this parse can
    // separate further. Otherwise the bundle wins.
    const sameButForSpaces = unspaced(chapter.title) === unspaced(repaired.title);
    const bundleIsShredded = shreddedTokens(chapter.title) > 0;
    const separatesFurther = tokenCount(repaired.title) > tokenCount(chapter.title);
    const isRepair = bundleIsShredded || separatesFurther;
    if ((sameButForSpaces && isRepair) || isShreddedForm(a, b)) {
      console.log(`${slug} ${chapter.kind} ${chapter.number}\n    - ${chapter.title}\n    + ${repaired.title}`);
      chapter.title = repaired.title;
      chapter.sortOrder = repaired.sortOrder;
      titlesFixed++;
    } else {
      console.log(`${slug} ${chapter.kind} ${chapter.number}: REFUSED (words differ)\n    - ${chapter.title}\n    + ${repaired.title}`);
      refused++;
    }
  }

  // 2. section→chapter, only where nobody curated it
  const refiledInto = new Set();
  const oldSection = new Map(before.sections.map((s) => [s.number, s]));
  const newSection = new Map(fresh.sections.map((s) => [s.number, s]));
  for (const section of bundle.sections) {
    const was = oldSection.get(section.number);
    const now = newSection.get(section.number);
    if (!was || !now) continue;
    const bundleChapter = section.chapterNumber ?? "";
    if (now.chapterNumber === bundleChapter) continue;
    if (was.chapterNumber !== bundleChapter) {
      console.log(`${slug} s.${section.number}: REFUSED refile (bundle curated: "${bundleChapter}" vs parse "${was.chapterNumber}")`);
      refused++;
      continue;
    }
    if (was.bodyMd !== now.bodyMd) {
      console.log(`${slug} s.${section.number}: REFUSED refile (text also changed)`);
      refused++;
      continue;
    }
    section.chapterNumber = now.chapterNumber;
    refiledInto.add(now.chapterNumber);
    sectionsRefiled++;
  }

  // 3. A chapter the parse now finds is worth adding only once sections have
  //    actually moved into it. CrPC VIIA and XXIA exist in the parse but the
  //    bundle deliberately files their sections under VII and XXI, so adding
  //    them would have left two empty divisions in the library.
  for (const [k, chapter] of freshByKey) {
    if (bundleByKey.has(k)) continue;
    if (!refiledInto.has(chapter.number)) {
      console.log(`${slug} skips ${chapter.kind} ${chapter.number} — no section moved into it`);
      continue;
    }
    console.log(`${slug} ADDS ${chapter.kind} ${chapter.number} — "${chapter.title}"`);
    bundle.chapters.push({
      number: chapter.number,
      title: chapter.title,
      sortOrder: chapter.sortOrder,
      kind: chapter.kind,
      ...(chapter.partNumber ? { partNumber: chapter.partNumber } : {}),
    });
    chaptersAdded++;
  }
  bundle.chapters.sort((x, y) => x.sortOrder - y.sortOrder);
  bundle.chapters.forEach((c, i) => { c.sortOrder = i + 1; });

  if (WRITE) writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);
}

console.log(
  `\ntitles repaired: ${titlesFixed}   chapters added: ${chaptersAdded}   ` +
  `sections refiled: ${sectionsRefiled}   refused: ${refused}`,
);
console.log(WRITE ? "bundles written." : "dry run — pass --write to apply.");
