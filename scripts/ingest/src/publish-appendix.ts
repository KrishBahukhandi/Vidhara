/**
 * Publish a prose appendix (act_appendices + act_appendix_forms, 0016/0025).
 *
 * The CPC's appendices are forms; the Constitution's are documents — an
 * amending Act with numbered sections, a Presidential Order with clauses, a
 * declaration under article 370(3). They share a table because they are the
 * same thing structurally: a lettered annexure holding numbered pieces of text.
 * `kind` is what tells the reader's page whether a body is a layout to preserve
 * or prose to set.
 *
 * Same posture as the other publishers: service role only, and replace rather
 * than upsert, so a piece the parse no longer produces cannot survive (D-052).
 */
import { createClient } from "@supabase/supabase-js";

import type { ListScheduleResult } from "./sources/list-schedule";

export interface PublishAppendixOptions {
  /** Act the appendix belongs to — "constitution". */
  actSlug: string;
  /** As printed: "I", "II", "III". Also the URL segment. */
  letter: string;
  /** "The Constitution (One Hundredth Amendment) Act, 2015". */
  title: string;
  /** Printed order among the act's appendices. */
  sortOrder: number;
  reviewStatus: "draft" | "reviewed" | "published";
  provenance: string;
}

export async function publishAppendix(
  parsed: ListScheduleResult,
  options: PublishAppendixOptions,
): Promise<{ appendixId: string; pieces: number; removed: number }> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (scripts/ingest/.env)");
  }
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: act, error: actError } = await db
    .from("acts")
    .select("id")
    .eq("slug", options.actSlug)
    .maybeSingle();
  if (actError) throw new Error(`looking up act "${options.actSlug}": ${actError.message}`);
  if (!act) throw new Error(`act "${options.actSlug}" is not in the corpus — publish it first`);

  const { data: appendix, error: appendixError } = await db
    .from("act_appendices")
    .upsert(
      {
        act_id: act.id,
        letter: options.letter,
        title: options.title,
        kind: "prose",
        sort_order: options.sortOrder,
        review_status: options.reviewStatus,
        provenance: options.provenance,
      },
      { onConflict: "act_id,letter" },
    )
    .select("id")
    .single();
  if (appendixError) throw new Error(`publishing appendix: ${appendixError.message}`);

  const payload = parsed.lists.flatMap((list) =>
    list.entries.map((entry, index) => ({
      appendix_id: appendix.id,
      number: entry.number,
      // Printed order, for the reason publish-list-schedule records: several of
      // these numbers do not sort, and the parse already emits them as the page
      // sets them.
      sort_key: index,
      sort_order: index,
      title: entry.label ?? "",
      body_md: entry.text,
      body_plain: entry.text,
    })),
  );
  if (payload.length === 0) throw new Error("nothing parsed — refusing to publish an empty appendix");

  const { data: removed, error: clearError } = await db
    .from("act_appendix_forms")
    .delete()
    .eq("appendix_id", appendix.id)
    .select("id");
  if (clearError) throw new Error(`clearing appendix: ${clearError.message}`);

  const { error } = await db.from("act_appendix_forms").insert(payload);
  if (error) throw new Error(`publishing appendix pieces: ${error.message}`);

  return { appendixId: appendix.id, pieces: payload.length, removed: removed?.length ?? 0 };
}
