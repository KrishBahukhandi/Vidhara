"use client";

/**
 * Client-side section fetch + old⇄new counterpart, shared by the advocate
 * surfaces (quick-cite and the case diary). Anonymous read only — RLS exposes
 * published content to everyone (architecture.md §6).
 */
import { getBrowserClient } from "@/lib/supabase-browser";

export interface LookedUpSection {
  slug: string;
  number: string;
  act: string;
  note: string;
  body: string;
  /** e.g. "now BNS 103" / "was IPC 302" — null when there's no mapping. */
  counterpart: string | null;
}

/** Fetch one published section with its mapped counterpart. Null if not found. */
export async function fetchSection(
  slug: string,
  number: string,
): Promise<LookedUpSection | null> {
  const db = getBrowserClient();
  if (!db) return null;

  const { data, error } = await db
    .from("act_sections")
    .select("id, number, marginal_note, body_plain, acts!inner(abbreviation, slug)")
    .eq("acts.slug", slug)
    .eq("number", number)
    .eq("review_status", "published")
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    number: string;
    marginal_note: string;
    body_plain: string;
    acts: { abbreviation: string; slug: string };
  };

  // Counterpart is best-effort: the section is still useful without it.
  let counterpart: string | null = null;
  const { data: maps } = await db
    .from("v_mapping_lookup")
    .select("source_section_id, source_act, source_number, target_act, target_number")
    .or(`source_section_id.eq.${row.id},target_section_id.eq.${row.id}`)
    .limit(1);
  const m = maps?.[0] as
    | {
        source_section_id: string;
        source_act: string | null;
        source_number: string | null;
        target_act: string | null;
        target_number: string | null;
      }
    | undefined;
  if (m) {
    counterpart =
      m.source_section_id === row.id
        ? m.target_act
          ? `now ${m.target_act} ${m.target_number}`
          : null
        : m.source_act
          ? `was ${m.source_act} ${m.source_number}`
          : null;
  }

  return {
    slug: row.acts.slug,
    number: row.number,
    act: row.acts.abbreviation,
    note: row.marginal_note,
    body: row.body_plain,
    counterpart,
  };
}
