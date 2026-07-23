/**
 * AI "Explain this section" eval harness (decision D-004).
 *
 * Wrong legal answers are trust-fatal, so the explainer is reviewed on a spread
 * of real sections BEFORE it's relied on. This script pulls a handful of
 * published sections per act (anon-readable), calls the deployed
 * explain-section function for each, and prints the section text beside its
 * explanation so a human can judge grounding + accuracy. It also runs cheap
 * red-flag scans (invented cross-references, advice phrasing) and prints ⚠️
 * hints — hints, not proof; the human read is the real gate.
 *
 * Usage (from repo root):
 *   SUPABASE_URL=… SUPABASE_ANON_KEY=… pnpm --filter @nexlex/ingest ai-eval
 * The GEMINI_API_KEY must already be set on the Edge Function or every call
 * returns the "being set up" 503 (which this script reports as SKIPPED).
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
/** How many sections to sample per act. */
const PER_ACT = Number(process.env.AI_EVAL_PER_ACT ?? "2");
const ACTS = ["ipc", "crpc", "iea", "constitution", "ica", "bns", "bnss", "bsa"];

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY (publishable) in the environment.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

interface EvalRow {
  slug: string;
  abbreviation: string;
  number: string;
  marginal_note: string;
  body_plain: string;
}

/** Pick a spread of published sections across acts (first + evenly-spaced). */
async function sampleSections(): Promise<EvalRow[]> {
  const rows: EvalRow[] = [];
  for (const slug of ACTS) {
    const { data, error } = await db
      .from("act_sections")
      .select("number, marginal_note, body_plain, sort_key, acts!inner(slug, abbreviation)")
      .eq("acts.slug", slug)
      .eq("review_status", "published")
      .order("sort_key", { ascending: true })
      .limit(400);
    if (error || !data?.length) {
      console.warn(`(skip ${slug}: ${error?.message ?? "no published sections"})`);
      continue;
    }
    const step = Math.max(1, Math.floor(data.length / PER_ACT));
    for (let i = 0; i < PER_ACT && i * step < data.length; i++) {
      const s = data[i * step] as unknown as {
        number: string;
        marginal_note: string;
        body_plain: string;
        acts: { slug: string; abbreviation: string };
      };
      rows.push({
        slug: s.acts.slug,
        abbreviation: s.acts.abbreviation,
        number: s.number,
        marginal_note: s.marginal_note,
        body_plain: s.body_plain,
      });
    }
  }
  return rows;
}

async function explain(
  slug: string,
  number: string,
): Promise<{ status: number; explanation?: string; error?: string; cached?: boolean }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/explain-section`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY! },
    body: JSON.stringify({ slug, number }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    explanation?: string;
    error?: string;
    cached?: boolean;
  };
  return { status: res.status, ...body };
}

/** Cheap heuristics for likely-ungrounded output. Hints only. */
function redFlags(row: EvalRow, explanation: string): string[] {
  const flags: string[] = [];
  const advice = /\b(you should|consult (a|your) lawyer|in your case|we recommend|seek legal)\b/i;
  if (advice.test(explanation)) flags.push("advice-like phrasing");

  // Section numbers cited in the explanation that aren't this section and don't
  // appear in the section's own text → possible invented cross-reference.
  const cited = explanation.match(/\bsection\s+\d+[A-Z]?/gi) ?? [];
  for (const c of cited) {
    const n = c.replace(/\bsection\s+/i, "");
    if (n !== row.number && !row.body_plain.includes(n)) {
      flags.push(`cites "${c}" (not in source)`);
    }
  }
  return [...new Set(flags)];
}

async function main() {
  const rows = await sampleSections();
  console.log(`\nEvaluating ${rows.length} sections via ${SUPABASE_URL}/functions/v1/explain-section\n`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  let flagged = 0;

  for (const row of rows) {
    const r = await explain(row.slug, row.number);
    const head = `${row.abbreviation} §${row.number} — ${row.marginal_note}`;
    console.log("─".repeat(80));
    console.log(head);

    if (r.status === 503) {
      skipped++;
      console.log("  SKIPPED — explainer not configured yet (GEMINI_API_KEY unset).");
      continue;
    }
    if (r.status !== 200 || !r.explanation) {
      failed++;
      console.log(`  ❌ FAILED [${r.status}] ${r.error ?? "no explanation"}`);
      continue;
    }
    ok++;
    console.log(`  ${r.cached ? "(cached)" : "(generated)"}`);
    console.log("  SOURCE: " + row.body_plain.replace(/\s+/g, " ").slice(0, 240) + "…");
    console.log("  EXPLANATION:\n" + r.explanation.split("\n").map((l) => "    " + l).join("\n"));
    const flags = redFlags(row, r.explanation);
    if (flags.length) {
      flagged++;
      console.log("  ⚠️  " + flags.join("; "));
    }
  }

  console.log("─".repeat(80));
  console.log(
    `\nDone: ${ok} explained, ${flagged} with red-flag hints, ${failed} failed, ${skipped} skipped.`,
  );
  if (skipped === rows.length) {
    console.log("All skipped → set GEMINI_API_KEY on the Edge Function, then re-run.");
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
