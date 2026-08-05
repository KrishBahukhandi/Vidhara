import { describe, expect, it } from "vitest";

import { parseInlineAct } from "./gazette-inline";

/** Builds one bbox `<word>` tag. Heights mirror the India Code PDFs:
 * body ≈10pt, illustrations/footnotes ≈8.2pt, superscripts ≈6.3pt. */
const word = (x: number, y: number, h: number, text: string) =>
  `<word xMin="${x}" yMin="${y}" xMax="${x + text.length * 5}" yMax="${y + h}">${text}</word>`;

/** Lays each string out as one visual line (12pt apart), splitting on spaces.
 * `x` sets the left edge — body text sits at 72, a centred heading past 150. */
function lines(specs: Array<{ h: number; text: string; x?: number }>, startY = 50): string {
  let y = startY;
  const out: string[] = [];
  for (const { h, text, x: startX } of specs) {
    let x = startX ?? 72;
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
    expect(diagnostics.some((d) => /skipped 1 State-amendment region/.test(d))).toBe(true);
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
    expect(diagnostics.some((d) => /ended inside a State-amendment region/.test(d))).toBe(true);
  });
});

/**
 * The Registration Act stacks many States under one banner. Each case here is
 * a way the previous, block-shaped guard let State law through as central law.
 */
/* Section numbers here are small so each fixture starts inside the parser's
 * plausibility window; the real provisions are named in the comments. */
describe("stacked State amendments under one banner (D-052)", () => {
  it("stays in the region for the NEXT State after a citation", () => {
    // Karnataka's and Uttar Pradesh's blocks share one banner. Treating the
    // citation as the terminator published both insertions as central law.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "8. Fees payable.—All fees shall be payable in advance." },
        { h: 10, text: "STATE AMENDMENT" },
        { h: 10, text: "Kerala" },
        { h: 10, text: "Insertion of new section 8A.—After section 8 of the principal Act, insert:—" },
        { h: 10, text: "8A. Recovery of registration fees.—If on inspection it is found." },
        { h: 10, text: "[Vide Kerala Act 21 of 1998, s. 2]" },
        { h: 10, text: "Insertion of new section 8B.—After section 8A of the principal Act, insert:—" },
        { h: 10, text: "8B. Deficient amount of fees.—Where the value of the property is understated." },
        { h: 10, text: "[Vide Karnataka Act 28 of 1975, s. 2]" },
        { h: 10, text: "9. Penalty.—Every registering officer who commits an offence shall be punished." },
      ]),
    );
    const { sections } = parseInlineAct(xml, {});
    expect(sections.map((s) => s.number)).toEqual(["8", "9"]);
  });

  it("does not let a page break between two States' blocks end the region", () => {
    // A page number landing after the citation consumed the one-line latch the
    // first fix relied on, which is how six of nine insertions still got through.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "18. Optional registration.—Any of the following documents may be registered." },
        { h: 10, text: "STATE AMENDMENT" },
        { h: 10, text: "Tripura" },
        { h: 10, text: "Amendment of section 18.—In section 18 of the principal Act, omit clause (d)." },
        { h: 10, text: "[Vide Tripura Act 7 of 1982, s. 2]" },
      ]),
      lines([
        { h: 10, text: "13" },
        { h: 10, text: "Uttar Pradesh" },
        { h: 10, text: "Insertion of new section 18A.—After section 18 of the principal Act, insert:—" },
        { h: 10, text: "18A. Documents relating to agricultural land.—Every such document shall be registered." },
        { h: 10, text: "[Vide Uttar Pradesh Act 14 of 1971, s. 2]" },
        { h: 10, text: "19. Documents in language not understood.—If a document is presented." },
      ]),
    );
    const { sections } = parseInlineAct(xml, {});
    expect(sections.map((s) => s.number)).toEqual(["18", "19"]);
  });

  it("keeps a Part a State inserted out of the Act's own Parts", () => {
    // Bengal inserts a whole "PART XIIIA — OF TOUTS" carrying 80A–80G. Exiting
    // the region on that heading published all seven as central sections, and
    // the two Parts as Parts of the Act.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "8. Fees payable.—All fees shall be payable in advance." },
        { h: 10, text: "STATE AMENDMENT" },
        { h: 10, text: "Insertion of new section 8A.—After Part III of the main Act, insert Part IIIA:—" },
        { h: 10, text: "PART IIIA" },
        { h: 10, text: "OF TOUTS" },
        { h: 10, text: "8A. Powers to frame lists of touts.—Every Registrar may frame a list." },
        { h: 10, text: "8B. Inquiry regarding suspected touts.—Any Registrar may hold an inquiry." },
        { h: 10, text: "[Vide Bengal Act 5 of 1942, s. 9]" },
        { h: 10, text: "PART IV" },
        { h: 10, text: "OF PENALTIES" },
        { h: 10, text: "9. Penalty.—Every registering officer who commits an offence shall be punished." },
      ]),
    );
    const { sections, chapters } = parseInlineAct(xml, {});
    expect(sections.map((s) => s.number)).toEqual(["8", "9"]);
    // The real Part follows the citation and is the Act resuming; the inserted
    // one is introduced by its amending instruction and belongs to Bengal.
    expect(chapters.map((c) => c.number)).toEqual(["IV"]);
  });

  it("treats a citation that wraps several printed lines as one unit", () => {
    // ARB §29B and CPC §35A sit right after the three-line J&K/Ladakh
    // adaptation order, and were skipped as insertions when only its first
    // line counted as the citation.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "9A. Time limit for arbitral award.—The award shall be made within twelve months." },
        { h: 10, text: "STATE AMENDMENT" },
        { h: 10, text: "Amendment of section 9A.—For sub-section (1), substitute the following." },
        { h: 10, text: "[Vide the Jammu and Kashmir Reorganization (Adaptation of Central Laws)" },
        { h: 10, text: "Order, 2020, notification No. S.O. 1123(E) dated (18-3-2020) and Vide Union" },
        { h: 10, text: "Territory of Ladakh Reorganisation Order, 2020, No. S.O. 3774(E).]" },
        { h: 10, text: "9B. Fast track procedure.—The parties may agree in writing to have their dispute resolved." },
      ]),
    );
    expect(parseInlineAct(xml, {}).sections.map((s) => s.number)).toEqual(["9A", "9B"]);
  });

  it("catches a block printed with no banner at all", () => {
    // Uttarakhand's proviso to Registration Act s.53 is introduced by nothing
    // but the State's name, and went out inside the central section's body.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "13. Entries to be numbered consecutively.—All entries shall be numbered in a series." },
        { h: 10, text: "Uttarakhand" },
        { h: 10, text: "Insertion of proviso to section 13.—In section 13 of the Principal Act, insert:—" },
        { h: 10, text: "“Provided that where the Book is in electronic form, all entries shall be identical.”" },
        { h: 10, text: "[Vide Uttarakhand Act 24 of 2014, s. 11]" },
        { h: 10, text: "14. Current indexes.—In every office there shall be prepared current indexes." },
      ]),
    );
    const { sections } = parseInlineAct(xml, {});
    expect(sections.map((s) => s.number)).toEqual(["13", "14"]);
    expect(sections[0]?.bodyMd).not.toMatch(/Uttarakhand|proviso|electronic/);
    expect(sections[0]?.bodyMd).toContain("numbered in a series");
  });

  it("tolerates the print's misspelling of the banner", () => {
    // "STATE AMENEDMENT" — twice in the Registration Act, and both times the
    // whole Gujarat amendment landed in the central section's body.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "14. Enquiry before registration.—Subject to the provisions contained in this Part." },
        { h: 10, text: "STATE AMENEDMENT" },
        { h: 10, text: "Gujarat" },
        { h: 10, text: "Amendment of section 14 of XVI of 1908.—In the principal Act, in section 14,--" },
        { h: 10, text: "“(1A) The registering officer may refuse to accept the documents.”" },
        { h: 10, text: "[Vide Gujarat Act 4 of 2020, s. 4]" },
        { h: 10, text: "15. Procedure on admission.—If all the persons executing the document appear." },
      ]),
    );
    const { sections } = parseInlineAct(xml, {});
    expect(sections.map((s) => s.number)).toEqual(["14", "15"]);
    expect(sections[0]?.bodyMd).not.toMatch(/AMENEDMENT|Gujarat|registering officer may refuse/);
  });

  it("does not trim a real last line that looks like an orphan fragment", () => {
    // Registration Act §78 ends "…to effect the purposes of this / Act." — a
    // one-word final line. The orphan trim cut it until it required that a
    // fragment carry no sentence-ending punctuation.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "18. Fees to be fixed.—The State Government shall prepare a table of fees payable" },
        { h: 10, text: "for such other matters as appear necessary to effect the purposes of this" },
        { h: 10, text: "Act." },
        { h: 10, text: "STATE AMENDMENT" },
        { h: 10, text: "Assam" },
        { h: 10, text: "Insertion of new section 18A.—In the principal Act, after section 18, insert:—" },
        { h: 10, text: "18A. Power to remit fees.—The State Government may by order remit the fees." },
        { h: 10, text: "[Vide Assam Act 24 of 2013, s. 2]" },
        { h: 10, text: "19. Publication of fees.—A table of the fees shall be published in the Gazette." },
      ]),
    );
    const { sections } = parseInlineAct(xml, {});
    expect(sections.map((s) => s.number)).toEqual(["18", "19"]);
    expect(sections[0]?.bodyMd).toMatch(/purposes of this Act\.$/);
  });
});

/**
 * Skipping State amendments keeps them out of the Act; capturing them keeps
 * them from vanishing. Both have to hold at once (D-053).
 */
describe("capturing State amendments (D-053)", () => {
  const act = doc(
    lines([
      { h: 10, text: "WHEREAS it is enacted as follows:—" },
      { h: 10, text: "17. Documents of which registration is compulsory.—The following documents shall be registered." },
      { h: 10, text: "STATE AMENDMENT" },
      { h: 10, text: "Karnataka" },
      { h: 10, text: "Amendment of section 17.—In section 17 of the principal Act, after clause (b), insert:—" },
      { h: 10, text: "“(bb) instruments of partition of immovable property;”" },
      { h: 10, text: "[Vide Karnataka Act 55 of 1976, s. 3]" },
      { h: 10, text: "Kerala" },
      { h: 10, text: "Amendment of section 17.—In section 17 of the principal Act, omit clause (d)." },
      { h: 10, text: "[Vide kerala Act 7 of 1968, s. 2]" },
      { h: 10, text: "18. Documents of which registration is optional.—Any of the following may be registered." },
    ]),
  );

  it("records each State's block against the section, with its authority", () => {
    const { sections, stateAmendments = [] } = parseInlineAct(act, {});
    expect(sections.map((s) => s.number)).toEqual(["17", "18"]);
    expect(stateAmendments).toHaveLength(2);
    expect(stateAmendments.map((a) => a.state)).toEqual(["Karnataka", "Kerala"]);
    expect(stateAmendments.every((a) => a.sectionNumber === "17")).toBe(true);
    expect(stateAmendments[0]?.citation).toBe("[Vide Karnataka Act 55 of 1976, s. 3]");
    expect(stateAmendments[0]?.text).toContain("instruments of partition");
  });

  it("keeps the captured text OUT of the section it belongs to", () => {
    // The reason the parser skips these at all. Capturing must not undo it.
    const { sections } = parseInlineAct(act, {});
    expect(sections[0]?.bodyMd).not.toMatch(/Karnataka|Kerala|partition|Vide/);
  });

  it("normalises the State for grouping but prints the citation verbatim", () => {
    // The source writes "kerala"; two spellings would read as two jurisdictions.
    const { stateAmendments = [] } = parseInlineAct(act, {});
    expect(stateAmendments[1]?.state).toBe("Kerala");
    expect(stateAmendments[1]?.citation).toBe("[Vide kerala Act 7 of 1968, s. 2]");
  });

  it("names the State even when the citation omits the word 'Act'", () => {
    // Contract Act s.55: "[Vide Uttar Pradesh 57 of 1976, s. 26]".
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "5. Revocation of proposals.—A proposal may be revoked at any time before acceptance." },
        { h: 10, text: "STATE AMENDMENT" },
        { h: 10, text: "Uttar Pradesh" },
        { h: 10, text: "Amendment of section 5.—In section 5 of the Principal Act, insert the following." },
        { h: 10, text: "[Vide Uttar Pradesh 57 of 1976, s. 26]" },
        { h: 10, text: "6. Revocation how made.—A proposal is revoked by notice of revocation." },
      ]),
    );
    const { stateAmendments = [] } = parseInlineAct(xml, {});
    expect(stateAmendments).toHaveLength(1);
    expect(stateAmendments[0]?.state).toBe("Uttar Pradesh");
  });

  it("drops a block it cannot attribute rather than guessing a State", () => {
    // No citation, so no authority to show. Silent loss beats a wrong label.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "8. Power to refer parties.—A judicial authority shall refer the parties." },
        { h: 10, text: "STATE AMENDMENT" },
        { h: 10, text: "After section 8, insert the following section:—" },
        { h: 10, text: "8B. Power of the court to refer.—If during the pendency of a petition." },
        { h: 10, text: "9. Interim measures.—A party may apply to a court." },
      ]),
    );
    const { sections, stateAmendments = [] } = parseInlineAct(xml, {});
    expect(sections.map((s) => s.number)).toEqual(["8", "9"]);
    expect(stateAmendments).toHaveLength(0);
  });
});

/**
 * The Evidence Act sets every chapter heading with a 10pt drop cap and an 8.2pt
 * remainder, below body height. The height filter reduced them to "C V. –– O D
 * E" and the Act read as having no chapters at all (D-054).
 */
describe("small-caps division headings (D-054)", () => {
  /** Drop cap at body height, the rest of each word below it — as printed. */
  const dropCap = (words: Array<[string, string]>, y: number) => {
    let x = 200;
    const out: string[] = [];
    for (const [cap, rest] of words) {
      out.push(word(x, y, 10, cap));
      x += cap.length * 5 + 3;
      if (rest) {
        out.push(word(x, y, 8.2, rest));
        x += rest.length * 5 + 5;
      }
    }
    return out.join("\n");
  };

  it("recovers a heading whose small caps sit below body height", () => {
    const xml = doc(
      [
        lines([
          { h: 10, text: "WHEREAS it is enacted as follows:—" },
          { h: 10, text: "6. Proof of facts by oral evidence.—All facts may be proved by oral evidence." },
        ]),
        dropCap(
          [
            ["C", "HAPTER"],
            ["V.", ""],
            ["––", ""],
            ["O", "F"],
            ["D", "OCUMENTARY"],
            ["E", "VIDENCE"],
          ],
          78,
        ),
        lines([{ h: 10, text: "7. Proof of contents of documents.—Contents may be proved by primary evidence." }], 92),
      ].join("\n"),
    );
    const { sections, chapters } = parseInlineAct(xml, {});
    expect(sections.map((s) => s.number)).toEqual(["6", "7"]);
    expect(chapters).toHaveLength(1);
    expect(chapters[0]?.number).toBe("V");
    expect(chapters[0]?.title).toBe("OF DOCUMENTARY EVIDENCE");
    // The heading must leave the previous section's body, not just be found.
    expect(sections[0]?.bodyMd).not.toMatch(/HAPTER|OCUMENTARY|C V\./);
  });

  it("does not read the title word PARTIES as Part IE", () => {
    // "PART" is a prefix of "PARTIES". The NI Act prints a bare "CHAPTER III"
    // with its title on the line below; once small-caps repair joins that line
    // into "PARTIES TO NOTES, BILLS AND CHEQUES." it begins with PART, and an
    // unguarded match invented a Part "IE" that swallowed 14 chapters.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "CHAPTER III" },
        { h: 10, text: "P ARTIES TO N OTES , B ILLS AND C HEQUES." },
        { h: 10, text: "2. Maturity.—The maturity of a promissory note is the date on which it falls due." },
      ]),
    );
    const { chapters } = parseInlineAct(xml, {});
    expect(chapters).toHaveLength(1);
    expect(chapters[0]?.kind).toBe("chapter");
    expect(chapters[0]?.number).toBe("III");
    expect(chapters[0]?.title).toBe("PARTIES TO NOTES, BILLS AND CHEQUES.");
  });

  it("keeps the whole title when number and title share a line", () => {
    // A non-greedy capture named this chapter "OF THE" and dropped the rest.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "CHAPTER VII. –– OF THE BURDEN OF PROOF" },
        { h: 10, text: "11. Burden of proof.—Whoever desires any Court to give judgment must prove." },
      ]),
    );
    const { chapters } = parseInlineAct(xml, {});
    expect(chapters[0]?.title).toBe("OF THE BURDEN OF PROOF");
  });
});

/**
 * Divisions the source titles but does not number (D-055). The Hindu Marriage
 * Act is built entirely from them, which is why all 37 of its sections sat
 * under no heading.
 */
describe("unnumbered divisions (D-055)", () => {
  it("files sections under a titled division that carries no number", () => {
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "PRELIMINARY", x: 275 },
        { h: 10, text: "1. Short title.—This Act may be called the Indian Contract Act, 1872." },
        { h: 10, text: "2. Interpretation-clause.—In this Act the following words are used as follows." },
        { h: 10, text: "CHAPTER I" },
        { h: 10, text: "OF THE COMMUNICATION OF PROPOSALS" },
        { h: 10, text: "3. Communication.—The communication of proposals is deemed to be made." },
      ]),
    );
    const { sections, chapters } = parseInlineAct(xml, {});
    expect(chapters.map((c) => `${c.unnumbered ? "unnum" : c.number}:${c.title}`)).toEqual([
      "unnum:PRELIMINARY",
      "I:OF THE COMMUNICATION OF PROPOSALS",
    ]);
    // An unnumbered division is keyed by its title, so several can coexist.
    expect(chapters[0]?.number).toBe("PRELIMINARY");
    expect(sections.map((s) => `${s.number}→${s.chapterNumber}`)).toEqual([
      "1→PRELIMINARY",
      "2→PRELIMINARY",
      "3→I",
    ]);
  });

  it("keeps several unnumbered divisions apart", () => {
    // The Hindu Marriage Act's six divisions would collapse into one if they
    // shared a key.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "PRELIMINARY", x: 275 },
        { h: 10, text: "1. Short title.—This Act may be called the Hindu Marriage Act, 1955." },
        { h: 10, text: "HINDU MARRIAGES", x: 263 },
        { h: 10, text: "5. Conditions for a Hindu marriage.—A marriage may be solemnised." },
        { h: 10, text: "NULLITY OF MARRIAGE AND DIVORCE", x: 222 },
        { h: 10, text: "11. Void marriages.—Any marriage solemnised after the commencement." },
      ]),
    );
    const { sections, chapters } = parseInlineAct(xml, {});
    expect(chapters.map((c) => c.title)).toEqual([
      "PRELIMINARY",
      "HINDU MARRIAGES",
      "NULLITY OF MARRIAGE AND DIVORCE",
    ]);
    expect(chapters.every((c) => c.unnumbered)).toBe(true);
    expect(sections.map((s) => s.chapterNumber)).toEqual([
      "PRELIMINARY",
      "HINDU MARRIAGES",
      "NULLITY OF MARRIAGE AND DIVORCE",
    ]);
  });

  it("keeps the heading out of the previous section's body", () => {
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "4. Overriding effect of Act.—Save as otherwise expressly provided." },
        { h: 10, text: "HINDU MARRIAGES", x: 263 },
        { h: 10, text: "5. Conditions for a Hindu marriage.—A marriage may be solemnised." },
      ]),
    );
    const { sections } = parseInlineAct(xml, {});
    expect(sections[0]?.bodyMd).not.toMatch(/HINDU MARRIAGES/);
    expect(sections[0]?.bodyMd).toContain("expressly provided");
  });

  it("does not treat a cross-heading as a division once chapters have begun", () => {
    // "PRESENTMENT" sits between NI Act sections and belongs to no division.
    // Only lines BEFORE the first numbered division may qualify.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "CHAPTER I" },
        { h: 10, text: "OF NOTES BILLS AND CHEQUES" },
        { h: 10, text: "4. Promissory note.—A promissory note is an instrument in writing." },
        { h: 10, text: "PRESENTMENT", x: 275 },
        { h: 10, text: "5. Bill of exchange.—A bill of exchange is an instrument in writing." },
      ]),
    );
    const { chapters } = parseInlineAct(xml, {});
    expect(chapters).toHaveLength(1);
    expect(chapters[0]?.number).toBe("I");
  });

  it("drops a trailing unnumbered division that has no sections", () => {
    // HMA prints "STATEMENT OF OBJECTS AND REASONS" after its last section.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "PRELIMINARY", x: 275 },
        { h: 10, text: "1. Short title.—This Act may be called the Hindu Marriage Act, 1955." },
        { h: 10, text: "STATEMENT OF OBJECTS AND REASONS", x: 201 },
      ]),
    );
    const { chapters } = parseInlineAct(xml, {});
    expect(chapters.map((c) => c.title)).toEqual(["PRELIMINARY"]);
  });
});

describe("a first division printed above the enactment formula (D-055)", () => {
  it("adopts CHAPTER I when the act prints it over its preamble", () => {
    // The Penal Code sets "CHAPTER I / I NTRODUCTION" between its date line and
    // its preamble, so it arrives before parsing starts. Sections 1-5 sat under
    // no chapter because of it. The title's small caps are below body height.
    const xml = doc(
      [
        lines([
          { h: 10, text: "THE INDIAN PENAL CODE", x: 233 },
          { h: 10, text: "ACT NO. 45 OF 1860", x: 253 },
          { h: 10, text: "CHAPTER I", x: 278 },
        ]),
        [
          word(272, 92, 10, "I"),
          word(280, 92, 8.2, "NTRODUCTION"),
        ].join("\n"),
        lines(
          [
            { h: 10, text: "Preamble.—WHEREAS it is expedient; It is" },
            { h: 10, text: "enacted as follows:—" },
            { h: 10, text: "1. Title and extent.—This Act shall be called the Indian Penal Code." },
            { h: 10, text: "2. Punishment of offences.—Every person shall be liable to punishment." },
          ],
          106,
        ),
      ].join("\n"),
    );
    const { sections, chapters } = parseInlineAct(xml, {});
    expect(chapters).toHaveLength(1);
    expect(chapters[0]?.number).toBe("I");
    expect(chapters[0]?.title).toBe("INTRODUCTION");
    expect(sections.map((s) => s.chapterNumber)).toEqual(["I", "I"]);
  });

  it("ignores the contents listing's last heading above the formula", () => {
    // Everything before the formula is the table of contents, and a contents
    // listing ENDS with the act's LAST division — CrPC's is "CHAPTER XXXVII".
    // Only a first division may carry across.
    const xml = doc(
      lines([
        { h: 10, text: "CHAPTER XXXVII", x: 276 },
        { h: 10, text: "OF MISCELLANEOUS PROVISIONS", x: 200 },
        { h: 10, text: "It is hereby enacted as follows:—" },
        { h: 10, text: "1. Short title.—This Act may be called the Code." },
      ]),
    );
    const { sections, chapters } = parseInlineAct(xml, {});
    expect(chapters).toHaveLength(0);
    expect(sections[0]?.chapterNumber).toBeUndefined();
  });
});

describe("prints that defeated the sentinels (D-057)", () => {
  it("finds an enactment formula that wraps mid-phrase", () => {
    // The Partnership Act prints "…it ishereby enacted as" / "follows:—", and
    // requiring both words on one line found no formula at all — 0 sections.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is expedient to define the law relating to partnership; it ishereby enacted as" },
        { h: 10, text: "follows:—" },
        { h: 10, text: "1. Short title.—This Act may be called the Indian Partnership Act, 1932." },
      ]),
    );
    expect(parseInlineAct(xml, {}).sections.map((s) => s.number)).toEqual(["1"]);
  });

  it("does not end the act on body prose about digital signatures", () => {
    // "Digitally signed" unanchored matched the Maharashtra amendment's own
    // words — "The statement shall be digitally signed by all the partners" —
    // and silently ended the Partnership Act at section 58 of 74.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "8. Application for registration.—The registration may be effected at any time." },
        { h: 10, text: "The statement shall be digitally signed by all the partners or their agents." },
        { h: 10, text: "9. Registration.—Where the Registrar is satisfied, he shall record an entry." },
      ]),
    );
    expect(parseInlineAct(xml, {}).sections.map((s) => s.number)).toEqual(["8", "9"]);
  });

  it("still stops at the publisher's trailer, and says so", () => {
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "1. Short title.—This Act may be called the Test Act." },
        { h: 10, text: "Digitally signed by RAM KUMAR SHARMA" },
        { h: 10, text: "2. Never reached.—This must not be parsed." },
      ]),
    );
    const { sections, diagnostics } = parseInlineAct(xml, {});
    expect(sections.map((s) => s.number)).toEqual(["1"]);
    expect(diagnostics.some((d) => /stopped at document trailer/.test(d))).toBe(true);
  });

  it("does not end the act on a SCHEDULE quoted inside a State amendment", () => {
    // The Partnership Act's Goa amendment carries its own "SCHEDULE" heading.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "3. Application of provisions.—The provisions shall apply as follows." },
        { h: 10, text: "STATE AMENDMENT" },
        { h: 10, text: "Goa, Daman and Diu" },
        { h: 10, text: "Amendment of section 3.—The Acts mentioned in the Schedule below shall come into force." },
        { h: 10, text: "SCHEDULE" },
        { h: 10, text: "1. The Indian Partnership Act, 1932." },
        { h: 10, text: "[Vide Goa Act 5 of 1964, s. 2]" },
        { h: 10, text: "4. Definition of partnership.—Partnership is the relation between persons." },
      ]),
    );
    expect(parseInlineAct(xml, {}).sections.map((s) => s.number)).toEqual(["3", "4"]);
  });

  it("recognises every printed spelling of the State-amendment banner", () => {
    for (const banner of ["STATE AMENDMENT", "STATE AMENDMENTS", "STATE AMENEDMENT", "STATE AMENDEMT"]) {
      const xml = doc(
        lines([
          { h: 10, text: "WHEREAS it is enacted as follows:—" },
          { h: 10, text: "5. Registration.—A firm may be registered at any time." },
          { h: 10, text: banner },
          { h: 10, text: "Amendment of section 5.—In section 5 of the principal Act, insert the following." },
          { h: 10, text: "[Vide Maharashtra Act 29 of 1984, s. 6]" },
          { h: 10, text: "6. Effect.—Registration shall have effect as provided." },
        ]),
      );
      const { sections } = parseInlineAct(xml, {});
      expect(sections.map((s) => s.number), banner).toEqual(["5", "6"]);
      expect(sections[0]?.bodyMd, banner).not.toMatch(/principal Act|Vide/);
    }
  });
});

describe("marginal notes the dash rules got wrong (D-057)", () => {
  it("splits a bracketed repeal note at its brackets", () => {
    // "[Repeals.]―Rep. by the Repealing and Amending Act, 1960" was cut inside
    // the citation, leaving "Repeals.―Rep" as the section's title.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "3. [Repeals.]―Rep. by the Repealing and Amending Act, 1960 (58 of 1960), s. 2." },
      ]),
    );
    const s = parseInlineAct(xml, {}).sections[0];
    expect(s?.marginalNote).toBe("Repeals.");
    expect(s?.bodyMd).toMatch(/^Rep\. by the Repealing and Amending Act/);
  });

  it("splits a bracketed note with no dash at all", () => {
    // The Partnership Act prints "[Repeals.] Rep. by the Repealing Act, 1938".
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "3. [Repeals.] Rep. by the Repealing Act, 1938 (1 of 1938), s. 2 and Sch." },
      ]),
    );
    const s = parseInlineAct(xml, {}).sections[0];
    expect(s?.marginalNote).toBe("Repeals.");
    expect(s?.bodyMd).toMatch(/^Rep\. by the Repealing Act/);
  });

  it("keeps a bracketed note that carries two sentences whole", () => {
    // IPC §56's bracket genuinely holds both marginal notes; splitting at the
    // first period dropped the second.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "3. [Sentence to penal servitude. Proviso as to sentence for term exceeding ten years.] Rep. by Act 17 of 1949." },
      ]),
    );
    expect(parseInlineAct(xml, {}).sections[0]?.marginalNote).toBe(
      "Sentence to penal servitude. Proviso as to sentence for term exceeding ten years.",
    );
  });

  it("treats the horizontal bar as a run-in dash", () => {
    // U+2015, the primary dash in the Hindu Succession, Hindu Adoptions and
    // Special Marriage Acts, and 519 times in the Constitution.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "3. Devolution of interest.\u2015When a Hindu dies intestate, his property shall devolve." },
      ]),
    );
    const s = parseInlineAct(xml, {}).sections[0];
    expect(s?.marginalNote).toBe("Devolution of interest");
    expect(s?.bodyMd).toBe("When a Hindu dies intestate, his property shall devolve.");
  });
});

describe("markers and dashes the prints put in the way (D-062)", () => {
  it("reads a section whose number carries a closing bracket", () => {
    // The Advocates Act prints "[ [10B.] Disqualification of members of Bar
    // Council.―…" — the bracket after the period left the title starting "]",
    // which failed the title-shape test and dropped the section into §10A.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "10A. Transaction of business.—A Bar Council may meet at such place as it thinks fit." },
        { h: 10, text: "[ [10B.] Disqualification of members of Bar Council.―An elected member shall be deemed." },
        { h: 10, text: "11. Roll of advocates.—Every State Bar Council shall prepare and maintain a roll." },
      ]),
    );
    const { sections } = parseInlineAct(xml, {});
    expect(sections.map((s) => s.number)).toEqual(["10A", "10B", "11"]);
    expect(sections[1]?.marginalNote).toBe("Disqualification of members of Bar Council");
    expect(sections[0]?.bodyMd).not.toMatch(/Disqualification/);
  });

  it("reads a section number behind an inline superscript marker", () => {
    // The Indian Succession Act renders superscripts inline: "1*50. General
    // principles relating to intestate succession.-For…". Eight sections were
    // missing because only the bracket form of the marker was stripped.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "9. Domicile of origin.-The domicile of origin prevails until a new domicile is acquired." },
        { h: 10, text: "1*10. General principles relating to intestate succession.-For the purpose of succession." },
        { h: 10, text: "11. Division of property.-The property shall be divided in equal shares." },
      ]),
    );
    expect(parseInlineAct(xml, {}).sections.map((s) => s.number)).toEqual(["9", "10", "11"]);
  });

  it("accepts a hyphen as the run-in dash", () => {
    // The Indian Succession Act sets its run-in rule as ".-", which left the
    // whole first sentence inside the marginal note.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "2. Definitions.- In this Act, unless there is anything repugnant, the following apply." },
      ]),
    );
    const s = parseInlineAct(xml, {}).sections[0];
    expect(s?.marginalNote).toBe("Definitions");
    expect(s?.bodyMd).toMatch(/^In this Act/);
  });

  it("consumes a doubled dash but never a repeated horizontal bar", () => {
    // The Evidence Act sets "Repeal of enactments.––Rep. by…" (doubled en dash),
    // so a single-dash rule left one behind. But U+2015 doubles as an opening
    // QUOTE — "Abolition of Untouchability.――Untouchability‖ is abolished…" —
    // and consuming a run of those ate the quote mark.
    const doubled = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "2. Repeal of enactments.\u2013\u2013Rep. by the Repealing Act, 1938 (1 of 1938), s. 2." },
      ]),
    );
    expect(parseInlineAct(doubled, {}).sections[0]?.bodyMd).toMatch(/^Rep\. by the Repealing Act/);

    const quoted = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "2. Abolition of Untouchability.\u2015\u2015Untouchability\u2016 is abolished and its practice forbidden." },
      ]),
    );
    expect(parseInlineAct(quoted, {}).sections[0]?.bodyMd).toBe(
      "\u2015Untouchability\u2016 is abolished and its practice forbidden.",
    );
  });
});

describe("bracketed chapter heading guard (D-033)", () => {
  it("recognises an inserted chapter whose bracket and title share the line", () => {
    // NDPS §68 ended with "[CHAPTER VA [F ORFEITURE OF ILLEGALLY ACQUIRED
    // PROPERTY]" glued to its body because the anchored pattern missed it.
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "CHAPTER V" },
        { h: 10, text: "PROCEDURE" },
        { h: 10, text: "7. Officers.—The Central Government may appoint officers." },
        { h: 10, text: "[CHAPTER VA [F ORFEITURE OF ILLEGALLY ACQUIRED PROPERTY]" },
        { h: 10, text: "8. Application.—This Chapter applies to every person." },
      ]),
    );
    const { sections, chapters } = parseInlineAct(xml, {});
    expect(sections.map((s) => s.number)).toEqual(["7", "8"]);
    // The heading must not trail the previous section's body.
    expect(sections[0]?.bodyMd).not.toMatch(/CHAPTER|FORFEITURE|ORFEITURE/);
    expect(chapters.map((c) => c.number)).toEqual(["V", "VA"]);
    // …and the chapter it opens keeps its name rather than going untitled.
    expect(chapters[1]?.title.toUpperCase()).toContain("FORFEITURE");
    // The following section belongs to the new chapter.
    expect(sections[1]?.chapterNumber).toBe("VA");
  });

  it("still handles a bare bracketed heading with the title on the next line", () => {
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "[CHAPTER IIA" },
        { h: 10, text: "NATIONAL FUND FOR CONTROL OF DRUG ABUSE" },
        { h: 10, text: "5. Constitution of Fund.—The Central Government shall constitute a Fund." },
      ]),
    );
    const { sections, chapters } = parseInlineAct(xml, {});
    expect(chapters.map((c) => c.number)).toEqual(["IIA"]);
    expect(sections.map((s) => s.number)).toEqual(["5"]);
    expect(sections[0]?.bodyMd).not.toMatch(/CHAPTER/);
  });

  it("does not treat mixed-case body prose mentioning a Part as a heading", () => {
    const xml = doc(
      lines([
        { h: 10, text: "WHEREAS it is enacted as follows:—" },
        { h: 10, text: "3. Application.—Nothing in this section shall apply to a person." },
        { h: 10, text: "PART II of the Schedule shall be read with this section." },
        { h: 10, text: "4. Savings.—This Act shall not affect any right." },
      ]),
    );
    const { sections, chapters } = parseInlineAct(xml, {});
    expect(sections.map((s) => s.number)).toEqual(["3", "4"]);
    // The point of this guard: a mixed-case line must not open a chapter, and
    // must not swallow the sections around it. (How the parser otherwise treats
    // a prose line beginning "PART II …" is pre-existing behaviour and is
    // deliberately not asserted here.)
    expect(chapters).toHaveLength(0);
    expect(sections[1]?.marginalNote).toContain("Savings");
  });
});

/**
 * A line whose words are set at different sizes — a small-caps heading, where
 * the enlarged first letter is body height and the rest is footnote height.
 */
function mixedLine(y: number, parts: Array<{ h: number; text: string }>): string {
  let x = 200;
  const out: string[] = [];
  for (const { h, text } of parts) {
    for (const token of text.split(" ")) {
      out.push(word(x, y, h, token));
      x += token.length * 5 + 5;
    }
  }
  return out.join("\n");
}

describe("parseInlineAct chapter headings", () => {
  it("reads a bare PART II as a division, not the Gazette masthead", () => {
    // "PART II" was furniture because the Gazette masthead says "[PART II—SEC.
    // 3(i)]". That dropped the Constitution's PART II (Citizenship) and the
    // Limitation Act's PART II, and left their sections under the wrong part.
    const xhtml = doc(
      [
        lines([PREAMBLE, { h: 10, text: "1. Short title.—This Act may be called X." }]),
        mixedLine(100, [{ h: 10, text: "PART II" }]),
        mixedLine(114, [
          { h: 10, text: "L" },
          { h: 8.1, text: "IMITATION OF SUITS" },
        ]),
        lines([{ h: 10, text: "3. Bar of limitation.—Every suit shall be dismissed." }], 130),
      ].join("\n"),
    );

    const { sections, chapters } = parseInlineAct(xhtml, {});
    expect(chapters.map((c) => c.number)).toContain("II");
    // The small type after the heading is the title, not a footnote.
    expect(chapters.find((c) => c.number === "II")?.title).toBe("LIMITATION OF SUITS");
    expect(sections.find((s) => s.number === "3")?.chapterNumber).toBe("II");
    // …and none of the heading leaked into a section body.
    expect(sections.find((s) => s.number === "1")?.bodyMd).not.toContain("L");
  });

  it("still drops the Gazette masthead in both its printed forms", () => {
    const xhtml = doc(
      lines([
        PREAMBLE,
        { h: 10, text: "1. Short title.—This Act may be called X." },
        { h: 10, text: "[PART II—SEC. 3(i)]" },
        { h: 10, text: "Part II, sec. 3(ii)." },
        { h: 10, text: "2. Definitions.—In this Act, unless the context otherwise requires." },
      ]),
    );

    const { sections, chapters } = parseInlineAct(xhtml, {});
    expect(chapters).toHaveLength(0);
    for (const section of sections) {
      expect(section.bodyMd).not.toContain("SEC. 3(i)");
      expect(section.bodyMd).not.toContain("sec. 3(ii)");
    }
  });

  it("does not end the act on a footnote that quotes a schedule heading", () => {
    // The Constitution footnotes an amendment as "…for the heading ―THE STATES
    // IN PART C OF THE FIRST / SCHEDULE‖ (w.e.f. 1-11-1956)." The wrapped
    // line's lowercase tail is below body height and filtered away, leaving
    // "SCHEDULE‖" — which truncated the parse at art. 239, losing 223 articles.
    const xhtml = doc(
      [
        lines([
          PREAMBLE,
          { h: 10, text: "3. Administration.—Union territories shall be administered." },
        ]),
        mixedLine(100, [
          { h: 10, text: "SCHEDULE‖" },
          { h: 8.1, text: "(w.e.f. 1-11-1956)." },
        ]),
        lines([{ h: 10, text: "4. Definitions.—In this Part, unless the context requires." }], 120),
      ].join("\n"),
    );

    const { sections } = parseInlineAct(xhtml, {});
    expect(sections.map((s) => s.number)).toEqual(["3", "4"]);
  });

  it("still ends the act at a real schedule heading, plain or titled", () => {
    for (const heading of ["THE SCHEDULE", "THE FIRST SCHEDULE", "SCHEDULE.—[Enactments repealed]"]) {
      const xhtml = doc(
        lines([
          PREAMBLE,
          { h: 10, text: "1. Short title.—This Act may be called X." },
          { h: 10, text: heading },
          { h: 10, text: "2. Ganja.—Any mixture with or without neutral materials." },
        ]),
      );
      const { sections } = parseInlineAct(xhtml, {});
      expect(sections.map((s) => s.number)).toEqual(["1"]);
    }
  });

  it("names a Part whose title carries amendment apparatus", () => {
    // The Constitution sets Part VIII's title as "[THE UNION TERRITORIES]" and
    // Part VI's as "THE STATES4***"; the strict all-caps test rejected both and
    // left them as the generic "Chapter VIII".
    const xhtml = doc(
      [
        lines([PREAMBLE, { h: 10, text: "1. Short title.—This Act may be called X." }]),
        mixedLine(100, [{ h: 10, text: "PART VIII" }]),
        mixedLine(114, [{ h: 10, text: "[THE UNION TERRITORIES]" }]),
        lines([{ h: 10, text: "3. Administration.—Union territories shall be administered." }], 130),
      ].join("\n"),
    );

    const { chapters } = parseInlineAct(xhtml, {});
    expect(chapters.find((c) => c.number === "VIII")?.title).toBe("THE UNION TERRITORIES");
  });

  it("stops a Part title at the CHAPTER heading beneath it", () => {
    // "PART V / THE UNION / CHAPTER I.—THE EXECUTIVE" gave Part V the title
    // "THE UNION CHAPTER I.—T HE EXECUTIVE". The drop cap splits the word, so
    // the heading is only recognisable after small-caps repair.
    const xhtml = doc(
      [
        lines([PREAMBLE, { h: 10, text: "1. Short title.—This Act may be called X." }]),
        mixedLine(100, [{ h: 10, text: "PART V" }]),
        mixedLine(114, [{ h: 10, text: "THE UNION" }]),
        mixedLine(128, [
          { h: 10, text: "C" },
          { h: 8.1, text: "HAPTER I.—T HE E XECUTIVE" },
        ]),
        lines([{ h: 10, text: "52. The President.—There shall be a President of India." }], 145),
      ].join("\n"),
    );

    const { chapters } = parseInlineAct(xhtml, {});
    expect(chapters.find((c) => c.number === "V")?.title).toBe("THE UNION");
  });

  it("nests Chapters under their Part, and keeps repeated numbers apart", () => {
    // The Arbitration Act prints CHAPTER I inside PART I and again inside
    // PART II. One namespace made them the same division, which would have
    // labelled Part I's sections with Part II's title — the reason ARB stayed
    // unpublished. The parent Part is part of a division's identity.
    const xhtml = doc(
      [
        lines([PREAMBLE, { h: 10, text: "1. Short title.—This Act may be called X." }]),
        mixedLine(100, [{ h: 10, text: "PART I" }]),
        mixedLine(114, [{ h: 10, text: "ARBITRATION" }]),
        mixedLine(128, [{ h: 10, text: "CHAPTER I" }]),
        // ARB sets its chapter titles in sentence case, not caps.
        mixedLine(142, [{ h: 10, text: "General provisions" }]),
        lines([{ h: 10, text: "2. Definitions.—In this Part, unless the context requires." }], 158),
        mixedLine(190, [{ h: 10, text: "PART II" }]),
        mixedLine(204, [{ h: 10, text: "ENFORCEMENT OF FOREIGN AWARDS" }]),
        mixedLine(218, [{ h: 10, text: "CHAPTER I" }]),
        mixedLine(232, [{ h: 10, text: "New York Convention Awards" }]),
        lines([{ h: 10, text: "3. Definition.—In this Chapter, foreign award means an award." }], 248),
      ].join("\n"),
    );

    const { sections, chapters } = parseInlineAct(xhtml, {});

    const parts = chapters.filter((c) => c.kind === "part");
    expect(parts.map((c) => c.number)).toEqual(["I", "II"]);

    const firstChapter = chapters.find((c) => c.kind === "chapter" && c.partNumber === "I");
    const secondChapter = chapters.find((c) => c.kind === "chapter" && c.partNumber === "II");
    expect(firstChapter?.number).toBe("I");
    expect(firstChapter?.title).toBe("General provisions");
    expect(secondChapter?.number).toBe("I");
    expect(secondChapter?.title).toBe("New York Convention Awards");

    // Each section names both halves of its division's identity.
    expect(sections.find((s) => s.number === "2")).toMatchObject({
      chapterNumber: "I",
      partNumber: "I",
    });
    expect(sections.find((s) => s.number === "3")).toMatchObject({
      chapterNumber: "I",
      partNumber: "II",
    });
  });

  it("does not read a centred cross-heading as part of the title above it", () => {
    // Cross-headings are centred too and sit below the title: an unrestricted
    // rule gave CPC Part II the name "EXECUTION General".
    const xhtml = doc(
      [
        lines([PREAMBLE, { h: 10, text: "1. Short title.—This Act may be called X." }]),
        mixedLine(100, [{ h: 10, text: "PART II" }]),
        mixedLine(114, [{ h: 10, text: "EXECUTION" }]),
        mixedLine(128, [{ h: 10, text: "General" }]),
        lines([{ h: 10, text: "3. Courts.—The court executing a decree shall proceed." }], 145),
      ].join("\n"),
    );

    const { chapters } = parseInlineAct(xhtml, {});
    expect(chapters.find((c) => c.number === "II")?.title).toBe("EXECUTION");
  });

  it("keeps a part title that legitimately begins with SEC", () => {
    // The masthead is identified by its numbered section reference; a title
    // like "SECURITY FOR COSTS" has no digit and must survive.
    const xhtml = doc(
      [
        lines([PREAMBLE, { h: 10, text: "1. Short title.—This Act may be called X." }]),
        mixedLine(100, [{ h: 10, text: "PART III" }]),
        mixedLine(114, [
          { h: 10, text: "S" },
          { h: 8.1, text: "ECURITY FOR COSTS" },
        ]),
        lines([{ h: 10, text: "3. Deposit.—The court may order security." }], 130),
      ].join("\n"),
    );

    const { chapters } = parseInlineAct(xhtml, {});
    expect(chapters.find((c) => c.number === "III")?.title).toBe("SECURITY FOR COSTS");
  });
});
