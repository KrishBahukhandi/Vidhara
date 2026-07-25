// daily-mcq — the quiz engine: one deterministic question per day ("daily")
// plus unlimited auto-generated practice questions ("practice").
// (Name kept for client compatibility; it serves both modes.)
//
// ZERO AI / ZERO HALLUCINATION by construction: every question is built from
// the authoritative NCRB old↔new mapping in the DB (v_mapping_lookup),
// server-side. Nothing is invented, nothing is authored — the correct answer is
// always a real mapped counterpart and the distractors are always other REAL
// sections of the same act. Only clean, unambiguous mappings are used
// (renumbered/identical/modified — each source → exactly one target).
//
// QUESTION TYPES (all grounded in the same pool):
//   forward — old §X (note) → which NEW section?      (the core exam wedge)
//   reverse — new §Y (note) → which OLD section?      (recall in both directions)
//   subject — "which section deals with <subject>?"   (topic → section recall)
//
// MODES: daily = deterministic per IST day (everyone gets the same question, so
// it's a shared, shareable habit). practice = random, unlimited, with `exclude`
// to avoid immediate repeats within a session.
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

/** Small deterministic PRNG (mulberry32) so a day's question/shuffle is stable. */
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
  target_act_slug: string;
  target_number: string;
  target_marginal_note: string;
  mapping_type: string;
}

type QType = "forward" | "reverse" | "subject";
const TYPES: QType[] = ["forward", "reverse", "subject"];

/** Unique "<act> §<number>" options from a pool, excluding the answer. */
function distractorsFrom(
  candidates: { act: string; number: string }[],
  answerAct: string,
  answerNumber: string,
  rand: () => number,
): string[] {
  const uniq = [
    ...new Map(
      candidates
        .filter((c) => c.act === answerAct && c.number !== answerNumber)
        .map((c) => [c.number, c]),
    ).values(),
  ];
  return shuffle(uniq, rand)
    .slice(0, 3)
    .map((c) => `${c.act} §${c.number}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({}));
    const mode: "daily" | "practice" = body?.mode === "practice" ? "practice" : "daily";
    const exclude: string[] = Array.isArray(body?.exclude) ? body.exclude.slice(0, 100) : [];

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Clean, unambiguous forward mappings only (each source → one target).
    const { data, error } = await db
      .from("v_mapping_lookup")
      .select(
        "source_act, source_act_slug, source_number, source_marginal_note, target_act, target_act_slug, target_number, target_marginal_note, mapping_type, source_section_id",
      )
      .not("target_section_id", "is", null)
      .in("mapping_type", ["renumbered", "identical", "modified"])
      .order("source_section_id", { ascending: true });
    if (error) return json({ error: error.message }, 500);
    const pool = (data ?? []) as Row[];
    if (pool.length === 0) return json({ error: "No questions available." }, 503);

    const day = istDayNumber();
    // daily → seeded by the day (stable for everyone); practice → fresh each call.
    const seed = mode === "daily" ? day : (Math.random() * 2 ** 32) >>> 0;
    const rand = mulberry32(seed);

    // Pick the base mapping row.
    let q: Row;
    let type: QType;
    if (mode === "daily") {
      q = pool[((day % pool.length) + pool.length) % pool.length];
      type = TYPES[day % TYPES.length]; // rotate the type day to day
    } else {
      const avoid = new Set(exclude);
      const fresh = pool.filter(
        (r) => !avoid.has(`${r.source_act}-${r.source_number}`),
      );
      const from = fresh.length > 0 ? fresh : pool;
      q = from[Math.floor(rand() * from.length)];
      type = TYPES[Math.floor(rand() * TYPES.length)];
    }

    const sourcesForDistractors = pool.map((r) => ({
      act: r.source_act,
      number: r.source_number,
    }));
    const targetsForDistractors = pool.map((r) => ({
      act: r.target_act,
      number: r.target_number,
    }));

    let prompt: string;
    let subject: string;
    let subjectNote: string;
    let answer: string;
    let options: string[];
    let explanation: string;
    let readSlug: string;
    let readNumber: string;

    if (type === "reverse") {
      // new → old
      answer = `${q.source_act} §${q.source_number}`;
      prompt = "Which provision of the old law does this new section replace?";
      subject = `${q.target_act} §${q.target_number}`;
      subjectNote = q.target_marginal_note;
      options = shuffle(
        [answer, ...distractorsFrom(sourcesForDistractors, q.source_act, q.source_number, rand)],
        rand,
      );
      explanation =
        `${q.target_act} §${q.target_number} (${q.target_marginal_note}) replaces ` +
        `${q.source_act} §${q.source_number} (${q.source_marginal_note}).`;
      readSlug = q.target_act_slug;
      readNumber = q.target_number;
    } else if (type === "subject") {
      // topic → section (asked on the NEW law, which is what exams now test)
      answer = `${q.target_act} §${q.target_number}`;
      prompt = `Which section of the ${q.target_act} deals with this?`;
      subject = q.target_marginal_note;
      subjectNote = `Previously ${q.source_act} §${q.source_number}`;
      options = shuffle(
        [answer, ...distractorsFrom(targetsForDistractors, q.target_act, q.target_number, rand)],
        rand,
      );
      explanation =
        `${q.target_marginal_note} is ${q.target_act} §${q.target_number}, ` +
        `which corresponds to ${q.source_act} §${q.source_number} of the old law.`;
      readSlug = q.target_act_slug;
      readNumber = q.target_number;
    } else {
      // forward: old → new (the core wedge)
      answer = `${q.target_act} §${q.target_number}`;
      prompt = "Under the new criminal laws, which section corresponds to this old provision?";
      subject = `${q.source_act} §${q.source_number}`;
      subjectNote = q.source_marginal_note;
      options = shuffle(
        [answer, ...distractorsFrom(targetsForDistractors, q.target_act, q.target_number, rand)],
        rand,
      );
      explanation =
        `${q.source_act} §${q.source_number} (${q.source_marginal_note}) corresponds to ` +
        `${q.target_act} §${q.target_number} (${q.target_marginal_note}).`;
      readSlug = q.source_act_slug;
      readNumber = q.source_number;
    }

    // A question needs 4 real options; if an act was too small, fall back.
    if (options.length < 4) return json({ error: "Question unavailable, please retry." }, 503);

    return json({
      id: `${q.source_act}-${q.source_number}`,
      mode,
      type,
      date: istDateString(),
      prompt,
      subject,
      subjectNote,
      options,
      answerIndex: options.indexOf(answer),
      answer,
      explanation,
      readSlug,
      readNumber,
      readLabel: type === "forward" ? subject : answer,
      mappingType: q.mapping_type,
      // Back-compat with the first daily-only client shape.
      oldRef: subject,
      oldNote: subjectNote,
      sourceSlug: readSlug,
      sourceNumber: readNumber,
    });
  } catch (e) {
    return json({ error: (e as Error).message ?? "unexpected error" }, 500);
  }
});
