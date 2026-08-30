/**
 * Publish a list-shaped schedule (act_schedules + act_schedule_entries, 0023).
 *
 * Mirrors publishOrders' and publishClassifications' posture: service role
 * only, and delete-what-the-parse-no-longer-produces (D-052 — an upsert-only
 * publisher lets a defect fixed in the parser stay live for ever).
 */
import { createClient } from "@supabase/supabase-js";

import { deriveSortKey } from "./sort-key";
import type { ListScheduleResult } from "./sources/list-schedule";

export interface PublishListScheduleOptions {
  /** Act the schedule belongs to — "constitution". */
  actSlug: string;
  /** URL segment: /acts/constitution/schedule/<slug>. */
  slug: string;
  /** "Seventh Schedule". */
  title: string;
  /** "Union, State and Concurrent Lists". */
  subtitle?: string;
  /** Printed order among the act's schedules. */
  sortOrder: number;
  reviewStatus: "draft" | "reviewed" | "published";
  provenance: string;
}

export async function publishListSchedule(
  parsed: ListScheduleResult,
  options: PublishListScheduleOptions,
): Promise<{ scheduleId: string; entries: number; removed: number }> {
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

  const { data: schedule, error: scheduleError } = await db
    .from("act_schedules")
    .upsert(
      {
        act_id: act.id,
        slug: options.slug,
        title: options.title,
        subtitle: options.subtitle ?? null,
        // The provision the schedule is made under, as the print gives it.
        authority_note: parsed.authority,
        // Entry-shaped, not columnar: there are no column headings to print.
        // 0011 makes this NOT NULL because the Limitation Schedule needs three.
        column_labels: [],
        sort_order: options.sortOrder,
        review_status: options.reviewStatus,
        provenance: options.provenance,
      },
      { onConflict: "act_id,slug" },
    )
    .select("id")
    .single();
  if (scheduleError) throw new Error(`publishing schedule: ${scheduleError.message}`);

  const payload = parsed.lists.flatMap((list, listIndex) =>
    list.entries.map((entry) => ({
      schedule_id: schedule.id,
      list_number: list.number,
      list_title: list.title,
      list_order: listIndex + 1,
      number: entry.number,
      sort_key: deriveSortKey(entry.number),
      body: entry.text,
    })),
  );
  if (payload.length === 0) throw new Error("nothing parsed — refusing to publish an empty schedule");

  const { error } = await db
    .from("act_schedule_entries")
    .upsert(payload, { onConflict: "schedule_id,list_number,number" });
  if (error) throw new Error(`publishing entries: ${error.message}`);

  // An entry the parse no longer produces must not stay live. Compared on the
  // (List, number) pairs actually published, because the numbering restarts in
  // each List and a bare number is not unique.
  const keep = new Set(payload.map((row) => `${row.list_number}|${row.number}`));
  const { data: existing, error: readError } = await db
    .from("act_schedule_entries")
    .select("id, list_number, number")
    .eq("schedule_id", schedule.id);
  if (readError) throw new Error(`reading existing entries: ${readError.message}`);
  const stale = (existing ?? []).filter(
    (row: { list_number: string; number: string }) => !keep.has(`${row.list_number}|${row.number}`),
  );
  if (stale.length > 0) {
    const { error: deleteError } = await db
      .from("act_schedule_entries")
      .delete()
      .in(
        "id",
        stale.map((row: { id: string }) => row.id),
      );
    if (deleteError) throw new Error(`removing stale entries: ${deleteError.message}`);
  }

  return { scheduleId: schedule.id, entries: payload.length, removed: stale.length };
}
