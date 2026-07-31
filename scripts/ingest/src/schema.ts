import { z } from "zod";

/**
 * Act bundle — the pipeline's interchange format (parse → validate → review →
 * publish, phases.md Phase 1). Parsers for sources (India Code HTML/PDF)
 * produce bundles; humans review the JSON; `publish` upserts to Supabase.
 * Mappings travel in separate mapping bundles (added when the first real
 * mapping dataset is authored).
 */
export const sectionSchema = z.object({
  number: z.string().trim().regex(/^\d{1,4}[A-Z]{0,2}$/, "Section number like 302, 34A, 65B"),
  chapterNumber: z.string().trim().min(1).optional(),
  /** Enclosing Part, present only when `chapterNumber` names a Chapter nested
   * inside one. The pair identifies the division: ARB prints a CHAPTER I under
   * both PART I and PART II. */
  partNumber: z.string().trim().min(1).optional(),
  marginalNote: z.string().trim().min(1, "Marginal note (section title) is required"),
  bodyMd: z.string().trim().min(1, "Section body is required"),
  /** Plain text for FTS; derived from bodyMd when omitted. */
  bodyPlain: z.string().trim().min(1).optional(),
  isRepealed: z.boolean().default(false),
  effectiveFrom: z.iso.date().optional(),
});

export const chapterSchema = z.object({
  number: z.string().trim().min(1),
  title: z.string().trim().min(1),
  /** Which keyword the source printed. Defaults to chapter: the acts ingested
   * before this field existed (IPC, CrPC, Evidence, Contract, the 2023 codes)
   * all divide into Chapters. */
  kind: z.enum(["chapter", "part"]).default("chapter"),
  partNumber: z.string().trim().min(1).optional(),
  partTitle: z.string().trim().min(1).optional(),
  sortOrder: z.number().int().nonnegative(),
});

export const actBundleSchema = z.object({
  act: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().trim().min(1),
    shortTitle: z.string().trim().min(1).optional(),
    abbreviation: z.string().trim().regex(/^[A-Z]{2,10}$/),
    year: z.number().int().min(1600).max(2100),
    category: z.string().trim().min(1).default("general"),
    status: z.enum(["active", "repealed", "replaced"]).default("active"),
    enforcementDate: z.iso.date().optional(),
    sourceUrl: z.url({ protocol: /^https$/ }),
  }),
  chapters: z.array(chapterSchema).default([]),
  sections: z.array(sectionSchema).min(1, "A bundle must contain at least one section"),
  /** Where this text came from and who prepared it — required, never "dev-sample". */
  provenance: z
    .string()
    .trim()
    .min(10, "Describe the source and preparer")
    .refine((value) => !value.startsWith("dev-sample"), {
      message: "dev-sample provenance is reserved for the throwaway seed",
    }),
});

export type ActBundle = z.infer<typeof actBundleSchema>;
export type BundleSection = z.infer<typeof sectionSchema>;

/**
 * Schedule bundles — for schedules that are tables rather than sectional text
 * (D-035). A row may legitimately carry no period: the source prints lead-in
 * limbs and Explanation clauses with the period column blank, so requiring one
 * would force us to invent law. Description is always present.
 */
export const scheduleRowSchema = z.object({
  label: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1, "Every schedule row needs its description"),
  period: z.string().trim().default(""),
  commencement: z.string().trim().default(""),
});

export const scheduleArticleSchema = z.object({
  number: z.string().trim().regex(/^\d{1,4}[A-Z]{0,2}$/, "Article number like 1, 137"),
  division: z.string().trim().min(1).optional(),
  partNumber: z.string().trim().min(1).optional(),
  partTitle: z.string().trim().min(1).optional(),
  rows: z.array(scheduleRowSchema).min(1, "An article must have at least one row"),
});

export const scheduleBundleSchema = z.object({
  /** The act must already exist — schedules attach to it, never create it. */
  actSlug: z.string().regex(/^[a-z0-9-]+$/),
  schedule: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().trim().min(1),
    subtitle: z.string().trim().min(1).optional(),
    authorityNote: z.string().trim().min(1).optional(),
    columnLabels: z.array(z.string().trim().min(1)).min(2, "A table needs at least two columns"),
    sortOrder: z.number().int().nonnegative().default(0),
  }),
  articles: z.array(scheduleArticleSchema).min(1, "A schedule bundle must contain articles"),
  provenance: z.string().trim().min(10, "Describe the source and preparer"),
});

export type ScheduleBundle = z.infer<typeof scheduleBundleSchema>;
export type BundleScheduleArticle = z.infer<typeof scheduleArticleSchema>;
