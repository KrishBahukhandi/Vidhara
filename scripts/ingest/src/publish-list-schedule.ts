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

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

/**
 * A sort key for a number that may not be one.
 *
 * deriveSortKey handles "1", "2A", "92C" — the shapes act sections take — and
 * THROWS on anything else. Two things here are not those: the Third Schedule
 * numbers its Forms in Roman ("I" to "VIII"), and a closing rider is named by
 * what the print calls it ("Explanation", "Total"). Both need to sort, and a
 * rider closes its schedule, so it sorts after everything in it.
 */
function sortKeyFor(number: string): number {
  try {
    return deriveSortKey(number);
  } catch {
    if (/^[IVXLCDM]+$/.test(number)) {
      let total = 0;
      for (let i = 0; i < number.length; i++) {
        const here = ROMAN[number[i]!]!;
        const next = ROMAN[number[i + 1]!];
        total += next && next > here ? -here : here;
      }
      return total;
    }
    return 1_000_000;
  }
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
      sort_key: sortKeyFor(entry.number),
      label: entry.label ?? null,
      body: entry.text,
    })),
  );
  if (payload.length === 0) throw new Error("nothing parsed — refusing to publish an empty schedule");

  // REPLACED, not upserted. 0024 made the key a coalesced expression index, so
  // that a schedule with no Lists still cannot publish the same entry number
  // twice — and an expression index cannot be an upsert's conflict target.
  // Replacing is also the stricter reading of D-052: an entry the parse no
  // longer produces cannot survive, whatever its key.
  const { data: removedRows, error: clearError } = await db
    .from("act_schedule_entries")
    .delete()
    .eq("schedule_id", schedule.id)
    .select("id");
  if (clearError) throw new Error(`clearing entries: ${clearError.message}`);

  const { error } = await db.from("act_schedule_entries").insert(payload);
  if (error) throw new Error(`publishing entries: ${error.message}`);

  return { scheduleId: schedule.id, entries: payload.length, removed: removedRows?.length ?? 0 };
}
