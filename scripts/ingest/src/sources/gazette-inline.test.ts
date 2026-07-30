import { describe, expect, it } from "vitest";

import { parseInlineAct } from "./gazette-inline";

/** Builds one bbox `<word>` tag. Heights mirror the India Code PDFs:
 * body ≈10pt, illustrations/footnotes ≈8.2pt, superscripts ≈6.3pt. */
const word = (x: number, y: number, h: number, text: string) =>
  `<word xMin="${x}" yMin="${y}" xMax="${x + text.length * 5}" yMax="${y + h}">${text}</word>`;

/** Lays each string out as one visual line (12pt apart), splitting on spaces. */
function lines(specs: Array<{ h: number; text: string }>, startY = 50): string {
  let y = startY;
  const out: string[] = [];
  for (const { h, text } of specs) {
    let x = 72;
    for (const token of text.split(" ")) {
      out.push(word(x, y, h, token));
      x += token.length * 5 + 5;
    }
    y += 14;
  }
  return out.join("\n");
}

const page = (content: string) => `<page width="595" height="842">\n${content}\n</page>`;
const doc = (...pages: string[]) =>
  `<?xml version="1.0"?>\n<html><body>\n${pages.map(page).join("\n")}\n</body></html>`;

const PREAMBLE = { h: 10, text: "It is hereby enacted as follows:—" };

describe("parseInlineAct illustrations", () => {
  it("keeps small-font illustration lines after the heading, ends at next body line", () => {
    const xhtml = doc(
      lines([
        PREAMBLE,
        { h: 10, text: "1. Definition.—Body text here." },
        { h: 9.9, text: "Illustrations" },
        { h: 8.2, text: "(a) A does X. This is theft." },
        { h: 8.2, text: "(b) B does Y. This is not." },
        { h: 10, text: "2. Next.—Second body." },
      ]),
    );
    const { sections } = parseInlineAct(xhtml);
    expect(sections.map((s) => s.number)).toEqual(["1", "2"]);
    expect(sections[0]!.bodyMd).toBe(
      "Body text here. Illustrations (a) A does X. This is theft. (b) B does Y. This is not.",
    );
    expect(sections[1]!.bodyMd).toBe("Second body.");
  });

  it("keepIllustrations: false replicates the legacy drop (parity escape hatch)", () => {
    const xhtml = doc(
      lines([
        PREAMBLE,
        { h: 10, text: "1. Definition.—Body text here." },
        { h: 9.9, text: "Illustrations" },
        { h: 8.2, text: "(a) A does X." },
        { h: 10, text: "2. Next.—Second body." },
      ]),
    );
    const { sections } = parseInlineAct(xhtml, { keepIllustrations: false });
    expect(sections[0]!.bodyMd).toBe("Body text here. Illustrations");
  });

  it("still drops footnotes: outside a block, and via the latch when one follows a block", () => {
    const xhtml = doc(
      lines([
        PREAMBLE,
        { h: 10, text: "1. Definition.—Body text here." },
        { h: 9.9, text: "Illustrations" },
        { h: 8.2, text: "(a) A does X." },
        // Footnote block directly below the illustrations — no body between.
        { h: 8.2, text: "1. Subs. by Act 4 of 1898, s. 2, for the original." },
        { h: 8.2, text: "wrapped footnote continuation line." },
      ]),
      // Plain page-bottom footnote with no block in sight.
      lines([
        { h: 10, text: "2. Next.—Second body." },
        { h: 8.2, text: "2. Ins. by Act 10 of 2009, s. 51 (w.e.f. 27-10-2009)." },
      ]),
    );
    const { sections } = parseInlineAct(xhtml);
    expect(sections[0]!.bodyMd).toBe("Body text here. Illustrations (a) A does X.");
    expect(sections[1]!.bodyMd).toBe("Second body.");
  });

  it("carries a block across a page break past the page-number furniture", () => {
    const xhtml = doc(
      lines([
        PREAMBLE,
        { h: 10, text: "1. Definition.—Body text here." },
        { h: 9.9, text: "Illustrations" },
        { h: 8.2, text: "(a) A does X." },
        { h: 10, text: "92" }, // bare page number — neutral furniture
      ]),
      lines([
        { h: 8.2, text: "(b) B does Y on the next page." },
        { h: 10, text: "2. Next.—Second body." },
      ]),
    );
    const { sections } = parseInlineAct(xhtml);
    expect(sections[0]!.bodyMd).toBe(
      "Body text here. Illustrations (a) A does X. (b) B does Y on the next page.",
    );
  });

  it("drops letterless small lines inside a block (superscript refs, bracket digits)", () => {
    const xhtml = doc(
      lines([
        PREAMBLE,
        { h: 10, text: "1. Definition.—Body text here." },
        { h: 9.9, text: "Illustrations" },
        { h: 8.2, text: "(a) A does X." },
        { h: 7.2, text: "1" }, // ICA §74's footnote ref above the amendment bracket
        { h: 8.2, text: "* * * * *" },
        { h: 10, text: "2. Next.—Second body." },
      ]),
    );
    const { sections } = parseInlineAct(xhtml);
    expect(sections[0]!.bodyMd).toBe("Body text here. Illustrations (a) A does X.");
  });

  it("recognizes small-type and glyph-confused headings; drops superscripts everywhere", () => {
    const xhtml = doc(
      lines([
        PREAMBLE,
        { h: 10, text: "1. Definition.—Body text here." },
        { h: 7.2, text: "Illustrations" }, // ICA prints one heading at 7.2pt
        { h: 8.2, text: "(a) small heading case." },
        { h: 10, text: "2. Next.—Second body." },
        { h: 10, text: "IIIustrations" }, // glyph confusion (IPC §364)
        { h: 8.2, text: "(a) glyph case." },
        { h: 6.3, text: "7" }, // superscript marker — dropped even in a block
        { h: 8.2, text: "(b) after superscript." },
      ]),
    );
    const { sections } = parseInlineAct(xhtml);
    expect(sections[0]!.bodyMd).toBe("Body text here. Illustrations (a) small heading case.");
    expect(sections[1]!.bodyMd).toBe(
      "Second body. IIIustrations (a) glyph case. (b) after superscript.",
    );
  });
});

describe("schedule guard (D-031)", () => {
  it('ends the act at an unnumbered "THE SCHEDULE" so its entries are not sections', () => {
    // NDPS prints only "THE SCHEDULE"; the ordinal-only pattern missed it and
    // the substance list was read as sections 84…110ZN.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "2. Power to make rules.—The Central Government may make rules." },
        { h: 10, text: "3. Power to remove difficulties.—If any difficulty arises." },
        { h: 10, text: "THE SCHEDULE" },
        { h: 10, text: "4. AMINOREX (2-amino-5-phenyl-2-oxazoline)" },
        { h: 10, text: "5. ETRYPTAMINE (3-(2-aminobutyl) indole)" },
      ]),
    );
    const { sections, diagnostics } = parseInlineAct(xml, {});
    expect(sections.map((s) => s.number)).toEqual(["2", "3"]);
    expect(diagnostics.some((d) => /stopped at schedules/.test(d))).toBe(true);
  });

  it('still ends at an ordinal schedule, with or without a leading "THE"', () => {
    for (const heading of ["THE FIRST SCHEDULE", "FIRST SCHEDULE"]) {
      const xml = doc(
        lines([
          { h: 10, text: "WHEREAS it is enacted as follows:—" },
          { h: 10, text: "7. Effect of proceedings.—Nothing in this Act." },
          { h: 10, text: heading },
          { h: 10, text: "1. Entry one of the schedule." },
        ]),
      );
      expect(parseInlineAct(xml, {}).sections.map((s) => s.number)).toEqual(["7"]);
    }
  });

  it("does not end the act when body prose merely mentions the Schedule", () => {
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "5. Fees.—Fees shall be as specified in the Schedule to this Act." },
        { h: 10, text: "6. Appeals.—An appeal shall lie to the High Court." },
      ]),
    );
    expect(parseInlineAct(xml, {}).sections.map((s) => s.number)).toEqual(["5", "6"]);
  });
});

describe("State-amendment guard (D-032)", () => {
  it("skips a block closed by a [Vide …] citation, keeping the central section clean", () => {
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "4. Registration.—An application shall be made in such form." },
        { h: 10, text: "STATE AMENDMENT" },
        { h: 10, text: "Rajasthan.—Amendment of section 4.—In sub-section (1), insert words." },
        { h: 10, text: "[Vide Rajasthan Act 1 of 2002, s. 2]" },
        { h: 10, text: "5. Special provision.—Nothing in section 4 applies." },
      ]),
    );
    const { sections, diagnostics } = parseInlineAct(xml, {});
    expect(sections.map((s) => s.number)).toEqual(["4", "5"]);
    // The amending text must not reach the central section's body.
    expect(sections[0]?.bodyMd).not.toMatch(/Rajasthan|STATE AMENDMENT|Vide/);
    expect(sections[0]?.bodyMd).toContain("such form");
    expect(diagnostics.some((d) => /skipped 1 State-amendment block/.test(d))).toBe(true);
  });

  it("drops sections a State inserted, and resumes at the next central section", () => {
    // ARB: J&K inserted 8A/8B after s.8 with no closing citation — the Act
    // resumes at s.9, so the higher base is the exit.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "8. Power to refer parties.—A judicial authority shall refer." },
        { h: 10, text: "STATE AMENDMENT" },
        { h: 10, text: "Jammu and Kashmir.—After section 8, insert the following:—" },
        { h: 10, text: "8B. Power of the court to refer.—If during the pendency of a petition." },
        { h: 10, text: "9. Interim measures.—A party may apply to a court." },
      ]),
    );
    const { sections, diagnostics } = parseInlineAct(xml, {});
    expect(sections.map((s) => s.number)).toEqual(["8", "9"]);
    expect(sections.some((s) => s.number === "8B")).toBe(false);
    expect(diagnostics.some((d) => /State-inserted section/.test(d))).toBe(true);
  });

  it("keeps a genuine lettered section that follows the block", () => {
    // Bihar's block sits before §43A, which IS central law (2019 amendment).
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "3. Limitations.—The Limitation Act shall apply." },
        { h: 10, text: "STATE AMENDMENT" },
        { h: 10, text: "Bihar.—Omission of sub-section (3) of Section 3." },
        { h: 10, text: "[Vide Bihar Act 20 of 2002, s. 2]" },
        { h: 10, text: "3A. Definitions.—In this Part, unless the context otherwise requires." },
      ]),
    );
    expect(parseInlineAct(xml, {}).sections.map((s) => s.number)).toEqual(["3", "3A"]);
  });

  it("warns when the document ends inside an unterminated block", () => {
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "10. Duties.—Every officer shall perform such duties." },
        { h: 10, text: "STATE AMENDMENTS" },
        { h: 10, text: "Karnataka.—Amendment of section 10.—Substitute the words." },
      ]),
    );
    const { sections, diagnostics } = parseInlineAct(xml, {});
    expect(sections.map((s) => s.number)).toEqual(["10"]);
    expect(diagnostics.some((d) => /ended inside a State-amendment block/.test(d))).toBe(true);
  });
});
