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
  chapter_id: string | null;
}

export interface ChapterListItem {
  id: string;
  number: string;
  title: string;
  sort_order: number;
  /** "chapter" or "part" — the Constitution has Parts, the IPC has Chapters,
   * and citing one as the other is wrong. */
  kind: string;
}

export interface SectionWithAct extends Section {
  acts: Pick<Act, "slug" | "abbreviation" | "title" | "year" | "source_url" | "status">;
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
    .select("id, number, marginal_note, chapter_id, acts!inner(slug)")
    .eq("acts.slug", slug)
    .order("sort_key", { ascending: true });
  if (error) throw new Error(`listSectionsByAct: ${error.message}`);
  return data.map(({ id, number, marginal_note, chapter_id }) => ({
    id,
    number,
    marginal_note,
    chapter_id,
  }));
}

export async function listChaptersByAct(slug: string): Promise<ChapterListItem[]> {
  if (!isContentConfigured) return [];
  const { data, error } = await getServerClient()
    .from("act_chapters")
    .select("id, number, title, sort_order, kind, acts!inner(slug)")
    .eq("acts.slug", slug)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`listChaptersByAct: ${error.message}`);
  return data.map(({ id, number, title, sort_order, kind }) => ({
    id,
    number,
    title,
    sort_order,
    kind,
  }));
}

export async function getSectionWithAct(
  slug: string,
  number: string,
): Promise<SectionWithAct | null> {
  if (!isContentConfigured) return null;
  const { data, error } = await getServerClient()
    .from("act_sections")
    .select("*, acts!inner(slug, abbreviation, title, year, source_url, status)")
    .eq("acts.slug", slug)
    .eq("number", number)
    .maybeSingle();
  if (error) throw new Error(`getSectionWithAct: ${error.message}`);
  return data as SectionWithAct | null;
}

export interface AdjacentSection {
  number: string;
  marginal_note: string;
}

/**
 * Previous/next sections within an act, by sort_key — powers sequential
 * reading (the way people actually study). Two tiny indexed lookups, not a
 * full-list scan, so it stays cheap on 500-section acts.
 */
export async function getAdjacentSections(
  actId: string,
  sortKey: number,
): Promise<{ prev: AdjacentSection | null; next: AdjacentSection | null }> {
  if (!isContentConfigured) return { prev: null, next: null };
  const db = getServerClient();
  const [prevRes, nextRes] = await Promise.all([
    db
      .from("act_sections")
      .select("number, marginal_note")
      .eq("act_id", actId)
      .lt("sort_key", sortKey)
      .order("sort_key", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
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

export interface SearchHit {
  section_id: string;
  act_abbreviation: string;
  act_slug: string;
  number: string;
  marginal_note: string;
  rank: number;
  snippet: string;
}

/** Full-text search over all sections (search_sections RPC: FTS + trigram). */
export async function searchSections(q: string): Promise<SearchHit[]> {
  if (!isContentConfigured || !q.trim()) return [];
  const { data, error } = await getServerClient().rpc("search_sections", { q: q.trim() });
  if (error) throw new Error(`searchSections: ${error.message}`);
  return data;
}

export interface AskResult {
  results: SearchHit[];
  /** Statutory phrases the AI mapped the question to (null if AI didn't run). */
  interpretedAs: string[] | null;
  ai: boolean;
}

/**
 * Grounded AI-assisted retrieval (the `ask` Edge Function): a natural-language
 * question → real sections. The model only rewrites the query into statutory
 * wording; every result is an actual section (decision D-004). Used as a
 * fallback when plain FTS finds nothing.
 */
export async function askSections(q: string): Promise<AskResult> {
  const empty: AskResult = { results: [], interpretedAs: null, ai: false };
  if (!isContentConfigured || !q.trim()) return empty;
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const res = await fetch(`${base}/functions/v1/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key ?? "" },
      body: JSON.stringify({ query: q.trim() }),
      cache: "no-store",
    });
    if (!res.ok) return empty;
    const data = (await res.json()) as Partial<AskResult>;
    return {
      results: data.results ?? [],
      interpretedAs: data.interpretedAs ?? null,
      ai: Boolean(data.ai),
    };
  } catch {
    return empty;
  }
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

export type ActSchedule = Tables<"act_schedules">;

/** One limb of an article. Articles 114-116 of the Limitation Act carry
 * several, each with its own period; single-limb articles have exactly one. */
export interface ScheduleRow {
  label?: string;
  description: string;
  period: string;
  commencement: string;
}

export interface ScheduleArticle {
  id: string;
  number: string;
  division: string | null;
  part_number: string | null;
  part_title: string | null;
  rows: ScheduleRow[];
}

export async function listSchedulesByAct(slug: string): Promise<ActSchedule[]> {
  if (!isContentConfigured) return [];
  const { data, error } = await getServerClient()
    .from("act_schedules")
    .select("*, acts!inner(slug)")
    .eq("acts.slug", slug)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`listSchedulesByAct(${slug}): ${error.message}`);
  return data;
}

export async function getSchedule(
  actSlug: string,
  scheduleSlug: string,
): Promise<{ schedule: ActSchedule; articles: ScheduleArticle[] } | null> {
  if (!isContentConfigured) return null;
  const client = getServerClient();
  const { data: schedule, error } = await client
    .from("act_schedules")
    .select("*, acts!inner(slug)")
    .eq("acts.slug", actSlug)
    .eq("slug", scheduleSlug)
    .maybeSingle();
  if (error) throw new Error(`getSchedule(${actSlug}/${scheduleSlug}): ${error.message}`);
  if (!schedule) return null;

  const { data: articles, error: articlesError } = await client
    .from("act_schedule_articles")
    .select("id, number, division, part_number, part_title, rows")
    .eq("schedule_id", schedule.id)
    .order("sort_key", { ascending: true });
  if (articlesError) throw new Error(`getSchedule articles: ${articlesError.message}`);

  return {
    schedule,
    articles: articles.map((article) => ({
      ...article,
      rows: article.rows as unknown as ScheduleRow[],
    })),
  };
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
