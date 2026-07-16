import { describe, expect, it } from "vitest";

import { classifyLine } from "./gazette-bbox";
import { assembleSections, CITATION, type LineParts } from "./gazette-common";

/** Word on one visual line (baseline irrelevant to classifyLine). */
const w = (xMin: number, xMax: number, text: string) => ({
  xMin,
  yMin: 0,
  xMax,
  baseline: 100,
  height: 10,
  text,
});

describe("CITATION", () => {
  it("accepts plain, space-padded, and stacked citations", () => {
    expect(CITATION.test("1 of 1872.")).toBe(true);
    expect(CITATION.test("32 of 2012 .")).toBe(true);
    expect(CITATION.test("20 of 1958. 2 of 2016.")).toBe(true);
    expect(CITATION.test("good conduct or")).toBe(false);
  });
});

describe("classifyLine (left-note page)", () => {
  it("splits a note fragment from a body continuation starting at the body edge", () => {
    // BNS §69: note line "intercourse" drifted into a body line's baseline
    // window; body continuation words start at ≈117.6 — inside the old
    // xMax-based zone but past the note column's word starts.
    const parts = classifyLine(
      [w(57.9, 115, "intercourse"), w(117.6, 133, "any"), w(140, 170, "person")],
      false,
    );
    expect(parts.margin).toBe("intercourse");
    expect(parts.body).toBe("any person");
  });

  it("keeps note words that start just past 106 (BNSS §401 'or')", () => {
    const parts = classifyLine(
      [w(57.9, 74, "good"), w(77.4, 103.4, "conduct"), w(106.5, 114, "or")],
      false,
    );
    expect(parts.margin).toBe("good conduct or");
    expect(parts.body).toBeUndefined();
  });

  it("strips a left-margin citation on a RIGHT-note page (BSA §170)", () => {
    const parts = classifyLine(
      [w(58, 63, "1"), w(65, 74, "of"), w(75, 100, "1872."), w(142, 160, "170."), w(161, 175, "(1)")],
      true,
    );
    expect(parts.citation).toBe("1 of 1872.");
    expect(parts.body).toBe("170. (1)");
  });
});

describe("assembleSections note overflow", () => {
  it("peels a ragged note's queued tail back across a chapter heading (BNSS §391/392)", () => {
    const lines: LineParts[] = [
      { body: "391. Except as provided…", margin: "Certain Judges not to try offences when" },
      { body: "judicial proceeding." },
      { body: "CHAPTER XXIX", margin: "committed before" },
      { margin: "themselves." },
      { body: "THE JUDGMENT" },
      { body: "392. (1) The judgment in every trial…", margin: "Judgment." },
    ];
    const { sections, chapters } = assembleSections(lines);
    expect(sections[0]?.marginalNote).toBe(
      "Certain Judges not to try offences when committed before themselves",
    );
    expect(sections[0]?.chapterNumber).toBeUndefined(); // printed before ch. XXIX
    expect(sections[1]?.marginalNote).toBe("Judgment");
    expect(sections[1]?.chapterNumber).toBe("XXIX");
    expect(chapters[0]?.title).toBe("THE JUDGMENT");
  });

  it("does not steal a complete early-printed note from the next section", () => {
    const lines: LineParts[] = [
      { body: "77. Whoever watches…", margin: "Voyeurism." },
      { body: "in such circumstances." },
      { body: "further body line." },
      { margin: "Stalking." }, // §78's note, printed just above its start
      { body: "78. (1) Any man who follows…" },
    ];
    const { sections } = assembleSections(lines);
    expect(sections[0]?.marginalNote).toBe("Voyeurism");
    expect(sections[1]?.marginalNote).toBe("Stalking");
  });

  it("treats body-column text under a pending chapter as title material, not body", () => {
    const lines: LineParts[] = [
      { body: "44. Body of forty-four.", margin: "Right of private defence." },
      { body: "CHAPTER IV" },
      { body: "Of abetment" }, // mixed-case small-caps rendering
      { body: "45. Abetment of a thing.", margin: "Abetment." },
    ];
    const { sections } = assembleSections(lines);
    expect(sections[0]?.bodyMd).not.toContain("Of abetment");
    expect(sections[1]?.number).toBe("45");
  });
});
