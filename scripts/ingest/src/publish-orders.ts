/**
 * Publish a parsed First Schedule (Orders and Rules) to act_orders /
 * act_order_rules.
 *
 * Mirrors publishBundle's posture: service role only, delete-what-the-bundle-
 * no-longer-produces (D-052 — an upsert-only publisher lets a defect fixed in
 * a bundle stay live for ever), and body_plain computed from body_md here
 * rather than in SQL, because `SET body_plain = <new>, body_md = body_plain`
 * silently writes the OLD value (D-027).
 */
import { createClient } from "@supabase/supabase-js";

import type { ParsedAppendix, ParsedOrder } from "./sources/cpc-schedule";

export interface PublishOrdersOptions {
  actSlug: string;
  reviewStatus: "draft" | "reviewed" | "published";
  provenance: string;
}

/** Letters sort after their base: rule 10A between 10 and 11. */
export function ruleSortKey(number: string): number {
  const m = /^(\d+)([A-Z]*)$/i.exec(number.trim());
  if (!m) return Number.MAX_SAFE_INTEGER;
  const base = Number(m[1]);
  const letters = (m[2] ?? "").toUpperCase();
  let frac = 0;
  for (let i = 0; i < letters.length; i += 1) {
    frac += (letters.charCodeAt(i) - 64) / 100 ** (i + 1);
  }
  return base + frac;
}

/** Markdown → the plain text search and the scanner read. */
export function toPlain(md: string): string {
  return md
    .replace(/\*\*/g, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function publishOrders(
  orders: ParsedOrder[],
  options: PublishOrdersOptions,
): Promise<{ orders: number; rules: number; removed: number }> {
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
    .single();
  if (actError || !act) throw new Error(`act not found: ${options.actSlug}`);

  const { data: existing } = await db.from("act_orders").select("id, sort_order").eq("act_id", act.id);
  const existingBySort = new Map((existing ?? []).map((o) => [o.sort_order, o.id as string]));

  let ruleCount = 0;
  const keptSorts = new Set<number>();

  for (const [i, order] of orders.entries()) {
    keptSorts.add(i);
    const row = {
      act_id: act.id,
      number: order.number,
      title: order.title || `Order ${order.number}`,
      sort_order: i,
      review_status: options.reviewStatus,
      provenance: options.provenance,
    };

    // Upsert on (act_id, sort_order) so ids survive a republish — anything
    // referencing a rule keeps referencing it.
    const { data: saved, error } = await db
      .from("act_orders")
      .upsert(row, { onConflict: "act_id,sort_order" })
      .select("id")
      .single();
    if (error || !saved) throw new Error(`order ${order.number}: ${error?.message}`);

    const orderId = saved.id as string;
    existingBySort.delete(i);

    const rules = order.rules.map((r) => ({
      order_id: orderId,
      number: r.number,
      sort_key: ruleSortKey(r.number),
      marginal_note: r.marginalNote,
      body_md: r.bodyMd,
      body_plain: toPlain(r.bodyMd),
    }));

    if (rules.length) {
      const { error: ruleError } = await db
        .from("act_order_rules")
        .upsert(rules, { onConflict: "order_id,number" });
      if (ruleError) throw new Error(`order ${order.number} rules: ${ruleError.message}`);
    }

    // Rules this parse no longer produces are removed, not left behind.
    const numbers = rules.map((r) => r.number);
    if (numbers.length) {
      await db
        .from("act_order_rules")
        .delete()
        .eq("order_id", orderId)
        .not("number", "in", `(${numbers.map((n) => `"${n}"`).join(",")})`);
    }
    ruleCount += rules.length;
  }

  // Orders beyond the end of this parse (the schedule shrank) go too.
  let removed = 0;
  for (const [sort, id] of existingBySort) {
    if (keptSorts.has(sort)) continue;
    await db.from("act_orders").delete().eq("id", id);
    removed += 1;
  }

  return { orders: orders.length, rules: ruleCount, removed };
}

// ── Appendices (the forms) ───────────────────────────────────────────────────


export async function publishAppendices(
  appendices: ParsedAppendix[],
  options: PublishOrdersOptions,
): Promise<{ appendices: number; forms: number }> {
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
    .single();
  if (actError || !act) throw new Error(`act not found: ${options.actSlug}`);

  let formCount = 0;
  for (const [i, ap] of appendices.entries()) {
    const { data: saved, error } = await db
      .from("act_appendices")
      .upsert(
        {
          act_id: act.id,
          letter: ap.letter,
          title: ap.title || `Appendix ${ap.letter}`,
          sort_order: i,
          review_status: options.reviewStatus,
          provenance: options.provenance,
        },
        { onConflict: "act_id,letter" },
      )
      .select("id")
      .single();
    if (error || !saved) throw new Error(`appendix ${ap.letter}: ${error?.message}`);

    const appendixId = saved.id as string;
    // Keyed by POSITION, not number: Appendix A's numbering restarts partway
    // through (49 plaints, then defences beginning again at No. 1) and the
    // print marks those groups with no heading this parser can rely on.
    const forms = ap.forms.map((f, n) => ({
      appendix_id: appendixId,
      number: f.number,
      sort_order: n,
      sort_key: ruleSortKey(f.number),
      title: f.title,
      body_md: f.bodyMd,
      body_plain: toPlain(f.bodyMd),
    }));
    if (forms.length) {
      const { error: formError } = await db
        .from("act_appendix_forms")
        .upsert(forms, { onConflict: "appendix_id,sort_order" });
      if (formError) throw new Error(`appendix ${ap.letter} forms: ${formError.message}`);
      await db
        .from("act_appendix_forms")
        .delete()
        .eq("appendix_id", appendixId)
        .gte("sort_order", forms.length);
    }
    formCount += forms.length;
  }
  return { appendices: appendices.length, forms: formCount };
}
