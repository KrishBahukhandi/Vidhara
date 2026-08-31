import { describe, expect, it } from "vitest";

import { toPlainText } from "./publish";
import { scheduleBundleSchema } from "./schema";
import { deriveSortKey } from "./sort-key";
import { validateBundle } from "./validate";

const validBundle = {
  act: {
    slug: "ica",
    title: "The Indian Contract Act, 1872",
    abbreviation: "ICA",
    year: 1872,
    category: "civil",
    status: "active",
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2187",
  },
  chapters: [{ number: "I", title: "Of the Communication, Acceptance and Revocation of Proposals", sortOrder: 1 }],
  sections: [
    {
      number: "3",
      chapterNumber: "I",
      marginalNote: "Communication, acceptance and revocation of proposals",
      bodyMd: "The communication of proposals, the acceptance of proposals, and the revocation of proposals and acceptances, respectively, are deemed to be made by any act or omission of the party proposing, accepting or revoking.",
    },
    {
      number: "4",
      chapterNumber: "I",
      marginalNote: "Communication when complete",
      bodyMd: "The communication of a proposal is complete when it comes to the knowledge of the person to whom it is made.",
    },
  ],
  provenance: "India Code HTML export 2026-07; prepared by KB",
};

describe("deriveSortKey", () => {
  it("orders plain numbers", () => {
    expect(deriveSortKey("302")).toBe(302);
  });
  it("orders single-letter insertions after the base", () => {
    expect(deriveSortKey("34A")).toBeCloseTo(34.01);
    expect(deriveSortKey("65B")).toBeCloseTo(65.02);
    expect(deriveSortKey("34A")).toBeGreaterThan(deriveSortKey("34"));
    expect(deriveSortKey("34B")).toBeGreaterThan(deriveSortKey("34A"));
    expect(deriveSortKey("35")).toBeGreaterThan(deriveSortKey("34B"));
  });
  it("orders double-letter insertions", () => {
    expect(deriveSortKey("20AA")).toBeGreaterThan(deriveSortKey("20A"));
    expect(deriveSortKey("20B")).toBeGreaterThan(deriveSortKey("20AA"));
  });
  it("rejects malformed numbers", () => {
    expect(() => deriveSortKey("30-A")).toThrow();
    expect(() => deriveSortKey("A302")).toThrow();
    expect(() => deriveSortKey("")).toThrow();
  });
});

describe("validateBundle", () => {
  it("accepts a well-formed bundle", () => {
    const report = validateBundle(validBundle);
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.bundle?.sections).toHaveLength(2);
  });

  it("rejects duplicate section numbers", () => {
    const bundle = structuredClone(validBundle);
    bundle.sections[1]!.number = "3";
    const report = validateBundle(bundle);
    expect(report.ok).toBe(false);
    expect(report.errors.join()).toContain("Duplicate section number 3");
  });

  it("rejects unknown chapter references", () => {
    const bundle = structuredClone(validBundle);
    bundle.sections[0]!.chapterNumber = "XIV";
    const report = validateBundle(bundle);
    expect(report.ok).toBe(false);
    expect(report.errors.join()).toContain('unknown chapter "XIV"');
  });

  it("rejects placeholder bodies", () => {
    const bundle = structuredClone(validBundle);
    bundle.sections[0]!.bodyMd = "*Full text pending ingestion from India Code.*";
    const report = validateBundle(bundle);
    expect(report.ok).toBe(false);
    expect(report.errors.join()).toContain("pending ingestion");
  });

  it("rejects out-of-order sections", () => {
    const bundle = structuredClone(validBundle);
    bundle.sections.reverse();
    const report = validateBundle(bundle);
    expect(report.ok).toBe(false);
    expect(report.errors.join()).toContain("out of order");
  });

  it("rejects dev-sample provenance", () => {
    const bundle = structuredClone(validBundle);
    bundle.provenance = "dev-sample: hand-seeded";
    const report = validateBundle(bundle);
    expect(report.ok).toBe(false);
  });

  it("warns (not errors) on numbering gaps", () => {
    const bundle = structuredClone(validBundle);
    bundle.sections[1]!.number = "9";
    const report = validateBundle(bundle);
    expect(report.ok).toBe(true);
    expect(report.warnings.join()).toContain("Gap in section numbering");
  });
});

describe("toPlainText", () => {
  it("strips markdown emphasis and collapses whitespace", () => {
    expect(toPlainText("**Whoever** commits *murder*\n\nshall be punished")).toBe(
      "Whoever commits murder shall be punished",
    );
  });
});

/**
 * A schedule bundle is a table in one of two shapes (0026): the Limitation
 * Act's three named columns, or a table of any width whose cells are
 * positional. The gates here are the ones a wrong parse would otherwise slip
 * past looking like law.
 */
describe("schedule bundles", () => {
  const celled = {
    actSlug: "constitution",
    schedule: {
      slug: "appendix-i-first",
      title: "First Schedule",
      columnLabels: ["Sl. No.", "Name of Chhits", "Chhit No.", "Area in acres"],
      sortOrder: 1,
    },
    articles: [{ number: "1", cells: ["1", "Baragachhi", "12", "34.90"] }],
    provenance: "Official India Code text, automated parse of the annexure",
  };

  it("accepts a celled table whose rows are as wide as its headings", () => {
    expect(scheduleBundleSchema.safeParse(celled).success).toBe(true);
  });

  it("rejects a row that is not as wide as the headings", () => {
    // Not a row that lost a value: a row whose every cell after the gap is
    // filed under the wrong heading.
    const bundle = structuredClone(celled);
    bundle.articles[0]!.cells = ["1", "Baragachhi", "34.90"];
    const parsed = scheduleBundleSchema.safeParse(bundle);
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toContain("3 cells against 4 column heading(s)");
  });

  it("rejects an article that is neither limbed nor celled", () => {
    const bundle = structuredClone(celled) as { articles: { number: string; cells?: string[] }[] };
    delete bundle.articles[0]!.cells;
    expect(scheduleBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it("still takes the Limitation Act's three columns", () => {
    const limbed = {
      ...celled,
      actSlug: "lim",
      schedule: {
        slug: "schedule",
        title: "The Schedule",
        columnLabels: ["Description of suit", "Period of limitation", "Time from which period begins to run"],
        sortOrder: 0,
      },
      articles: [
        {
          number: "137",
          rows: [
            {
              description: "Any other application for which no period of limitation is provided elsewhere in this Division.",
              period: "Three years",
              commencement: "When the right to apply accrues.",
            },
          ],
        },
      ],
    };
    expect(scheduleBundleSchema.safeParse(limbed).success).toBe(true);
  });
});
