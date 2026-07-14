import { actBundleSchema, type ActBundle } from "./schema";
import { deriveSortKey } from "./sort-key";

export interface ValidationReport {
  ok: boolean;
  errors: string[];
  /** Non-blocking observations for the human reviewer. */
  warnings: string[];
  bundle?: ActBundle;
}

/**
 * Structural validation pass (phases.md Phase 1 checklist): schema shape,
 * duplicate/unsortable section numbers, orphan chapter references, ordering
 * continuity. Errors block publishing; warnings go to the review notes.
 */
export function validateBundle(input: unknown): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const parsed = actBundleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      ),
      warnings,
    };
  }
  const bundle = parsed.data;

  const chapterNumbers = new Set(bundle.chapters.map((chapter) => chapter.number));
  const seenSections = new Set<string>();
  const sortKeys: number[] = [];

  for (const section of bundle.sections) {
    if (seenSections.has(section.number)) {
      errors.push(`Duplicate section number ${section.number}`);
    }
    seenSections.add(section.number);

    try {
      sortKeys.push(deriveSortKey(section.number));
    } catch (error) {
      errors.push((error as Error).message);
    }

    if (section.chapterNumber && !chapterNumbers.has(section.chapterNumber)) {
      errors.push(
        `Section ${section.number} references unknown chapter "${section.chapterNumber}"`,
      );
    }

    if (/pending ingestion/i.test(section.bodyMd)) {
      errors.push(
        `Section ${section.number} contains a "pending ingestion" placeholder — bundles must carry real text`,
      );
    }
  }

  for (let i = 1; i < sortKeys.length; i++) {
    const prev = sortKeys[i - 1];
    const current = sortKeys[i];
    if (prev !== undefined && current !== undefined && current <= prev) {
      errors.push(
        `Sections out of order at ${bundle.sections[i]?.number} (sort ${current} after ${prev})`,
      );
    }
  }

  // Base-number gaps are legal (repeals) but worth a reviewer's glance.
  const bases = sortKeys.map(Math.floor);
  for (let i = 1; i < bases.length; i++) {
    const prev = bases[i - 1];
    const current = bases[i];
    if (prev !== undefined && current !== undefined && current - prev > 1) {
      warnings.push(`Gap in section numbering between ${prev} and ${current} — confirm intentional`);
    }
  }

  return errors.length > 0 ? { ok: false, errors, warnings } : { ok: true, errors, warnings, bundle };
}
