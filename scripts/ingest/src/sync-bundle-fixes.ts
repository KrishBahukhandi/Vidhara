/**
 * One-off: sync the D-025 repealed-section repairs from the live DB back into
 * the bundles (artifacts of record — D-011), so the two never drift.
 *
 * Only touches sections whose BUNDLE copy still shows the broken shape (a
 * marginal note ending mid repeal-citation, or a body that is a citation tail /
 * carries drop-cap debris). Everything else is left byte-identical, so this is
 * a narrow, reviewable diff.
 *
 * Usage: SUPABASE_URL=… SUPABASE_ANON_KEY=… pnpm --filter @nexlex/ingest sync-bundle-fixes
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

const BUNDLES = join(import.meta.dirname, "..", "bundles");
const ACTS = [
  { slug: "ica", file: "ica.json" },
  { slug: "ipc", file: "ipc.json" },
  { slug: "constitution", file: "coi.json" },
];

/** The broken shapes this repair addressed. */
const BROKEN_NOTE = /(?:Rep|Omitted|omitted)[^.]{0,80}?[,.]?\s*(?:by)?\s*s?$|,\s*s$/;
const BROKEN_BODY = /^\s*(?:by\s+s\.?\s*)?\d+[A-Za-z]?\s*(?:,|\(|and\b|ibid|\.)|ibid.*ibid|Rep\.?\s*bys|^\[[A-Z][^\]]{0,14}\]/;
const SPACE_LOSS = /[a-z]{18,}/;

interface BundleSection {
  number: string;
  marginalNote: string;
  bodyMd: string;
  [k: string]: unknown;
}

async function fetchLive(slug: string): Promise<Map<string, { note: string; body: string }>> {
  const out = new Map<string, { note: string; body: string }>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("act_sections")
      .select("number, marginal_note, body_md, acts!inner(slug)")
      .eq("acts.slug", slug)
      .eq("review_status", "published")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as {
      number: string;
      marginal_note: string;
      body_md: string;
    }[];
    for (const r of rows) out.set(r.number, { note: r.marginal_note, body: r.body_md });
    if (rows.length < PAGE) break;
  }
  return out;
}

async function main() {
  let totalChanged = 0;
  for (const { slug, file } of ACTS) {
    const path = join(BUNDLES, file);
    const bundle = JSON.parse(readFileSync(path, "utf8")) as { sections: BundleSection[] };
    const live = await fetchLive(slug);

    let changed = 0;
    for (const s of bundle.sections) {
      const looksBroken =
        BROKEN_NOTE.test(s.marginalNote ?? "") ||
        BROKEN_BODY.test(s.bodyMd ?? "") ||
        SPACE_LOSS.test(s.marginalNote ?? "");
      if (!looksBroken) continue;

      const fixed = live.get(s.number);
      if (!fixed) continue;
      if (fixed.note === s.marginalNote && fixed.body === s.bodyMd) continue;

      s.marginalNote = fixed.note;
      s.bodyMd = fixed.body;
      changed++;
    }

    if (changed > 0) writeFileSync(path, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
    console.log(`${file}: ${changed} sections synced`);
    totalChanged += changed;
  }
  console.log(`\nTotal: ${totalChanged} bundle sections brought in line with the live DB.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
