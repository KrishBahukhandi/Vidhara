/**
 * Parser for NCRB Sankalan comparative tables (the official government
 * concordance between the 2023 codes and the laws they replace):
 *   https://ncrb.gov.in/uploads/SankalanPortal/SectionTable{BNS,BNSS,BSA}.html
 *
 * Table shape: two columns — LEFT = new law (BNS/BNSS/BSA), RIGHT = old law
 * (IPC/CrPC/IEA) — one row per sub-section-level correspondence:
 *   ["103. Punishment for murder. (Change)", "302. Punishment for murder."]
 *   ["1(2)",                                 "New Sub-Section"]
 *   ["Deleted",                              "497. Adultery"]
 *   ["358. Repeal and savings",              "New Section"]
 * Chapter/part headings and wrapped-text rows carry no leading numbers.
 *
 * Output is SECTION-level (sub-sections aggregate to their parent section):
 * pairs plus wholly-omitted old sections and wholly-new new sections, with
 * mapping_type derived from cardinality and the table's own (Change) marks.
 */

export interface MappingEntry {
  /** Old-law section number, null for type "new". */
  oldSection: string | null;
  /** New-law section number, null for type "omitted". */
  newSection: string | null;
  type: "identical" | "renumbered" | "modified" | "merged" | "split" | "omitted" | "new";
  note: string;
}

export interface NcrbParseResult {
  entries: MappingEntry[];
  diagnostics: string[];
}

const CELL_ROW = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
const CELL = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g;
const LEADING_SECTION = /^(\d{1,3}[A-Z]{0,2})\s*[.(]/;
const NEW_MARKER = /^new\s+(sub-)?section/i;
const DELETED_MARKER = /^deleted/i;
const CHANGE_MARKER = /\(change\)/i;

function cellText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&ndash;", "–")
    .replaceAll("&amp;", "&")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function parseNcrbTable(html: string, oldAct: string, newAct: string): NcrbParseResult {
  const diagnostics: string[] = [];

  /** Sub-section-level observations, aggregated to sections. */
  const pairs = new Set<string>(); // "old|new"
  const changedNew = new Set<string>();
  const deletedOld = new Set<string>();
  const newOnlyNew = new Set<string>();
  const pairedNew = new Set<string>();
  const pairedOld = new Set<string>();

  // The document holds TWO redundant concordances: new→old, then a reverse
  // old→new index (header rows flip the column roles). Both are parsed and
  // normalized; identical pairs collapse in the Set.
  let newOnLeft = true;
  let currentNew: string | null = null;
  let currentOld: string | null = null;

  for (const rowMatch of html.matchAll(CELL_ROW)) {
    const cells = [...(rowMatch[1] ?? "").matchAll(CELL)].map((c) => cellText(c[1] ?? ""));
    if (cells.length < 2) continue;
    const left = cells[0] ?? "";
    const right = cells[1] ?? "";

    // Header rows name the acts in both cells ("Bharatiya Nyaya Sanhita, 2023
    // -->" | "Indian Penal Code, 1860 -->"). Note: data cells can ALSO contain
    // "-->" (e.g. "5(a) --> 54., 55."), so the arrow alone is not a header.
    const actName = /(Sanhita|Adhiniyam|Penal Code|Criminal Procedure|Evidence Act),?\s*\d{4}/i;
    if (actName.test(left) && actName.test(right)) {
      newOnLeft = /Sanhita|Adhiniyam/i.test(left);
      currentNew = null;
      currentOld = null;
      continue;
    }
    if (/CHAPTER/i.test(left) || /CHAPTER/i.test(right)) {
      currentNew = null;
      currentOld = null;
      continue;
    }

    const newCell = newOnLeft ? left : right;
    const oldCell = newOnLeft ? right : left;
    const newNum = LEADING_SECTION.exec(newCell)?.[1] ?? null;
    const oldNum = LEADING_SECTION.exec(oldCell)?.[1] ?? null;

    if (newNum) {
      currentNew = newNum;
      if (CHANGE_MARKER.test(newCell)) changedNew.add(newNum);
    }
    if (oldNum) currentOld = oldNum;

    if (DELETED_MARKER.test(newCell)) {
      const o = oldNum ?? currentOld;
      if (o) deletedOld.add(o);
      continue;
    }
    if (NEW_MARKER.test(oldCell)) {
      const n = newNum ?? currentNew;
      if (n) newOnlyNew.add(n);
      continue;
    }

    // A pair requires a number on the OLD side of this row (fresh evidence);
    // the new side may inherit the current section (sub-section rows). The old
    // cell can list SEVERAL sections ("54. Commutation… 55. Commutation…") —
    // capture each "N." that begins the cell or follows a sentence period.
    const effectiveNew = newNum ?? currentNew;
    if (effectiveNew && oldNum) {
      const oldNums = new Set<string>([oldNum]);
      for (const m of oldCell.matchAll(/\.\s+(\d{1,3}[A-Z]{0,2})\.(?=\s)/g)) {
        if (m[1]) oldNums.add(m[1]);
      }
      for (const o of oldNums) {
        pairs.add(`${o}|${effectiveNew}`);
        pairedOld.add(o);
      }
      pairedNew.add(effectiveNew);
    }
  }

  // Cardinality per endpoint (for merged/split classification).
  const oldFanout = new Map<string, number>();
  const newFanin = new Map<string, number>();
  for (const key of pairs) {
    const [o, n] = key.split("|") as [string, string];
    oldFanout.set(o, (oldFanout.get(o) ?? 0) + 1);
    newFanin.set(n, (newFanin.get(n) ?? 0) + 1);
  }

  const entries: MappingEntry[] = [];
  for (const key of [...pairs].sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    return na - nb || a.localeCompare(b);
  })) {
    const [o, n] = key.split("|") as [string, string];
    const split = (oldFanout.get(o) ?? 0) > 1;
    const merged = (newFanin.get(n) ?? 0) > 1;
    const changed = changedNew.has(n);
    let type: MappingEntry["type"];
    if (split) type = "split";
    else if (merged) type = "merged";
    else if (changed) type = "modified";
    else if (o === n) type = "identical";
    else type = "renumbered";

    const parts = [`${oldAct} §${o} → ${newAct} §${n} per the official NCRB Sankalan table.`];
    if (split) parts.push(`${oldAct} §${o} is split across multiple ${newAct} sections.`);
    if (merged) parts.push(`${newAct} §${n} consolidates multiple ${oldAct} sections.`);
    if (changed) parts.push(`Marked "(Change)" — substance modified; compare texts.`);
    entries.push({ oldSection: o, newSection: n, type, note: parts.join(" ") });
  }

  for (const o of [...deletedOld].sort((a, b) => parseInt(a, 10) - parseInt(b, 10))) {
    if (pairedOld.has(o)) {
      diagnostics.push(`old §${o} both paired and deleted — kept as paired`);
      continue;
    }
    entries.push({
      oldSection: o,
      newSection: null,
      type: "omitted",
      note: `${oldAct} §${o} has no counterpart in ${newAct} (omitted) per the official NCRB Sankalan table.`,
    });
  }

  for (const n of [...newOnlyNew].sort((a, b) => parseInt(a, 10) - parseInt(b, 10))) {
    if (pairedNew.has(n)) continue; // section exists via pairs; the "new" was sub-section-level
    entries.push({
      oldSection: null,
      newSection: n,
      type: "new",
      note: `${newAct} §${n} is a new provision with no ${oldAct} antecedent per the official NCRB Sankalan table.`,
    });
  }

  if (entries.length < 50) diagnostics.push(`suspiciously few entries: ${entries.length}`);
  return { entries, diagnostics };
}
