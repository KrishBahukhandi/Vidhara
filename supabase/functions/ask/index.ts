// ask — grounded "ask a question, get taken to the law" retrieval.
//
// SAFE BY DESIGN (decision D-004): the model NEVER answers the legal question
// and never names a section. Its only job is to translate a layperson's
// phrasing into the formal statutory words that appear in a bare-act heading
// (e.g. "anticipatory bail" → "bail to person apprehending arrest"). Those
// phrases are then run against the REAL corpus (search_sections RPC), so every
// result is an actual, linkable section the user opens and reads — the AI is a
// librarian, not an oracle. If the model is unavailable it degrades to a plain
// full-text search on the raw query.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_KEY = Deno.env.get("GROQ_API_KEY");
const MODEL = Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile";

const SYSTEM =
  `You translate a layperson's question about Indian law into short search phrases that match the HEADING or wording of a bare-act section. ` +
  `Output ONLY a compact JSON array of 1 to 3 short phrases (2-6 words each), most specific first, using formal statutory wording. ` +
  `Do NOT include section numbers, act names, answers, or any commentary — phrases only. Examples: ` +
  `"anticipatory bail" -> ["bail to person apprehending arrest","anticipatory bail"]; ` +
  `"punishment for cheating" -> ["cheating","punishment for cheating"]; ` +
  `"what is the punishment for murder" -> ["punishment for murder","culpable homicide"]; ` +
  `"dying declaration" -> ["statement as to cause of death","dying declaration"].`;

interface Hit {
  section_id: string;
  [k: string]: unknown;
}

async function expandQuery(query: string): Promise<string[]> {
  if (!GROQ_KEY) return [];
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: query },
        ],
        temperature: 0.1,
        max_tokens: 120,
      }),
    });
    if (!res.ok) {
      console.error(`ask LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return [];
    }
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const json = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter((s) => s.length > 1)
      .slice(0, 3);
  } catch (e) {
    console.error("ask expandQuery failed:", (e as Error).message);
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  try {
    const { query } = await req.json().catch(() => ({}));
    const q = typeof query === "string" ? query.trim().slice(0, 160) : "";
    if (!q) return json({ error: "query is required" }, 400);

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const phrases = await expandQuery(q);
    // Always try the AI phrases first (most specific), then the raw query as a
    // safety net. Every term is run against the real corpus.
    const terms = [...phrases, q].filter((t, i, a) => a.indexOf(t) === i);

    const seen = new Set<string>();
    const results: Hit[] = [];
    for (const term of terms) {
      const { data, error } = await db.rpc("search_sections", { q: term });
      if (error || !Array.isArray(data)) continue;
      for (const row of data as Hit[]) {
        if (!seen.has(row.section_id)) {
          seen.add(row.section_id);
          results.push(row);
        }
        if (results.length >= 8) break;
      }
      if (results.length >= 8) break;
    }

    return json({
      results,
      interpretedAs: phrases.length ? phrases : null,
      ai: phrases.length > 0,
    });
  } catch (e) {
    return json({ error: (e as Error).message ?? "unexpected error" }, 500);
  }
});
