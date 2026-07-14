import { createClient } from "@supabase/supabase-js";
import type { Database } from "@nexlex/db";

import type { ActBundle } from "./schema";
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

/** Markdown → plain text for FTS (bold/italic markers and excess whitespace stripped). */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
