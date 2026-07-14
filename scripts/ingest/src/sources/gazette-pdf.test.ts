import { describe, expect, it } from "vitest";

import { parseGazetteLayoutText, splitLine } from "./gazette-pdf";

// Verbatim slices from `pdftotext -layout` of the official BNS 2023 PDF
// (MHA mirror) — the layouts this parser exists to handle.
const LEFT_MARGIN_SLICE = [
  "      BE it enacted by Parliament in the Seventy-fourth Year of the Republic of India as",
  "follows:—",
  "                                                             CHAPTER II",
  "                                                            OF PUNISHMENTS",
  "Punishment                103. (1) Whoever commits murder shall be punished with death or imprisonment for",
  "for murder.        life, and shall also be liable to fine.",
  "                         (2) When a group of five or more persons acting in concert commits murder on the",
  "                   ground of race, caste or community, sex, place of birth, language, personal belief or any",
  "                   other similar ground each member of such group shall be punished with death or with",
  "                   imprisonment for life, and shall also be liable to fine.",
  "Punishment              104. Whoever, being under sentence of imprisonment for life, commits murder, shall be",
  "for murder by      punished with death or with imprisonment for life, which shall mean the remainder of that",
  "life-convict.",
  "                   person’s natural life.",
].join("\n");

const RIGHT_MARGIN_SLICE = [
  "      BE it enacted by Parliament in the Seventy-fourth Year of the Republic of India as",
  "follows:—",
  "Punishment                103. (1) Whoever commits murder shall be punished with death or imprisonment for",
  "for murder.        life, and shall also be liable to fine.",
  "                    104. Whoever sells, lets to hire, distributes, exhibits or circulates to any child any such   Sale, etc., of",
  "                    obscene object as is referred to in section 294, or offers or attempts so to do, shall be        obscene objects",
  "                    punished on first conviction with imprisonment.                                                                to child.",
].join("\n");

const CITATION_SLICE = [
  "      BE it enacted by Parliament in the Seventy-fourth Year of the Republic of India as",
  "follows:—",
  "Repeal and             358. (1) The Indian Penal Code is hereby repealed.                                             45 of 1860.",
  "savings.                    (2) Notwithstanding the repeal of the Code referred to in sub-section (1), it shall not",
  "                   affect anything done under such Code.",
  "                                                                                     DIWAKAR SINGH,",
  "                                              Joint Secretary & Legislative Counsel to the Govt. of India.",
].join("\n");

describe("splitLine", () => {
  it("separates left margin from body", () => {
    expect(
      splitLine(
        "Punishment                103. (1) Whoever commits murder shall be punished with death or imprisonment for",
      ),
    ).toEqual({
      margin: "Punishment",
      body: "103. (1) Whoever commits murder shall be punished with death or imprisonment for",
    });
  });

  it("treats margin-only lines as margin", () => {
    expect(splitLine("life-convict.")).toEqual({ margin: "life-convict." });
  });

  it("treats indented lines as body", () => {
    expect(splitLine("                   person’s natural life.")).toEqual({
      body: "person’s natural life.",
    });
  });

  it("extracts right-margin note fragments", () => {
    const parts = splitLine(
      "                    104. Whoever sells, lets to hire, distributes, exhibits or circulates to any child any such   Sale, etc., of",
    );
    expect(parts.margin).toBe("Sale, etc., of");
    expect(parts.body).toContain("104. Whoever sells");
  });

  it("classifies statutory citations separately", () => {
    const parts = splitLine(
      "Repeal and             358. (1) The Indian Penal Code is hereby repealed.                                             45 of 1860.",
    );
    expect(parts.citation).toBe("45 of 1860.");
    expect(parts.margin).toBe("Repeal and");
    expect(parts.body).toBe("358. (1) The Indian Penal Code is hereby repealed.");
  });
});

describe("parseGazetteLayoutText", () => {
  it("parses left-margin sections with chapters and multi-line notes", () => {
    const { sections, chapters } = parseGazetteLayoutText(LEFT_MARGIN_SLICE);
    expect(chapters).toEqual([{ number: "II", title: "OF PUNISHMENTS", sortOrder: 1 }]);
    expect(sections).toHaveLength(2);

    expect(sections[0]).toMatchObject({
      number: "103",
      chapterNumber: "II",
      marginalNote: "Punishment for murder",
    });
    expect(sections[0]!.bodyMd).toContain(
      "(1) Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine.",
    );
    expect(sections[0]!.bodyMd).toContain("\n\n(2) When a group of five or more persons");

    expect(sections[1]).toMatchObject({
      number: "104",
      marginalNote: "Punishment for murder by life-convict",
    });
    expect(sections[1]!.bodyMd).toContain("remainder of that person’s natural life.");
  });

  it("parses right-margin notes", () => {
    const { sections } = parseGazetteLayoutText(RIGHT_MARGIN_SLICE);
    expect(sections).toHaveLength(2);
    expect(sections[1]).toMatchObject({
      number: "104",
      marginalNote: "Sale, etc., of obscene objects to child",
    });
    expect(sections[1]!.bodyMd).toContain("obscene object as is referred to in section 294");
    expect(sections[1]!.bodyMd).not.toContain("Sale, etc.");
  });

  it("excludes citations and stops at the signature block", () => {
    const { sections, diagnostics } = parseGazetteLayoutText(CITATION_SLICE);
    expect(sections).toHaveLength(1);
    const section = sections[0]!;
    expect(section.number).toBe("358");
    expect(section.marginalNote).toBe("Repeal and savings");
    expect(section.bodyMd).not.toContain("45 of 1860");
    expect(section.bodyMd).not.toContain("DIWAKAR");
    expect(section.bodyMd).toContain("(2) Notwithstanding the repeal");
    expect(diagnostics.join()).toContain("45 of 1860");
  });

  it("handles gazette kerning quirks: CHAPTERI and 192.Whoever", () => {
    const text = [
      "      BE it enacted by Parliament in the Seventy-fourth Year of the Republic of India as",
      "                                      CHAPTERI",
      "                                     PRELIMINARY",
      "Short title.         1. This Sanhita may be called the Bharatiya Nyaya Sanhita, 2023.",
      "Wantonly              2.Whoever malignantly, or wantonly by doing anything which is illegal, gives",
      "giving                provocation to any person.",
    ].join("\n");
    const { sections, chapters } = parseGazetteLayoutText(text);
    expect(chapters).toEqual([{ number: "I", title: "PRELIMINARY", sortOrder: 1 }]);
    expect(sections).toHaveLength(2);
    expect(sections[1]).toMatchObject({ number: "2", marginalNote: "Wantonly giving" });
    expect(sections[1]!.bodyMd).toContain("Whoever malignantly");
  });

  it("guards against implausible section jumps", () => {
    const text = [
      "      BE it enacted by Parliament in the Seventy-fourth Year of the Republic of India as",
      "Short title.         1. This is section one text that continues here.",
      "                   500. This looks like a section start but is implausible.",
    ].join("\n");
    const { sections, diagnostics } = parseGazetteLayoutText(text);
    expect(sections).toHaveLength(1);
    expect(diagnostics.join()).toContain("implausible");
  });
});
