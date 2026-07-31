import { createClient } from "@supabase/supabase-js";
import type { Database } from "@nexlex/db";

import type { ActBundle, ScheduleBundle } from "./schema";
import { deriveSortKey } from "./sort-key";

export interface PublishOptions {
  /** Sections land in this review state. Default draft — publishing is a deliberate step. */
  reviewStatus: "draft" | "reviewed" | "published";
  /** Also set acts.published_at so RLS exposes the act publicly. */
  publishAct: boolean;
}

/**
 * Upserts a validated bundle into Supabase. Service-role only — this module
 * is the sanctioned service-key location (rules.md §11) and must never be
 * imported by app or web code.
 */
export async function publishBundle(
  bundle: ActBundle,
  options: PublishOptions,
): Promise<{ actId: string; sections: number; chapters: number }> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (scripts/ingest/.env — never commit them)",
    );
  }

  const db = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: act, error: actError } = await db
    .from("acts")
    .upsert(
      {
        slug: bundle.act.slug,
        title: bundle.act.title,
        short_title: bundle.act.shortTitle ?? null,
        abbreviation: bundle.act.abbreviation,
        year: bundle.act.year,
        category: bundle.act.category,
        status: bundle.act.status,
        enforcement_date: bundle.act.enforcementDate ?? null,
        source_url: bundle.act.sourceUrl,
        ...(options.publishAct ? { published_at: new Date().toISOString() } : {}),
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (actError) throw new Error(`acts upsert failed: ${actError.message}`);

  const chapterIds = new Map<string, string>();
  for (const chapter of bundle.chapters) {
    const { data, error } = await db
      .from("act_chapters")
      .upsert(
        {
          act_id: act.id,
          number: chapter.number,
          title: chapter.title,
          part_number: chapter.partNumber ?? null,
          part_title: chapter.partTitle ?? null,
          sort_order: chapter.sortOrder,
        },
        { onConflict: "act_id,number" },
      )
      .select("id")
      .single();
    if (error) throw new Error(`chapter ${chapter.number} upsert failed: ${error.message}`);
    chapterIds.set(chapter.number, data.id);
  }

  const rows = bundle.sections.map((section) => ({
    act_id: act.id,
    chapter_id: section.chapterNumber ? (chapterIds.get(section.chapterNumber) ?? null) : null,
    number: section.number,
    sort_key: deriveSortKey(section.number),
    marginal_note: section.marginalNote,
    body_md: section.bodyMd,
    body_plain: section.bodyPlain ?? toPlainText(section.bodyMd),
    is_repealed: section.isRepealed,
    effective_from: section.effectiveFrom ?? null,
    review_status: options.reviewStatus,
    provenance: bundle.provenance,
  }));

  const { error: sectionsError } = await db
    .from("act_sections")
    .upsert(rows, { onConflict: "act_id,number" });
  if (sectionsError) throw new Error(`sections upsert failed: ${sectionsError.message}`);

  return { actId: act.id, sections: rows.length, chapters: bundle.chapters.length };
}

/**
 * Upserts a schedule and its articles. The act must already exist — a schedule
 * is part of an act, never a way to create one, so a missing act is an error
 * rather than a silent insert.
 *
 * `rows` is the record of truth; `description`/`period`/`commencement` are
 * derived here so the flattened copy used for search can never drift from the
 * structure used for rendering.
 */
export async function publishSchedule(
  bundle: ScheduleBundle,
  options: PublishOptions,
): Promise<{ scheduleId: string; articles: number }> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (scripts/ingest/.env — never commit them)",
    );
  }

  const db = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: act, error: actError } = await db
    .from("acts")
    .select("id")
    .eq("slug", bundle.actSlug)
    .maybeSingle();
  if (actError) throw new Error(`act lookup failed: ${actError.message}`);
  if (!act) throw new Error(`act "${bundle.actSlug}" not found — publish the act before its schedule`);

  const { data: schedule, error: scheduleError } = await db
    .from("act_schedules")
    .upsert(
      {
        act_id: act.id,
        slug: bundle.schedule.slug,
        title: bundle.schedule.title,
        subtitle: bundle.schedule.subtitle ?? null,
        authority_note: bundle.schedule.authorityNote ?? null,
        column_labels: bundle.schedule.columnLabels,
        sort_order: bundle.schedule.sortOrder,
        review_status: options.reviewStatus,
        provenance: bundle.provenance,
      },
      { onConflict: "act_id,slug" },
    )
    .select("id")
    .single();
  if (scheduleError) throw new Error(`schedule upsert failed: ${scheduleError.message}`);

  const join = (parts: string[]) => parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const rows = bundle.articles.map((article) => ({
    schedule_id: schedule.id,
    number: article.number,
    sort_key: deriveSortKey(article.number),
    division: article.division ?? null,
    part_number: article.partNumber ?? null,
    part_title: article.partTitle ?? null,
    rows: article.rows,
    description: join(article.rows.map((row) => row.description)),
    period: join(article.rows.map((row) => row.period)),
    commencement: join(article.rows.map((row) => row.commencement)),
  }));

  const { error: articlesError } = await db
    .from("act_schedule_articles")
    .upsert(rows, { onConflict: "schedule_id,number" });
  if (articlesError) throw new Error(`schedule articles upsert failed: ${articlesError.message}`);

  return { scheduleId: schedule.id, articles: rows.length };
}

/** Markdown → plain text for FTS (bold/italic markers and excess whitespace stripped). */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
