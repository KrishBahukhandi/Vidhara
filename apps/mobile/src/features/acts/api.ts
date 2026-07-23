/**
 * Acts feature API — all Library/Reader/Mapping data access.
 * Reads are anonymous-safe: RLS exposes published content to everyone
 * (architecture.md §6). Components call these, never supabase directly.
 */
import {
  ERROR_CODES,
  err,
  ok,
  parseSectionRef,
  type Result,
} from "@nexlex/shared";
import type { Tables } from "@nexlex/db";

import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";

export type Act = Tables<"acts">;
export type Section = Tables<"act_sections">;
export type MappingRow = Tables<"v_mapping_lookup">;

export interface SectionListItem {
  id: string;
  number: string;
  marginal_note: string;
  chapter_id: string | null;
}

export interface ChapterListItem {
  id: string;
  number: string;
  title: string;
}

export interface SectionWithAct extends Section {
  acts: Pick<Act, "slug" | "abbreviation" | "title">;
}

export interface SearchHit {
  section_id: string;
  act_abbreviation: string;
  act_slug: string;
  number: string;
  marginal_note: string;
  snippet: string;
}

export type LibrarySearchOutcome =
  | { kind: "section"; actSlug: string; number: string } // confident direct hit → navigate
  | { kind: "results"; results: SearchHit[] };

const LOAD_ERROR = "Couldn't load from the library. Check your connection and retry.";

export async function listActs(): Promise<Result<Act[]>> {
  const { data, error } = await supabase
    .from("acts")
    .select("*")
    .order("status", { ascending: true }) // 'active' before 'replaced'
    .order("year", { ascending: false });

  if (error) return err(ERROR_CODES.INTERNAL, LOAD_ERROR);
  return ok(data);
}

export async function getAct(slug: string): Promise<Result<Act>> {
  const { data, error } = await supabase.from("acts").select("*").eq("slug", slug).maybeSingle();
  if (error) return err(ERROR_CODES.INTERNAL, LOAD_ERROR);
  if (!data) return err(ERROR_CODES.NOT_FOUND, "That act isn't in the library yet.");
  return ok(data);
}

export async function listSections(actSlug: string): Promise<Result<SectionListItem[]>> {
  const { data, error } = await supabase
    .from("act_sections")
    .select("id, number, marginal_note, chapter_id, acts!inner(slug)")
    .eq("acts.slug", actSlug)
    .order("sort_key", { ascending: true });

  if (error) return err(ERROR_CODES.INTERNAL, LOAD_ERROR);
  return ok(
    data.map(({ id, number, marginal_note, chapter_id }) => ({
      id,
      number,
      marginal_note,
      chapter_id,
    })),
  );
}

export async function listChapters(actSlug: string): Promise<Result<ChapterListItem[]>> {
  const { data, error } = await supabase
    .from("act_chapters")
    .select("id, number, title, acts!inner(slug)")
    .eq("acts.slug", actSlug)
    .order("sort_order", { ascending: true });

  if (error) return err(ERROR_CODES.INTERNAL, LOAD_ERROR);
  return ok(data.map(({ id, number, title }) => ({ id, number, title })));
}

export async function getSection(
  actSlug: string,
  number: string,
): Promise<Result<SectionWithAct>> {
  const { data, error } = await supabase
    .from("act_sections")
    .select("*, acts!inner(slug, abbreviation, title)")
    .eq("acts.slug", actSlug)
    .eq("number", number)
    .maybeSingle();

  if (error) return err(ERROR_CODES.INTERNAL, LOAD_ERROR);
  if (!data) {
    return err(ERROR_CODES.NOT_FOUND, `Section ${number} isn't in the library yet.`);
  }
  return ok(data as SectionWithAct);
}

export interface AdjacentSection {
  number: string;
  marginal_note: string;
}

/**
 * Previous/next sections within an act, by sort_key — sequential reading.
 * Two tiny indexed lookups, cheap even on 500-section acts.
 */
export async function getAdjacentSections(
  actId: string,
  sortKey: number,
): Promise<{ prev: AdjacentSection | null; next: AdjacentSection | null }> {
  const [prevRes, nextRes] = await Promise.all([
    supabase
      .from("act_sections")
      .select("number, marginal_note")
      .eq("act_id", actId)
      .lt("sort_key", sortKey)
      .order("sort_key", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("act_sections")
      .select("number, marginal_note")
      .eq("act_id", actId)
      .gt("sort_key", sortKey)
      .order("sort_key", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  return { prev: prevRes.data ?? null, next: nextRes.data ?? null };
}

/** All mappings touching a section, either direction. */
export async function getMappings(sectionId: string): Promise<Result<MappingRow[]>> {
  const { data, error } = await supabase
    .from("v_mapping_lookup")
    .select("*")
    .or(`source_section_id.eq.${sectionId},target_section_id.eq.${sectionId}`);

  if (error) return err(ERROR_CODES.INTERNAL, LOAD_ERROR);
  return ok(data);
}

export type MappingLookupOutcome =
  | { kind: "not-a-ref" }
  | { kind: "not-found"; act: string; section: string }
  | { kind: "found"; sectionId: string; mappings: MappingRow[] };

/** Mapping tab lookup: parse "302 IPC"-style ref → resolve section → fetch mappings. */
export async function lookupMappingsByRef(query: string): Promise<Result<MappingLookupOutcome>> {
  const ref = parseSectionRef(query);
  if (!ref?.act) return ok({ kind: "not-a-ref" });

  const { data: sectionRow, error } = await supabase
    .from("act_sections")
    .select("id, acts!inner(abbreviation)")
    .eq("acts.abbreviation", ref.act)
    .eq("number", ref.section)
    .maybeSingle();

  if (error) return err(ERROR_CODES.INTERNAL, LOAD_ERROR);
  if (!sectionRow) return ok({ kind: "not-found", act: ref.act, section: ref.section });

  const mappings = await getMappings(sectionRow.id);
  if (!mappings.ok) return mappings;
  return ok({ kind: "found", sectionId: sectionRow.id, mappings: mappings.data });
}

/**
 * Library search (architecture.md §8): structured section-ref parse first
 * (single indexed lookup), full-text search otherwise.
 */
export async function searchLibrary(query: string): Promise<Result<LibrarySearchOutcome>> {
  const trimmed = query.trim();
  if (!trimmed) return ok({ kind: "results", results: [] });

  const ref = parseSectionRef(trimmed);

  if (ref?.act) {
    const { data, error } = await supabase
      .from("act_sections")
      .select("number, acts!inner(slug, abbreviation)")
      .eq("acts.abbreviation", ref.act)
      .eq("number", ref.section)
      .maybeSingle();

    if (error) return err(ERROR_CODES.INTERNAL, LOAD_ERROR);
    if (data) {
      return ok({ kind: "section", actSlug: data.acts.slug, number: data.number });
    }
    // Recognized ref but section not ingested yet — fall through to FTS.
  }

  if (ref && !ref.act) {
    // Bare number ("302"): list that section number across all acts.
    const { data, error } = await supabase
      .from("act_sections")
      .select("id, number, marginal_note, acts!inner(slug, abbreviation)")
      .eq("number", ref.section)
      .limit(10);

    if (error) return err(ERROR_CODES.INTERNAL, LOAD_ERROR);
    if (data.length > 0) {
      return ok({
        kind: "results",
        results: data.map((row) => ({
          section_id: row.id,
          act_abbreviation: row.acts.abbreviation,
          act_slug: row.acts.slug,
          number: row.number,
          marginal_note: row.marginal_note,
          snippet: "",
        })),
      });
    }
  }

  const { data, error } = await supabase.rpc("search_sections", { q: trimmed });
  if (error) return err(ERROR_CODES.INTERNAL, LOAD_ERROR);
  return ok({ kind: "results", results: data });
}

/**
 * "Explain this section" — the explain-section Edge Function grounds the model
 * strictly in this section's own official text (fetched server-side; the client
 * can't inject text). err() messages are user-facing: the function returns a
 * friendly line for "being set up" (no key yet) and the daily cap. Uses fetch
 * rather than functions.invoke so those non-2xx bodies reach the UI intact.
 */
export async function explainSection(slug: string, number: string): Promise<Result<string>> {
  try {
    const res = await fetch(`${env.supabaseUrl}/functions/v1/explain-section`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: env.supabaseAnonKey },
      body: JSON.stringify({ slug, number }),
    });
    const data = (await res.json().catch(() => ({}))) as { explanation?: string; error?: string };
    if (!res.ok || !data.explanation) {
      return err(
        ERROR_CODES.INTERNAL,
        data.error ?? "Couldn't generate an explanation. Please try again.",
      );
    }
    return ok(data.explanation);
  } catch {
    return err(ERROR_CODES.INTERNAL, "Couldn't reach the explainer. Check your connection and retry.");
  }
}
