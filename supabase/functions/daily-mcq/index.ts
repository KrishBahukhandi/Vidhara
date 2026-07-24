// daily-mcq — "Daily MCQ" habit loop (feature-priority.md; V1.1 candidate B).
//
// ZERO AI / ZERO HALLUCINATION by construction: the question is built entirely
// from the authoritative NCRB old↔new mapping in the DB (v_mapping_lookup),
// server-side. It asks "which new-law section corresponds to old §X?" — the
// exact exam wedge — where the correct answer is the mapped counterpart and the
// three distractors are other real sections of the same new act. Only clean,
// unambiguous mappings are used (renumbered/identical/modified, each source →
// exactly one target; verified 0 ambiguous). Nothing is invented.
//
// DETERMINISTIC BY DAY: everyone gets the same question on a given IST day
// (index = day number mod pool size), so it's a shared daily habit + shareable
// ("did you get today's?"). The client caches it and tracks a local streak.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const IST_OFFSET_MS = 5.5 * 3600 * 1000;
/** Day boundary at IST midnight → the "daily" reset Indian users expect. */
function istDayNumber(now = Date.now()): number {
  return Math.floor((now + IST_OFFSET_MS) / 86_400_000);
}
function istDateString(now = Date.now()): string {
  return new Date(now + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Small deterministic PRNG (mulberry32) so the day's shuffle is stable. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Row {
  source_act: string;
  source_act_slug: string;
  source_number: string;
  source_marginal_note: string;
  target_act: string;
  target_number: string;
  target_marginal_note: string;
  mapping_type: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Clean, unambiguous forward mappings only (each source → one target).
    const { data, error } = await db
      .from("v_mapping_lookup")
      .select(
        "source_act, source_act_slug, source_number, source_marginal_note, target_act, target_number, target_marginal_note, mapping_type, source_section_id",
      )
      .not("target_section_id", "is", null)
      .in("mapping_type", ["renumbered", "identical", "modified"])
      .order("source_section_id", { ascending: true });
    if (error) return json({ error: error.message }, 500);
    const pool = (data ?? []) as Row[];
    if (pool.length === 0) return json({ error: "No questions available." }, 503);

    const day = istDayNumber();
    const rand = mulberry32(day);
    const q = pool[((day % pool.length) + pool.length) % pool.length];

    // Distractors: 3 other real sections of the SAME new act (plausible, clean).
    const sameActTargets = [
      ...new Map(
        pool
          .filter((r) => r.target_act === q.target_act && r.target_number !== q.target_number)
          .map((r) => [r.target_number, r]),
      ).values(),
    ];
    let distractors = shuffle(sameActTargets, rand).slice(0, 3);
    // Fallback (only if an act is tiny): fill from any other target.
    if (distractors.length < 3) {
      const used = new Set([q.target_number, ...distractors.map((d) => d.target_number)]);
      for (const r of shuffle(pool, rand)) {
        if (distractors.length >= 3) break;
        if (!used.has(r.target_number)) {
          distractors.push(r);
          used.add(r.target_number);
        }
      }
    }

    const optionRows = shuffle(
      [{ ...q, __correct: true }, ...distractors.map((d) => ({ ...d, __correct: false }))],
      rand,
    );
    const options = optionRows.map((o) => `${o.target_act} §${o.target_number}`);
    const answerIndex = optionRows.findIndex((o) => o.__correct);

    return json({
      date: istDateString(),
      prompt: "Under the new criminal laws, which section corresponds to this old provision?",
      oldRef: `${q.source_act} §${q.source_number}`,
      oldNote: q.source_marginal_note,
      options,
      answerIndex,
      answer: `${q.target_act} §${q.target_number}`,
      explanation:
        `${q.source_act} §${q.source_number} (${q.source_marginal_note}) corresponds to ` +
        `${q.target_act} §${q.target_number} (${q.target_marginal_note}).`,
      // "Read the section" deep-link → the old section page (shows the mapping).
      sourceSlug: q.source_act_slug,
      sourceNumber: q.source_number,
      mappingType: q.mapping_type,
    });
  } catch (e) {
    return json({ error: (e as Error).message ?? "unexpected error" }, 500);
  }
});
