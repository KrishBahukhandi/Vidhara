/**
 * Server-only content queries for the SEO pages (RSC). Mirrors the app's
 * features/acts API in a throw-on-error style suited to RSC + notFound().
 * If a third consumer appears, unify into packages/db per the rule of three.
 */
import type { Tables } from "@nexlex/db";

import { getServerClient, isContentConfigured } from "@/lib/supabase-server";

export type Act = Tables<"acts">;
export type Section = Tables<"act_sections">;
export type MappingRow = Tables<"v_mapping_lookup">;

export interface SectionListItem {
  id: string;
  number: string;
  marginal_note: string;
}

export interface SectionWithAct extends Section {
  acts: Pick<Act, "slug" | "abbreviation" | "title" | "year">;
}

export async function listActs(): Promise<Act[]> {
  if (!isContentConfigured) return [];
  const { data, error } = await getServerClient()
    .from("acts")
    .select("*")
    .order("status", { ascending: true })
    .order("year", { ascending: false });
  if (error) throw new Error(`listActs: ${error.message}`);
  return data;
}

export async function getActBySlug(slug: string): Promise<Act | null> {
  if (!isContentConfigured) return null;
  const { data, error } = await getServerClient()
    .from("acts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getActBySlug: ${error.message}`);
  return data;
}

export async function listSectionsByAct(slug: string): Promise<SectionListItem[]> {
  if (!isContentConfigured) return [];
  const { data, error } = await getServerClient()
    .from("act_sections")
    .select("id, number, marginal_note, acts!inner(slug)")
    .eq("acts.slug", slug)
    .order("sort_key", { ascending: true });
  if (error) throw new Error(`listSectionsByAct: ${error.message}`);
  return data.map(({ id, number, marginal_note }) => ({ id, number, marginal_note }));
}

export async function getSectionWithAct(
  slug: string,
  number: string,
): Promise<SectionWithAct | null> {
  if (!isContentConfigured) return null;
  const { data, error } = await getServerClient()
    .from("act_sections")
    .select("*, acts!inner(slug, abbreviation, title, year)")
    .eq("acts.slug", slug)
    .eq("number", number)
    .maybeSingle();
  if (error) throw new Error(`getSectionWithAct: ${error.message}`);
  return data as SectionWithAct | null;
}

export async function getMappingsForSection(sectionId: string): Promise<MappingRow[]> {
  if (!isContentConfigured) return [];
  const { data, error } = await getServerClient()
    .from("v_mapping_lookup")
    .select("*")
    .or(`source_section_id.eq.${sectionId},target_section_id.eq.${sectionId}`);
  if (error) throw new Error(`getMappingsForSection: ${error.message}`);
  return data;
}

/**
 * Preview of one mapping pair for the /mapping index: the first `limit` rows
 * plus the pair's EXACT total. Never fetch the whole corpus here — PostgREST
 * caps un-ranged selects at 1,000 rows, which silently truncated the old
 * fetch-everything query (the IPC group showed 295 of 549).
 */
export async function getMappingPairPreview(
  sourceAct: string,
  limit: number,
): Promise<{ rows: MappingRow[]; total: number }> {
  if (!isContentConfigured) return { rows: [], total: 0 };
  const { data, error, count } = await getServerClient()
    .from("v_mapping_lookup")
    .select("*", { count: "exact" })
    .eq("source_act", sourceAct)
    .order("source_number", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`getMappingPairPreview(${sourceAct}): ${error.message}`);
  return { rows: data, total: count ?? data.length };
}

/** For sitemap generation: every published section's canonical path parts.
 * Paged in 1,000-row ranges — PostgREST's default cap was silently truncating
 * the sitemap to 1,000 of 3,118 URLs. */
export async function listAllSectionPaths(): Promise<{ slug: string; number: string }[]> {
  if (!isContentConfigured) return [];
  const paths: { slug: string; number: string }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await getServerClient()
      .from("act_sections")
      .select("number, acts!inner(slug)")
      .order("act_id", { ascending: true })
      .order("sort_key", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`listAllSectionPaths: ${error.message}`);
    for (const row of data) paths.push({ slug: row.acts.slug, number: row.number });
    if (data.length < pageSize) break;
  }
  return paths;
}
