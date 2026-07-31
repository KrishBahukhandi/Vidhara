import { describe, expect, it } from "vitest";

import { parseScheduleTable } from "./schedule-table";

/**
 * Fixtures are built in PDF-point space because the parser is geometric: the
 * column a word lands in is decided by its x, not by any text pattern. The
 * x-values mirror the 1963 Limitation Act print — description ≈78/104,
 * period ≈279, commencement ≈352 — so a regression here means a real one.
 */
const DESC_X = 78;
const DESC_WRAP_X = 104;
const PERIOD_X = 279;
const TIME_X = 352;

let baseline = 100;

const word = (x: number, text: string, y = baseline) =>
  `<word xMin="${x}" yMin="${y - 8}" xMax="${x + text.length * 5}" yMax="${y}">${text}</word>`;

/**
 * One printed line: [x, text] pairs sharing a baseline. Tokens are laid out at
 * roughly the print's 5pt-per-character advance so a cell's text stays inside
 * its own column — the parser splits on x, so a fixture that overflows a
 * column is testing the fixture, not the parser.
 */
const line = (cells: [number, string][]) => {
  baseline += 12;
  return cells
    .flatMap(([x, text]) => {
      let cursor = x;
      return text.split(" ").map((token) => {
        const emitted = word(cursor, token, baseline);
        cursor += token.length * 5 + 2;
        return emitted;
      });
    })
    .join("");
};

const HEADER = (): string =>
  line([
    [118, "Description of suit"],
    [261, "Period of limitation"],
    [364, "Time from which period begins to run"],
  ]);

const page = (...content: string[]) => {
  baseline = 100;
  return `<page width="595.32" height="841.92">${content.join("")}</page>`;
};

const doc = (...pages: string[]) => `<?xml version="1.0"?><doc>${pages.join("")}</doc>`;

describe("parseScheduleTable", () => {
  it("parses a three-column article into its cells", () => {
    const result = parseScheduleTable(
      doc(
        page(
          line([[200, "THE SCHEDULE"]]),
          HEADER(),
          line([[200, "FIRST DIVISION—SUITS"]]),
          line([[200, "PART I.—SUITS RELATING TO ACCOUNTS"]]),
          line([
            [DESC_X, "1. For the balance due on a"],
            [PERIOD_X, "Three years."],
            [TIME_X, "The close of the year in"],
          ]),
          line([
            [DESC_WRAP_X, "mutual account."],
            [TIME_X, "which the last item is entered."],
          ]),
        ),
      ),
    );

    expect(result.articles).toHaveLength(1);
    const [article] = result.articles;
    expect(article?.number).toBe("1");
    expect(article?.division).toBe("First Division — Suits");
    expect(article?.partNumber).toBe("I");
    expect(article?.partTitle).toBe("Suits Relating to Accounts");
    expect(article?.rows[0]?.description).toBe("For the balance due on a mutual account.");
    expect(article?.rows[0]?.period).toBe("Three years.");
    expect(article?.rows[0]?.commencement).toBe(
      "The close of the year in which the last item is entered.",
    );
  });

  it("ignores the contents-page mention and starts at the real schedule", () => {
    // The contents page names "THE SCHEDULE." ~450 lines early. Starting there
    // parsed the Act's own sections 1-32 as Articles.
    const result = parseScheduleTable(
      doc(
        page(
          line([[DESC_X, "31. Provisions as to barred suits."]]),
          line([[DESC_X, "32. [Repealed.]"]]),
          line([[200, "THE SCHEDULE."]]),
        ),
        page(
          line([[200, "THE SCHEDULE"]]),
          HEADER(),
          line([[200, "FIRST DIVISION—SUITS"]]),
          line([
            [DESC_X, "1. For a seaman's wages."],
            [PERIOD_X, "Three years."],
            [TIME_X, "The end of the voyage."],
          ]),
        ),
      ),
    );

    expect(result.articles).toHaveLength(1);
    expect(result.articles[0]?.number).toBe("1");
    expect(result.articles[0]?.rows[0]?.description).toBe("For a seaman's wages.");
  });

  it("keeps each limb's period beside its own limb", () => {
    // Article 114: two limbs, two different periods. Flattened, this reads
    // "Ninety days. The Thirty days. The" — text that looks like law.
    const result = parseScheduleTable(
      doc(
        page(
          line([[200, "THE SCHEDULE"]]),
          HEADER(),
          line([[200, "SECOND DIVISION—APPEALS"]]),
          line([[DESC_X, "1. Appeal from an order of acquittal,—"]]),
          line([
            [DESC_WRAP_X, "(a) under sub-section (1);"],
            [PERIOD_X, "Ninety days."],
            [TIME_X, "The date of the order."],
          ]),
          line([
            [DESC_WRAP_X, "(b) under sub-section (3)."],
            [PERIOD_X, "Thirty days."],
            [TIME_X, "The date of special leave."],
          ]),
        ),
      ),
    );

    const [article] = result.articles;
    expect(article?.rows).toHaveLength(3);
    expect(article?.rows[0]?.description).toBe("Appeal from an order of acquittal,—");
    expect(article?.rows[0]?.period).toBe("");
    expect(article?.rows[1]?.label).toBe("(a)");
    expect(article?.rows[1]?.period).toBe("Ninety days.");
    expect(article?.rows[2]?.label).toBe("(b)");
    expect(article?.rows[2]?.period).toBe("Thirty days.");
  });

  it("does not read a wrapped header row as a second period", () => {
    // Page 17 prints "Period of" and drops "limitation" onto the next line,
    // in the period column — Article 70 gained a row worth "limitation".
    const result = parseScheduleTable(
      doc(
        page(
          line([[200, "THE SCHEDULE"]]),
          HEADER(),
          line([[200, "FIRST DIVISION—SUITS"]]),
          line([
            [DESC_X, "1. To recover movable property."],
            [PERIOD_X, "Three years."],
            [TIME_X, "The date of refusal."],
          ]),
        ),
        page(
          line([
            [118, "Description of suit"],
            [261, "Period of"],
            [364, "Time from which period begins to run"],
          ]),
          line([[PERIOD_X, "limitation"]]),
          line([
            [DESC_X, "2. For the price of lodging."],
            [PERIOD_X, "Three years."],
            [TIME_X, "When the price becomes payable."],
          ]),
        ),
      ),
    );

    expect(result.articles[0]?.rows).toHaveLength(1);
    expect(result.articles[0]?.rows[0]?.period).toBe("Three years.");
    expect(result.articles[1]?.number).toBe("2");
  });

  it("drops footnotes and the superscript markers that reference them", () => {
    const result = parseScheduleTable(
      doc(
        page(
          line([[200, "THE SCHEDULE"]]),
          HEADER(),
          line([[200, "FIRST DIVISION—SUITS"]]),
          line([
            [DESC_X, "1. For a declaration."],
            // The marker sits on its own baseline, 4pt above the text.
            [PERIOD_X, "[Sixty days]."],
            [TIME_X, "When the right accrues."],
          ]),
          line([[PERIOD_X - 5, "1"]]),
          line([[DESC_X, "1. Subs. by Act 53 of 1964, s. 3, for “Where”."]]),
          line([[DESC_X, "continuation of that footnote."]]),
        ),
      ),
    );

    expect(result.articles).toHaveLength(1);
    expect(result.articles[0]?.rows[0]?.period).toBe("[Sixty days].");
    expect(result.articles[0]?.rows[0]?.description).toBe("For a declaration.");
  });

  it("refuses an out-of-sequence number and says so", () => {
    // Descriptions open with numerals routinely ("30 days after…"); only the
    // next expected article number opens a row.
    const result = parseScheduleTable(
      doc(
        page(
          line([[200, "THE SCHEDULE"]]),
          HEADER(),
          line([[200, "FIRST DIVISION—SUITS"]]),
          line([
            [DESC_X, "1. For compensation."],
            [PERIOD_X, "One year."],
            [TIME_X, "When the act occurs."],
          ]),
          line([
            [DESC_X, "9. For a later matter."],
            [PERIOD_X, "Three years."],
            [TIME_X, "When the right accrues."],
          ]),
        ),
      ),
    );

    expect(result.articles).toHaveLength(1);
    expect(result.diagnostics.some((d) => d.includes("expecting 2"))).toBe(true);
  });

  it("rejoins small caps in headings and words hyphenated across a line break", () => {
    const result = parseScheduleTable(
      doc(
        page(
          line([[200, "THE SCHEDULE"]]),
          HEADER(),
          line([[200, "FIRST DIVISION—SUITS"]]),
          // pdftotext emits small caps as "P" + "ART", "S" + "UITS".
          line([[200, "P ART II.—S UITS RELATING TO CONTRACTS"]]),
          line([
            [DESC_X, "1. Under sub-"],
            [PERIOD_X, "Ninety days."],
            [TIME_X, "The date of the order."],
          ]),
          line([[DESC_WRAP_X, "section (2) of section 417."]]),
        ),
      ),
    );

    expect(result.articles[0]?.partNumber).toBe("II");
    expect(result.articles[0]?.partTitle).toBe("Suits Relating to Contracts");
    expect(result.articles[0]?.rows[0]?.description).toBe("Under sub-section (2) of section 417.");
  });

  it("reports a missing schedule instead of returning a partial parse", () => {
    const result = parseScheduleTable(doc(page(line([[DESC_X, "1. A section of the act."]]))));
    expect(result.articles).toHaveLength(0);
    expect(result.diagnostics[0]).toContain("not found");
  });
});
