/**
 * Corpus content-QA scanner (content trust is the moat — D-011: corrections are
 * Sev-0). Reads every PUBLISHED section from the live DB (anon-readable) and
 * flags the defect classes we've actually hit before, plus new ones:
 *
 *   SEV1 (wrong/missing content — fix before users see it)
 *     empty-body            body_plain missing or whitespace
 *     bare-illustration     ends at an "Illustration(s)" marker with no examples (D-018)
 *     leaked-heading        a next-section heading glued to the end of the body (D-017)
 *     mojibake              encoding damage (double-encoded UTF-8, BOM, replacement char)
 *     control-chars         stray control characters
 *   SEV2 (suspicious — eyeball a sample)
 *     very-short            implausibly short body for a real provision
 *     no-terminator         body doesn't end in . ; : ) ] " or a digit
 *     unbalanced-brackets   ( [ counts don't match
 *     dropcap-note          marginal note with drop-cap artifacts ("A RREST") (D-015)
 *     dup-body              identical opening text to another section of the same act
 *   INFO
 *     numbering-gap         a run of missing section numbers inside an act
 *
 * Usage (from repo root):
 *   SUPABASE_URL=… SUPABASE_ANON_KEY=… pnpm --filter @nexlex/ingest content-qa
 *   …add --samples=5 to print more examples per finding.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SAMPLES = Number(
  process.argv.find((a) => a.startsWith("--samples="))?.split("=")[1] ?? "3",
);

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY (publishable) in the environment.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

interface Section {
  id: string;
  number: string;
  marginal_note: string;
  body_plain: string;
  sort_key: string;
  acts: { abbreviation: string; slug: string };
}

type Sev = "SEV1" | "SEV2" | "INFO";
interface Finding {
  code: string;
  sev: Sev;
  ref: string;
  detail: string;
}

/**
 * Page through every published section (Supabase caps a request at 1000).
 * Ordered by `id` because it is UNIQUE — `sort_key` has heavy ties (770 distinct
 * values across 3,118 rows), and paginating on a non-unique key silently
 * duplicates and skips rows between pages.
 */
async function fetchAll(): Promise<Section[]> {
  const all: Section[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("act_sections")
      .select("id, number, marginal_note, body_plain, sort_key, acts!inner(abbreviation, slug)")
      .eq("review_status", "published")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Section[];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

/** Double-encoded UTF-8 (Ã + continuation byte), stray BOM, or U+FFFD. */
const MOJIBAKE = /Ã[-¿]|â€|﻿|�/;
/** Control characters (tab/newline/carriage-return are legitimate). */
const CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;
/**
 * "Illustration(s)" standing alone as a HEADING at the end (D-018) — i.e. the
 * examples were dropped. Must not match prose that merely ends with the word
 * (e.g. IEA §21: "…stated in the last preceding illustration."), so the marker
 * has to start its own line/sentence.
 */
const BARE_ILLUSTRATION = /(?:^|\n|\.\s)\s*illustrations?\s*[:.\-—]?\s*$/i;
/**
 * A repeal/omission note split across marginal_note and body at the wrong point:
 * the note ends mid-citation ("… Rep", "… Act, 1975, s") and the body carries
 * the remainder (starts with the section number, e.g. "65, ibid.").
 */
const SPLIT_REPEAL_NOTE = /\b(?:Rep|Omitted|omitted)\b[^.]{0,80}?[,.]?\s*(?:by)?\s*s?$|,\s*s$/;
const BODY_IS_CITATION_TAIL = /^\s*(?:by\s+s\.?\s*)?\d+[A-Za-z]?\s*(?:,|\(|and\b|ibid|\.)/;
/** Words glued together — spaces lost during extraction ("Transferofownership…"). */
const SPACE_LOSS = /[a-z]{18,}/;
/** A group/part heading glued to the end of a body (D-017 family). */
const LEAKED_HEADING =
  /(?:\.\s*)(?:Of\s+[A-Z][^.]{6,80}|[A-Z]\.—[^.]{4,80}|\[?(?:CHAPTER|PART)\s+[IVXLC0-9][^.]{0,60}\]?)\s*$/;
/** Drop-cap damage in a heading: a lone capital then a capitalised run ("A RREST"). */
const DROPCAP = /\b[A-Z]\s[A-Z]{2,}/;

function analyse(sections: Section[]): Finding[] {
  const findings: Finding[] = [];
  const bodiesByAct = new Map<string, Map<string, string>>();

  for (const s of sections) {
    const act = s.acts?.abbreviation ?? "?";
    const ref = `${act} §${s.number}`;
    const body = (s.body_plain ?? "").trim();
    const note = (s.marginal_note ?? "").trim();

    if (!body) {
      findings.push({ code: "empty-body", sev: "SEV1", ref, detail: "no body text" });
      continue;
    }
    if (MOJIBAKE.test(body) || MOJIBAKE.test(note)) {
      findings.push({ code: "mojibake", sev: "SEV1", ref, detail: "encoding damage" });
    }
    if (CONTROL.test(body)) {
      findings.push({ code: "control-chars", sev: "SEV1", ref, detail: "control characters" });
    }
    if (BARE_ILLUSTRATION.test(body)) {
      findings.push({
        code: "bare-illustration",
        sev: "SEV1",
        ref,
        detail: `ends at "${body.slice(-40).replace(/\s+/g, " ")}"`,
      });
    }
    if (LEAKED_HEADING.test(body)) {
      findings.push({
        code: "leaked-heading",
        sev: "SEV1",
        ref,
        detail: `tail: "${body.slice(-70).replace(/\s+/g, " ")}"`,
      });
    }
    // A repealed/omitted section legitimately has a one-line citation body.
    // No \b after "Rep\." — a period is not a word character, so the boundary
    // could never match and all 61 "Rep. by s. 65, ibid." bodies were reported
    // as suspiciously short. The exclusion only ever worked for "Omitted".
    const isRepealCitation = /^\s*\[?\s*(?:Rep\.|Repealed|Omitted)/i.test(body);
    if (body.length < 40 && !isRepealCitation) {
      findings.push({
        code: "very-short",
        sev: "SEV2",
        ref,
        detail: `${body.length} chars: "${body}"`,
      });
    }
    // Typographic quotes close a sentence as surely as straight ones, and an
    // asterisk run is the print's own mark for elided text ("*** omitted").
    // Between them these accounted for 27 of the reports.
    if (!/[.;:)\]"'\u201d\u2019\d]$|\*+$/.test(body)) {
      findings.push({
        code: "no-terminator",
        sev: "SEV2",
        ref,
        detail: `ends "${body.slice(-45).replace(/\s+/g, " ")}"`,
      });
    }
    const open = (body.match(/\(/g) ?? []).length;
    const close = (body.match(/\)/g) ?? []).length;
    if (Math.abs(open - close) > 1) {
      findings.push({
        code: "unbalanced-brackets",
        sev: "SEV2",
        ref,
        detail: `${open} "(" vs ${close} ")"`,
      });
    }
    if (note && DROPCAP.test(note)) {
      findings.push({ code: "dropcap-note", sev: "SEV2", ref, detail: `note: "${note}"` });
    }
    // Repeal citation split across note/body at the wrong point.
    if (note && SPLIT_REPEAL_NOTE.test(note) && BODY_IS_CITATION_TAIL.test(body)) {
      findings.push({
        code: "split-repeal-note",
        sev: "SEV1",
        ref,
        detail: `note ends "…${note.slice(-28)}" + body "${body.slice(0, 28)}"`,
      });
    }
    if (note && SPACE_LOSS.test(note)) {
      findings.push({
        code: "note-space-loss",
        sev: "SEV1",
        ref,
        detail: `note: "${note.slice(0, 70)}"`,
      });
    }

    // duplicate opening text within the same act (possible copy/parse error)
    const key = body.slice(0, 300);
    let seen = bodiesByAct.get(act);
    if (!seen) {
      seen = new Map();
      bodiesByAct.set(act, seen);
    }
    const prev = seen.get(key);
    // Two sections repealed by the same Act carry the same citation word for
    // word — IPC §§490/492 and Limitation §§28/32 are duplicates by nature, not
    // by defect.
    const bothRepeals = /^\s*\[?\s*(?:Rep\.|Repealed|Omitted)/i.test(body);
    if (prev && body.length > 80 && !bothRepeals) {
      findings.push({
        code: "dup-body",
        sev: "SEV2",
        ref,
        detail: `same opening text as ${act} §${prev}`,
      });
    } else if (!prev) {
      seen.set(key, s.number);
    }
  }

  // numbering gaps: consecutive purely-numeric sections within an act
  const byAct = new Map<string, number[]>();
  for (const s of sections) {
    if (!/^\d+$/.test(s.number)) continue;
    const act = s.acts?.abbreviation ?? "?";
    if (!byAct.has(act)) byAct.set(act, []);
    byAct.get(act)!.push(Number(s.number));
  }
  for (const [act, nums] of byAct) {
    const sorted = [...new Set(nums)].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      const gap = (sorted[i] ?? 0) - (sorted[i - 1] ?? 0);
      if (gap > 3) {
        findings.push({
          code: "numbering-gap",
          sev: "INFO",
          ref: `${act} §${sorted[i - 1]}→§${sorted[i]}`,
          detail: `${gap - 1} numbers absent`,
        });
      }
    }
  }

  return findings;
}

async function main() {
  console.log("Fetching published sections…");
  const sections = await fetchAll();
  console.log(`Scanned ${sections.length} published sections.\n`);

  const findings = analyse(sections);
  const byCode = new Map<string, Finding[]>();
  for (const f of findings) {
    if (!byCode.has(f.code)) byCode.set(f.code, []);
    byCode.get(f.code)!.push(f);
  }

  const order: Sev[] = ["SEV1", "SEV2", "INFO"];
  let sev1 = 0;
  for (const sev of order) {
    const codes = [...byCode.entries()].filter(([, v]) => v[0]?.sev === sev);
    if (codes.length === 0) continue;
    console.log(`${"─".repeat(70)}\n${sev}`);
    for (const [code, list] of codes.sort((a, b) => b[1].length - a[1].length)) {
      if (sev === "SEV1") sev1 += list.length;
      console.log(`\n  ${code} — ${list.length}`);
      for (const f of list.slice(0, SAMPLES)) console.log(`    ${f.ref}: ${f.detail}`);
      if (list.length > SAMPLES) console.log(`    …and ${list.length - SAMPLES} more`);
    }
    console.log();
  }

  console.log("─".repeat(70));
  console.log(
    `\nTotals: ${sev1} SEV1, ` +
      `${findings.filter((f) => f.sev === "SEV2").length} SEV2, ` +
      `${findings.filter((f) => f.sev === "INFO").length} INFO.`,
  );
  if (sev1 === 0) console.log("No SEV1 content defects. \u{1F389}");
  process.exit(sev1 > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
