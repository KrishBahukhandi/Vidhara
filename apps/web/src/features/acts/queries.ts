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

/** Published section count per act id, for the library index.
 *
 * One head-count per act rather than one grouped query: PostgREST has no
 * GROUP BY, and the alternative — pulling all 5,594 section rows and counting
 * them in JS, the way the sitemap has to — moves megabytes to produce 36
 * integers. These are HEAD requests returning no rows at all, they run in
 * parallel, and the page holding them is revalidated hourly. */
export async function countSectionsByAct(actIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!isContentConfigured) return counts;
  const client = getServerClient();
  await Promise.all(
    actIds.map(async (id) => {
      const { count, error } = await client
        .from("act_sections")
        .select("id", { count: "exact", head: true })
        .eq("act_id", id);
      // A missing count must not take the whole library page down with it —
      // the count is a nicety, the list of acts is the page.
      if (!error) counts.set(id, count ?? 0);
    }),
  );
  return counts;
}

/** One row of a First Schedule's classification of offences. */
export interface OffenceClassification {
  sectionNumber: string;
  subsection: string | null;
  cognizable: string[];
  bailable: string[];
  court: string[];
  isCognizable: boolean | null;
  isBailable: boolean | null;
  hasTiers: boolean;
  scheduleActAbbreviation: string;
}

/**
 * How a section's offence is classified — cognizable, bailable, and which court.
 *
 * Printed in the First Schedule of the PROCEDURAL code and about a section of
 * the SUBSTANTIVE one, so a BNS section page is served by the BNSS's schedule.
 * A section can return several rows: sub-sections that are classified
 * differently ("64(1)" and "64(2)"), in the order the schedule prints them.
 *
 * Fail-soft on purpose. This is an enhancement to a page whose job is to show
 * the statute, so a missing table or a bad query must leave the section
 * readable rather than take it down — the same posture countSectionsByAct
 * takes for the library's counts.
 */
interface ClassificationRow {
  section_number: string;
  subsection: string | null;
  cognizable: string[] | null;
  bailable: string[] | null;
  court: string[] | null;
  is_cognizable: boolean | null;
  is_bailable: boolean | null;
  has_tiers: boolean;
  schedule_act_abbreviation: string;
}

/**
 * The shape this one query needs, spelled out.
 *
 * `Tables<>` is generated from the LIVE schema, so a view introduced by a
 * migration that has not been applied yet is unknown to it and the typed
 * client rejects the name. Declaring the chain here keeps the call site fully
 * checked rather than reaching for `any`; delete this and let the generated
 * types take over once 0021 is applied and `generate_typescript_types` has
 * been re-run.
 */
interface ClassificationQuery {
  from(view: "v_offence_classifications"): {
    select(columns: string): {
      eq(
        column: string,
        value: string,
      ): {
        eq(
          column: string,
          value: string,
        ): {
          order(
            column: string,
            options: { ascending: boolean },
          ): Promise<{ data: ClassificationRow[] | null; error: unknown }>;
        };
      };
    };
  };
}

export async function getOffenceClassifications(
  actSlug: string,
  sectionNumber: string,
): Promise<OffenceClassification[]> {
  if (!isContentConfigured) return [];
  const { data, error } = await (getServerClient() as unknown as ClassificationQuery)
    .from("v_offence_classifications")
    .select(
      "section_number, subsection, cognizable, bailable, court, is_cognizable, is_bailable, has_tiers, schedule_act_abbreviation, sort_order",
    )
    .eq("act_slug", actSlug)
    .eq("section_number", sectionNumber)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({
    sectionNumber: row.section_number,
    subsection: row.subsection,
    cognizable: row.cognizable ?? [],
    bailable: row.bailable ?? [],
    court: row.court ?? [],
    isCognizable: row.is_cognizable,
    isBailable: row.is_bailable,
    hasTiers: row.has_tiers,
    scheduleActAbbreviation: row.schedule_act_abbreviation,
  }));
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

// ── Appendices: the forms ────────────────────────────────────────────────────

export interface AppendixSummary {
  id: string;
  letter: string;
  title: string;
  sortOrder: number;
  formCount: number;
}

export interface AppendixForm {
  number: string;
  title: string;
  bodyMd: string;
}

export async function listAppendices(actSlug: string): Promise<AppendixSummary[]> {
  if (!isContentConfigured) return [];
  const { data, error } = await getServerClient()
    .from("act_appendices")
    .select("id, letter, title, sort_order, acts!inner(slug), act_appendix_forms(count)")
    .eq("acts.slug", actSlug)
    .eq("review_status", "published")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`listAppendices: ${error.message}`);
  return (data ?? []).map((a) => ({
    id: a.id as string,
    letter: a.letter as string,
    title: a.title as string,
    sortOrder: a.sort_order as number,
    formCount: (a.act_appendix_forms as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));
}

export async function getAppendixWithForms(
  actSlug: string,
  letter: string,
): Promise<{ letter: string; title: string; forms: AppendixForm[] } | null> {
  if (!isContentConfigured) return null;
  const { data, error } = await getServerClient()
    .from("act_appendices")
    .select("letter, title, acts!inner(slug), act_appendix_forms(number, title, body_md, sort_order)")
    .eq("acts.slug", actSlug)
    .eq("letter", letter.toUpperCase())
    .eq("review_status", "published")
    .maybeSingle();
  if (error) throw new Error(`getAppendixWithForms: ${error.message}`);
  if (!data) return null;
  const forms = ((data.act_appendix_forms ?? []) as unknown as {
    number: string;
    title: string;
    body_md: string;
    sort_order: number;
  }[])
    // Ordered by printed position, not number — Appendix A's numbering restarts.
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((f) => ({ number: f.number, title: f.title, bodyMd: f.body_md }));
  return { letter: data.letter as string, title: data.title as string, forms };
}

export interface AppendixFormHit {
  formId: string;
  actSlug: string;
  actAbbreviation: string;
  appendixLetter: string;
  formNumber: string;
  formSort: number;
  title: string;
  snippet: string;
}

/** Full-text search over the Appendix forms (search_appendix_forms RPC). */
export async function searchAppendixForms(q: string): Promise<AppendixFormHit[]> {
  if (!isContentConfigured || !q.trim()) return [];
  const { data, error } = await getServerClient().rpc("search_appendix_forms", { q: q.trim() });
  if (error) {
    console.error("searchAppendixForms:", error.message);
    return [];
  }
  return (data ?? []).map((f) => ({
    formId: f.form_id,
    actSlug: f.act_slug,
    actAbbreviation: f.act_abbreviation,
    appendixLetter: f.appendix_letter,
    formNumber: f.form_number,
    formSort: f.form_sort,
    title: f.title,
    snippet: f.snippet,
  }));
}

/**
 * The text of the provisions on the OTHER side of a section's mappings.
 *
 * The mapping card names the counterpart and shows its marginal note, which
 * tells a reader that IPC §124 became BNS §151 but not how the wording
 * changed — half of the comparison this product exists to make. Search Console
 * says the queries arriving are overwhelmingly bare references ("151 bns",
 * "bns 180", "ipc75"): people looking up one section and, by the shape of the
 * query, often the other.
 *
 * Fetched separately and rendered as a clearly-labelled block, never merged
 * into the section's own body. Two provisions of two different Acts reading as
 * one text is the exact failure D-032 found with State amendments.
 */
export async function getCounterpartTexts(
  sectionIds: string[],
): Promise<Map<string, { number: string; marginalNote: string; bodyMd: string; actSlug: string; actAbbreviation: string }>> {
  const out = new Map<
    string,
    { number: string; marginalNote: string; bodyMd: string; actSlug: string; actAbbreviation: string }
  >();
  if (!isContentConfigured || sectionIds.length === 0) return out;
  const { data, error } = await getServerClient()
    .from("act_sections")
    .select("id, number, marginal_note, body_md, acts!inner(slug, abbreviation)")
    .in("id", sectionIds);
  if (error) {
    // The counterpart is an enrichment; the section itself must still render.
    console.error("getCounterpartTexts:", error.message);
    return out;
  }
  for (const row of data ?? []) {
    const acts = row.acts as unknown as { slug: string; abbreviation: string };
    out.set(row.id as string, {
      number: row.number as string,
      marginalNote: row.marginal_note as string,
      bodyMd: row.body_md as string,
      actSlug: acts.slug,
      actAbbreviation: acts.abbreviation,
    });
  }
  return out;
}
