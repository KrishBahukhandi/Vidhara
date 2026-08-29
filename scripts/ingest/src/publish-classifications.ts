/**
 * Publish a parsed First Schedule classification to offence_classifications.
 *
 * Mirrors publishOrders' posture: service role only, and delete-what-the-parse-
 * no-longer-produces (D-052 — an upsert-only publisher lets a defect fixed in
 * the parser stay live for ever).
 *
 * Two acts go into every row and they are not interchangeable. The schedule is
 * printed in the PROCEDURAL code and is about the SUBSTANTIVE one: `scheduleSlug`
 * is the BNSS, `subjectSlug` is the BNS, and getting them the wrong way round
 * would attach every classification to the wrong reader's page.
 */
import { createClient } from "@supabase/supabase-js";

import type { OffenceClassification, OffenceRule } from "./sources/offence-schedule";

export interface PublishClassificationsOptions {
  /** Act whose First Schedule this is — BNSS, CrPC. */
  scheduleSlug: string;
  /** Act whose sections it classifies — BNS, IPC. */
  subjectSlug: string;
  reviewStatus: "draft" | "reviewed" | "published";
  provenance: string;
}

export async function publishClassifications(
  rows: OffenceClassification[],
  options: PublishClassificationsOptions,
): Promise<{ published: number; removed: number }> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (scripts/ingest/.env)");
  }
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const actId = async (slug: string): Promise<string> => {
    const { data, error } = await db.from("acts").select("id").eq("slug", slug).maybeSingle();
    if (error) throw new Error(`looking up act "${slug}": ${error.message}`);
    if (!data) throw new Error(`act "${slug}" is not in the corpus — publish it first`);
    return data.id;
  };
  const scheduleActId = await actId(options.scheduleSlug);
  const subjectActId = await actId(options.subjectSlug);

  const payload = rows.map((row, index) => ({
    schedule_act_id: scheduleActId,
    subject_act_id: subjectActId,
    section_number: row.section,
    subsection: row.subsection ?? null,
    cognizable: row.cognizable,
    bailable: row.bailable,
    court: row.court,
    is_cognizable: row.isCognizable,
    is_bailable: row.isBailable,
    has_tiers: row.hasTiers,
    sort_order: index + 1,
    review_status: options.reviewStatus,
    provenance: options.provenance,
  }));

  const { error } = await db
    .from("offence_classifications")
    .upsert(payload, { onConflict: "schedule_act_id,sort_order" });
  if (error) throw new Error(`publishing classifications: ${error.message}`);

  // A shorter parse must not leave the tail of a longer one live.
  const { data: stale, error: staleError } = await db
    .from("offence_classifications")
    .delete()
    .eq("schedule_act_id", scheduleActId)
    .gt("sort_order", payload.length)
    .select("id");
  if (staleError) throw new Error(`removing stale classifications: ${staleError.message}`);

  return { published: payload.length, removed: stale?.length ?? 0 };
}

/**
 * Publish Part II's residual rule to offence_classification_rules.
 *
 * One schedule, three bands. Unlike Part I there is no subject act: the rule is
 * about offences under every OTHER law, which is why it is stored against the
 * schedule alone and read by every act page that has no schedule of its own.
 */
export async function publishClassificationRules(
  rules: OffenceRule[],
  options: { scheduleSlug: string; reviewStatus: "draft" | "reviewed" | "published"; provenance: string },
): Promise<{ published: number; removed: number }> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (scripts/ingest/.env)");
  }
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: act, error: actError } = await db
    .from("acts")
    .select("id")
    .eq("slug", options.scheduleSlug)
    .maybeSingle();
  if (actError) throw new Error(`looking up act "${options.scheduleSlug}": ${actError.message}`);
  if (!act) throw new Error(`act "${options.scheduleSlug}" is not in the corpus — publish it first`);

  const payload = rules.map((rule, index) => ({
    schedule_act_id: act.id,
    punishment: rule.punishment,
    cognizable: rule.cognizable,
    bailable: rule.bailable,
    court: rule.court,
    sort_order: index + 1,
    review_status: options.reviewStatus,
    provenance: options.provenance,
  }));

  const { error } = await db
    .from("offence_classification_rules")
    .upsert(payload, { onConflict: "schedule_act_id,sort_order" });
  if (error) throw new Error(`publishing classification rules: ${error.message}`);

  const { data: stale, error: staleError } = await db
    .from("offence_classification_rules")
    .delete()
    .eq("schedule_act_id", act.id)
    .gt("sort_order", payload.length)
    .select("id");
  if (staleError) throw new Error(`removing stale classification rules: ${staleError.message}`);

  return { published: payload.length, removed: stale?.length ?? 0 };
}
