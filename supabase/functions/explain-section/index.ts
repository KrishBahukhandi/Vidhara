// explain-section — AI "Explain this section" (decision D-004, ADR-5).
//
// GROUNDING is the whole game: the model sees ONLY the section's own official
// text + its old↔new mapping, fetched server-side from the DB (the client
// cannot inject text). It is told to explain using only that text, never to
// give advice or invent law. The statute text is always shown beside the
// explanation in the UI so users verify.
//
// FREE AT SCALE via a cache: a section's text never changes, so it's explained
// once (first viewer) and served from ai_explanations to everyone after. A
// global per-day cap (ai_usage) protects the free-tier quota from runaway
// generation. Provider (Groq, OpenAI-compatible chat API) is isolated in
// callLLM() for a one-function swap (ADR-5). GROQ_API_KEY is a Supabase secret
// — never in git/clients; until it's set the function returns 503 ("being set
// up") and the UI shows that message.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_KEY = Deno.env.get("GROQ_API_KEY");
const MODEL = Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile";
/** Global per-day generation cap — protects the free quota. Cache hits are free. */
const DAILY_CAP = Number(Deno.env.get("AI_DAILY_CAP") ?? "800");

const SYSTEM = `You are a study aid for Indian law students and judiciary aspirants. You explain a single statutory provision in plain, simple language.

STRICT RULES:
- Use ONLY the provided section text. Never add outside information, case law, section numbers, punishments, or details not present in the text.
- Never give legal advice or opinions about any real situation. You explain what the provision says, nothing more.
- Be concise: 3–5 short bullet points breaking the provision down simply, then one plain-language takeaway line.
- Define any legal term in simple words the first time it appears.
- If the text is short or purely a definition, keep the explanation short — do not pad.
- Do not repeat the section number or heading; the student already sees them.
- Plain English. No preamble like "This section...". Start directly with the substance.`;

function buildUserPrompt(
  act: string,
  number: string,
  note: string,
  bodyPlain: string,
  mappingLine: string,
): string {
  return [
    `Provision: ${act} §${number} — ${note}`,
    ``,
    `Official text:`,
    bodyPlain,
    mappingLine ? `\nOld↔new law: ${mappingLine}` : ``,
    ``,
    `Explain this provision for a student, following the rules.`,
  ].join("\n");
}

/** Provider failed (rate-limit, quota, outage). Carries a user-safe message +
 * status; the handler surfaces it without leaking raw provider JSON. */
class ProviderError extends Error {
  constructor(public userMessage: string, public status: number) {
    super(userMessage);
  }
}

async function callLLM(user: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: 700,
      top_p: 0.9,
    }),
  });
  if (!res.ok) {
    // Log the full provider error for us; never leak the raw body to clients.
    const body = (await res.text()).slice(0, 1200);
    console.error(`LLM ${res.status}: ${body}`);
    if (res.status === 429) {
      throw new ProviderError(
        "The explainer is busy right now — please try again in a minute.",
        503,
      );
    }
    throw new ProviderError("Couldn’t generate an explanation right now. Please try again.", 502);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    const reason = data?.choices?.[0]?.finish_reason ?? "empty";
    console.error(`LLM returned no text (${reason})`);
    throw new ProviderError("Couldn’t generate an explanation right now. Please try again.", 502);
  }
  return text.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  try {
    const { slug, number } = await req.json().catch(() => ({}));
    if (!slug || !number) return json({ error: "slug and number are required" }, 400);

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Fetch the real, published section — the ONLY text the model will see.
    const { data: section, error: secErr } = await db
      .from("act_sections")
      .select(
        "id, number, marginal_note, body_plain, review_status, acts!inner(abbreviation, slug)",
      )
      .eq("acts.slug", slug)
      .eq("number", number)
      .maybeSingle();
    if (secErr) return json({ error: secErr.message }, 500);
    if (!section || section.review_status !== "published") {
      return json({ error: "section not found" }, 404);
    }

    // Cache hit → instant, free, no quota consumed.
    const { data: cached } = await db
      .from("ai_explanations")
      .select("explanation")
      .eq("section_id", section.id)
      .maybeSingle();
    if (cached?.explanation) return json({ explanation: cached.explanation, cached: true });

    // Not cached → needs a generation.
    if (!GROQ_KEY) return json({ error: "AI explanations are being set up." }, 503);

    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await db.from("ai_usage").select("count").eq("day", today).maybeSingle();
    const used = usage?.count ?? 0;
    if (used >= DAILY_CAP) {
      return json({ error: "Daily explanation limit reached — please try again tomorrow." }, 429);
    }

    // Mapping context (best-effort; explanation still works without it).
    const { data: maps } = await db
      .from("v_mapping_lookup")
      .select("source_section_id, source_act, source_number, target_act, target_number, mapping_type")
      .or(`source_section_id.eq.${section.id},target_section_id.eq.${section.id}`)
      .limit(1);
    let mappingLine = "";
    const m = maps?.[0];
    if (m) {
      const fromThis = m.source_section_id === section.id;
      if (fromThis && m.target_act) {
        mappingLine = `this provision corresponds to ${m.target_act} §${m.target_number} in the new law (${m.mapping_type}).`;
      } else if (!fromThis && m.source_act) {
        mappingLine = `this provision replaces ${m.source_act} §${m.source_number} from the old law (${m.mapping_type}).`;
      }
    }

    const explanation = await callLLM(
      buildUserPrompt(
        section.acts.abbreviation as string,
        section.number as string,
        section.marginal_note as string,
        section.body_plain as string,
        mappingLine,
      ),
    );

    // Persist to cache + bump the day counter (best-effort; a soft cap).
    await db.from("ai_explanations").upsert({
      section_id: section.id,
      model: MODEL,
      explanation,
    });
    await db.from("ai_usage").upsert({ day: today, count: used + 1 });

    return json({ explanation, cached: false });
  } catch (e) {
    if (e instanceof ProviderError) return json({ error: e.userMessage }, e.status);
    console.error("explain-section error:", (e as Error).message);
    return json({ error: "Something went wrong generating the explanation." }, 500);
  }
});
