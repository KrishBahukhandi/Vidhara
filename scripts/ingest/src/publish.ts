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
): Promise<{ actId: string; sections: number; chapters: number; stateAmendments: number }> {
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

  // A division is identified by kind + number + parent Part, because Chapter
  // numbering restarts inside each Part (ARB: CHAPTER I in PART I and again in
  // PART II). Keyed the same way here so a section resolves to the right one.
  const divisionKey = (number: string, partNumber?: string) => `${number}|${partNumber ?? ""}`;
  const chapterIds = new Map<string, string>();
  for (const chapter of bundle.chapters) {
    const { data, error } = await db
      .from("act_chapters")
      .upsert(
        {
          act_id: act.id,
          number: chapter.number,
          title: chapter.title,
          kind: chapter.kind,
          unnumbered: chapter.unnumbered ?? false,
          part_number: chapter.partNumber ?? "",
          part_title: chapter.partTitle ?? null,
          sort_order: chapter.sortOrder,
        },
        { onConflict: "act_id,kind,number,part_number" },
      )
      .select("id")
      .single();
    if (error) throw new Error(`chapter ${chapter.number} upsert failed: ${error.message}`);
    chapterIds.set(divisionKey(chapter.number, chapter.partNumber), data.id);
  }

  const rows = bundle.sections.map((section) => ({
    act_id: act.id,
    chapter_id: section.chapterNumber
      ? (chapterIds.get(divisionKey(section.chapterNumber, section.partNumber)) ?? null)
      : null,
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

  // Sections the bundle no longer produces are removed, for the same reason
  // divisions are below — and this one had teeth. IPC 354E, 376F, 509A, 509B
  // (Chhattisgarh), 379A, 379B (Gujarat) and 382B-382F (Tripura), plus IEA
  // 114B, were published as central law before the State-amendment guard
  // existed. Every later republish upserted around them and left all twelve
  // standing, because nothing ever deleted a section. Upsert-only means a
  // defect can be fixed in the bundle and stay live indefinitely.
  const keptNumbers = rows.map((row) => row.number);
  const { data: removed, error: staleSectionError } = await db
    .from("act_sections")
    .delete()
    .eq("act_id", act.id)
    .not("number", "in", `(${keptNumbers.map((n) => `"${n}"`).join(",")})`)
    .select("number");
  if (staleSectionError) throw new Error(`stale section cleanup failed: ${staleSectionError.message}`);
  if (removed && removed.length > 0) {
    console.warn(
      `  ⚠ removed ${removed.length} section(s) no longer in the bundle: ${removed.map((r) => r.number).join(", ")}`,
    );
  }

  // Upsert alone leaves divisions the bundle no longer produces. That is not
  // hypothetical: changing the division key left ARB with 28 rows for 17
  // divisions, the extras being its pre-two-level "Chapter V", "C", "S". They
  // were invisible on the act page — sections had already moved to the new
  // rows — which is exactly what makes stale content dangerous. Runs after the
  // sections upsert, so nothing is pointing at a row when it is removed.
  const keptIds = [...chapterIds.values()];
  if (keptIds.length > 0) {
    const { error: staleError } = await db
      .from("act_chapters")
      .delete()
      .eq("act_id", act.id)
      .not("id", "in", `(${keptIds.join(",")})`);
    if (staleError) throw new Error(`stale chapter cleanup failed: ${staleError.message}`);
  }

  // ── State amendments (D-053) ───────────────────────────────────────────────
  // Replaced wholesale rather than upserted: an amendment the bundle no longer
  // carries has been withdrawn or was mis-parsed, and either way leaving it
  // attributed to a State would be worse than losing it. Cheap — the largest
  // act in the corpus has 154.
  let stateAmendments = 0;
  if (bundle.stateAmendments) {
    const { data: sectionIds, error: idError } = await db
      .from("act_sections")
      .select("id, number")
      .eq("act_id", act.id);
    if (idError) throw new Error(`section id lookup failed: ${idError.message}`);
    const idByNumber = new Map((sectionIds ?? []).map((s) => [s.number, s.id]));

    const { error: clearError } = await db
      .from("act_state_amendments")
      .delete()
      .in("section_id", [...idByNumber.values()]);
    if (clearError) throw new Error(`state amendment cleanup failed: ${clearError.message}`);

    const amendmentRows = bundle.stateAmendments.flatMap((amendment, index) => {
      const sectionId = idByNumber.get(amendment.sectionNumber);
      // An amendment we cannot attach to a real section is dropped loudly. It
      // must never land on the nearest section instead: a State amendment shown
      // against the wrong provision is the D-032 defect wearing a label.
      if (!sectionId) {
        console.warn(
          `  ⚠ State amendment for §${amendment.sectionNumber} (${amendment.state}) has no such section — dropped`,
        );
        return [];
      }
      return [
        {
          section_id: sectionId,
          state: amendment.state,
          citation: amendment.citation,
          amendment_text: amendment.text,
          sort_order: index,
        },
      ];
    });

    if (amendmentRows.length > 0) {
      const { error: amendmentError } = await db
        .from("act_state_amendments")
        .upsert(amendmentRows, { onConflict: "section_id,citation" });
      if (amendmentError) {
        throw new Error(`state amendments upsert failed: ${amendmentError.message}`);
      }
    }
    stateAmendments = amendmentRows.length;
  }

  return {
    actId: act.id,
    sections: rows.length,
    chapters: bundle.chapters.length,
    stateAmendments,
  };
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
