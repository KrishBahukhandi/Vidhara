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
  /** Parent Part of a nested Chapter; "" for a top-level division. */
  part_number: string;
  part_title: string | null;
  /** Titled but unnumbered in the source ("PRELIMINARY"); `number` holds the
   * title, so only the title is rendered. */
  unnumbered: boolean;
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
    .select("id, number, title, sort_order, kind, part_number, part_title, unnumbered, acts!inner(slug)")
    .eq("acts.slug", slug)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`listChaptersByAct: ${error.message}`);
  return data.map(({ id, number, title, sort_order, kind, part_number, part_title, unnumbered }) => ({
    id,
    number,
    title,
    sort_order,
    kind,
    part_number,
    part_title,
    unnumbered,
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

export type StateAmendmentRow = Tables<"act_state_amendments">;

/**
 * State amendments for one section (D-053).
 *
 * These are NOT part of the section's text and are never merged into it — the
 * whole point of the D-032 guard is that a Chhattisgarh amendment must not read
 * as the Indian Penal Code. They are fetched separately so the page can present
 * them as what they are: law in one State, with its own authority.
 */
export async function getStateAmendmentsForSection(
  sectionId: string,
): Promise<StateAmendmentRow[]> {
  if (!isContentConfigured) return [];
  const { data, error } = await getServerClient()
    .from("act_state_amendments")
    .select("*")
    .eq("section_id", sectionId)
    .order("sort_order");
  if (error) throw new Error(`getStateAmendmentsForSection: ${error.message}`);
  return data;
}

export async function countStateAmendments(): Promise<number> {
  if (!isContentConfigured) return 0;
  const { count, error } = await getServerClient()
    .from("act_state_amendments")
    .select("id", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
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

/**
 * Exact published counts for the verification page. `head: true` asks
 * PostgREST for the count without the rows — the alternative, fetching to
 * count, silently caps at 1,000 and has already under-reported once (D-020).
 */
export async function countPublishedSections(): Promise<number> {
  if (!isContentConfigured) return 0;
  const { count, error } = await getServerClient()
    .from("act_sections")
    .select("id", { count: "exact", head: true })
    .eq("review_status", "published");
  if (error) throw new Error(`countPublishedSections: ${error.message}`);
  return count ?? 0;
}

export async function countPublishedMappings(): Promise<number> {
  if (!isContentConfigured) return 0;
  const { count, error } = await getServerClient()
    .from("law_mappings")
    .select("id", { count: "exact", head: true })
    .eq("review_status", "published");
  if (error) throw new Error(`countPublishedMappings: ${error.message}`);
  return count ?? 0;
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
export async function listAllSectionPaths(): Promise<
  { slug: string; number: string; updatedAt: string }[]
> {
  if (!isContentConfigured) return [];
  const paths: { slug: string; number: string; updatedAt: string }[] = [];
  const pageSize = 1000;
  // Paginated because PostgREST caps a plain select at 1,000 rows — the exact
  // default that silently truncated the sitemap to 1,000 of 3,129 URLs at V0.1.
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await getServerClient()
      .from("act_sections")
      .select("number, updated_at, acts!inner(slug)")
      .order("act_id", { ascending: true })
      .order("sort_key", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`listAllSectionPaths: ${error.message}`);
    for (const row of data) {
      paths.push({ slug: row.acts.slug, number: row.number, updatedAt: row.updated_at });
    }
    if (data.length < pageSize) break;
  }
  return paths;
}

// ── First Schedule: Orders and Rules (CPC) ───────────────────────────────────

export interface OrderSummary {
  id: string;
  number: string;
  title: string;
  sortOrder: number;
  ruleCount: number;
}

export interface OrderRule {
  number: string;
  marginalNote: string;
  bodyMd: string;
}

/** Orders of an act's First Schedule, in printed order, with rule counts. */
export async function listOrders(actSlug: string): Promise<OrderSummary[]> {
  if (!isContentConfigured) return [];
  const { data, error } = await getServerClient()
    .from("act_orders")
    .select("id, number, title, sort_order, acts!inner(slug), act_order_rules(count)")
    .eq("acts.slug", actSlug)
    .eq("review_status", "published")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`listOrders: ${error.message}`);
  return (data ?? []).map((o) => ({
    id: o.id as string,
    number: o.number as string,
    title: o.title as string,
    sortOrder: o.sort_order as number,
    // PostgREST returns an aggregate as [{ count }].
    ruleCount: (o.act_order_rules as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));
}

/**
 * One Order with its rules. Matched on sort_order rather than number because
 * the number is not unique — the Commercial Courts Act substituted a parallel
 * Order XI and the source carries both.
 */
export async function getOrderWithRules(
  actSlug: string,
  sortOrder: number,
): Promise<{ number: string; title: string; rules: OrderRule[] } | null> {
  if (!isContentConfigured) return null;
  const { data, error } = await getServerClient()
    .from("act_orders")
    .select("number, title, acts!inner(slug), act_order_rules(number, sort_key, marginal_note, body_md)")
    .eq("acts.slug", actSlug)
    .eq("sort_order", sortOrder)
    .eq("review_status", "published")
    .maybeSingle();
  if (error) throw new Error(`getOrderWithRules: ${error.message}`);
  if (!data) return null;
  const rules = ((data.act_order_rules ?? []) as unknown as {
    number: string;
    sort_key: number;
    marginal_note: string;
    body_md: string;
  }[])
    .sort((a, b) => a.sort_key - b.sort_key)
    .map((r) => ({ number: r.number, marginalNote: r.marginal_note, bodyMd: r.body_md }));
  return { number: data.number as string, title: data.title as string, rules };
}

/** Every Order sharing a printed number — usually one, two for Order XI. */
export async function findOrdersByNumber(
  actSlug: string,
  number: string,
): Promise<OrderSummary[]> {
  const all = await listOrders(actSlug);
  return all.filter((o) => o.number.toUpperCase() === number.toUpperCase());
}

export interface OrderRuleHit {
  ruleId: string;
  actSlug: string;
  actAbbreviation: string;
  orderNumber: string;
  orderTitle: string;
  orderSort: number;
  ruleNumber: string;
  marginalNote: string;
  snippet: string;
}

/**
 * Full-text search over Orders and Rules (search_order_rules RPC).
 *
 * Run alongside section search rather than merged into it: a rule and a section
 * are cited differently ("Order VII, Rule 11" is not a section number) and land
 * on different routes, so a single ranked list would blur which is which. The
 * page shows them as separate groups.
 */
export async function searchOrderRules(q: string): Promise<OrderRuleHit[]> {
  if (!isContentConfigured || !q.trim()) return [];
  const { data, error } = await getServerClient().rpc("search_order_rules", { q: q.trim() });
  if (error) {
    // Never let the Orders break section search — this is an addition to a
    // working surface, not a replacement for it.
    console.error("searchOrderRules:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    ruleId: r.rule_id,
    actSlug: r.act_slug,
    actAbbreviation: r.act_abbreviation,
    orderNumber: r.order_number,
    orderTitle: r.order_title,
    orderSort: r.order_sort,
    ruleNumber: r.rule_number,
    marginalNote: r.marginal_note,
    snippet: r.snippet,
  }));
}
