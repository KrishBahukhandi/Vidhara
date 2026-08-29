import { describe, expect, it } from "vitest";

import { parseOffenceRules, parseOffenceSchedule } from "./offence-schedule";

/** One bbox word. */
const w = (x: number, y: number, text: string, width = text.length * 5, h = 10) =>
  `<word xMin="${x}" yMin="${y}" xMax="${x + width}" yMax="${y + h}">${text}</word>`;

/**
 * Lay a table row out across the six columns at their canonical x positions.
 *
 * Words are packed tightly (6pt wide, 8pt apart) so that even a long cell stays
 * inside its own column — only the x positions matter here, and a cell spilling
 * into its neighbour would be testing the fixture rather than the parser.
 */
function row(y: number, cells: [string, string, string, string, string, string]) {
  const at = [60, 90, 250, 360, 440, 510];
  return cells
    .map((c, i) => (c ? c.split(" ").map((t, j) => w(at[i]! + j * 8, y, t, 6)).join("\n") : ""))
    .filter(Boolean)
    .join("\n");
}

/** The column-number row that marks a page as the table. */
const header = (y: number) =>
  ["1", "2", "3", "4", "5", "6"].map((n, i) => w([60, 150, 280, 375, 455, 520][i]!, y, n, 6)).join("\n");

const page = (content: string) => `<page width="595" height="842">\n${content}\n</page>`;
const doc = (...pages: string[]) => `<?xml version="1.0"?>\n<html><body>\n${pages.join("\n")}\n</body></html>`;

describe("offence schedule (D-079/D-080)", () => {
  it("reads a plain row and names its source act's sections", () => {
    const xml = doc(
      page(
        [
          w(200, 40, "I.—OFFENCES UNDER THE INDIAN PENAL CODE", 300),
          header(60),
          row(80, ["302", "Murder.", "Death.", "Cognizable.", "Non-bailable.", "Court of Session."]),
        ].join("\n"),
      ),
    );
    const { rows } = parseOffenceSchedule(xml);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      section: "302",
      isCognizable: true,
      isBailable: false,
      hasTiers: false,
    });
    expect(rows[0]?.court).toEqual(["Court of Session"]);
  });

  it("resolves Ditto against the row above", () => {
    // The CrPC sets 1,042 Dittos against 181 spelled-out values, so a row
    // lifted onto its own section page says nothing at all unless they resolve.
    const xml = doc(
      page(
        [
          w(200, 40, "I.—OFFENCES UNDER THE INDIAN PENAL CODE", 300),
          header(60),
          row(80, ["302", "Murder.", "Death.", "Cognizable.", "Non-bailable.", "Court of Session."]),
          row(110, ["303", "Murder by a lifer.", "Death.", "Ditto", "Ditto", "Ditto."]),
        ].join("\n"),
      ),
    );
    const { rows } = parseOffenceSchedule(xml);
    expect(rows.map((r) => r.section)).toEqual(["302", "303"]);
    expect(rows[1]?.cognizable).toEqual(["Cognizable"]);
    expect(rows[1]?.bailable).toEqual(["Non-bailable"]);
    expect(rows[1]?.isCognizable).toBe(true);
  });

  it("states nothing where the schedule states a condition", () => {
    const xml = doc(
      page(
        [
          w(200, 40, "I.—OFFENCES UNDER THE INDIAN PENAL CODE", 300),
          header(60),
          row(80, [
            "109",
            "Abetment.",
            "Same as offence.",
            "According as offence abetted is cognizable or non-cognizable.",
            "According as offence abetted is bailable or non-bailable.",
            "Court by which offence abetted is triable.",
          ]),
        ].join("\n"),
      ),
    );
    const { rows } = parseOffenceSchedule(xml);
    expect(rows[0]?.isCognizable).toBeNull();
    expect(rows[0]?.isBailable).toBeNull();
    expect(rows[0]?.cognizable[0]).toMatch(/^According as/);
  });

  it("reads a section number carrying the print's amendment bracket", () => {
    // "1[376" reaches column 1 as "[376" once the superscript marker falls
    // below the height filter. Left unhandled, IPC 354, 376 and 506 all
    // vanished while their lettered neighbours came through.
    const xml = doc(
      page(
        [
          w(200, 40, "I.—OFFENCES UNDER THE INDIAN PENAL CODE", 300),
          header(60),
          row(80, ["[376", "Rape.", "Rigorous imprisonment.", "Cognizable.", "Non-bailable.", "Court of Session."]),
        ].join("\n"),
      ),
    );
    const { rows } = parseOffenceSchedule(xml);
    expect(rows[0]?.section).toBe("376");
  });

  it("keeps a sub-section that is classified differently", () => {
    const xml = doc(
      page(
        [
          w(200, 40, "I.—OFFENCES UNDER THE BHARATIYA NYAYA SANHITA", 320),
          header(60),
          row(80, ["64(1)", "Rape.", "Rigorous.", "Cognizable.", "Non-bailable.", "Court of Session."]),
          row(110, ["64(2)", "Rape by police.", "Rigorous.", "Cognizable.", "Non-bailable.", "Court of Session."]),
        ].join("\n"),
      ),
    );
    const { rows } = parseOffenceSchedule(xml);
    expect(rows.map((r) => `${r.section}(${r.subsection})`)).toEqual(["64(1)", "64(2)"]);
  });

  it("refuses to read the contents page as the table", () => {
    // Both acts name Part I in their Arrangement of Sections hundreds of pages
    // early. Entering there parses the whole Act as a six-column table.
    const xml = doc(
      page(w(200, 40, "I.—OFFENCES UNDER THE INDIAN PENAL CODE", 300)), // no column-number row
      page(w(60, 40, "302. Punishment for murder.—Whoever commits murder shall be punished.", 400)),
    );
    const { rows } = parseOffenceSchedule(xml);
    expect(rows).toHaveLength(0);
  });
});

describe("offence schedule Part II — offences against other laws (D-084)", () => {
  /** Part II's four columns at their canonical x positions. */
  function band(y: number, cells: [string, string, string, string]) {
    const at = [55, 340, 400, 470];
    return cells
      .map((c, i) => (c ? c.split(" ").map((t, j) => w(at[i]! + j * 8, y, t, 6)).join("\n") : ""))
      .filter(Boolean)
      .join("\n");
  }
  /** The label row. Only the first word of each label is anchored on. */
  const labels = (y: number) =>
    [
      w(180, y, "Offence", 40),
      w(340, y, "Cognizable", 50),
      w(400, y, "Bailable", 40),
      w(470, y, "By", 12),
      w(486, y, "what", 20),
      w(510, y, "court", 24),
      w(538, y, "triable", 28),
    ].join("\n");
  const heading = (y: number) => w(150, y, "II.—CLASSIFICATION OF OFFENCES AGAINST OTHER LAWS", 300);

  const threeBands = (y: number) =>
    [
      band(y, ["If punishable with death", "Cognizable.", "Non-bailable.", "Court of Session."]),
      band(y + 14, ["If punishable with 5 years", "Ditto.", "Ditto.", "Magistrate of the first class."]),
      band(y + 28, ["If punishable with fine only", "Non-cognizable.", "Bailable.", "Any Magistrate."]),
    ].join("\n");

  it("reads the three bands and resolves their Dittos", () => {
    const { rules, diagnostics } = parseOffenceRules(
      doc(page([heading(40), labels(60), threeBands(80)].join("\n"))),
    );
    expect(diagnostics).not.toContain("refused: Part II did not validate");
    expect(rules).toHaveLength(3);
    expect(rules[0]).toEqual({
      punishment: "If punishable with death.",
      cognizable: "Cognizable",
      bailable: "Non-bailable",
      court: "Court of Session",
    });
    // Both of the middle band's Dittos mean the band above it.
    expect(rules[1]).toMatchObject({ cognizable: "Cognizable", bailable: "Non-bailable" });
    expect(rules[2]).toMatchObject({ cognizable: "Non-cognizable", bailable: "Bailable" });
  });

  it("does not read the Arrangement of Sections as the table", () => {
    // Both prints name Part II hundreds of pages before they print it.
    const { rules } = parseOffenceRules(
      doc(page([heading(40), w(60, 60, "223", 20)].join("\n")), page([heading(40), labels(60), threeBands(80)].join("\n"))),
    );
    expect(rules).toHaveLength(3);
  });

  it("stops at the footnotes below the table", () => {
    // The CrPC follows Part II with "1. Subs. by Act 13 of 2013 …" 94pt down.
    const { rules } = parseOffenceRules(
      doc(
        page(
          [
            heading(40),
            labels(60),
            threeBands(80),
            band(190, ["1. Subs. by Act 13 of 2013, s. 24, for the word", "", "", ""]),
          ].join("\n"),
        ),
      ),
    );
    expect(rules).toHaveLength(3);
    expect(rules[2]!.punishment).toBe("If punishable with fine only.");
  });

  it("refuses a Part II whose columns slipped", () => {
    // A boundary inside column 2 puts a punishment where a classification
    // belongs. Publishing that would say offences punishable by death are
    // bailable, so nothing is published at all.
    const { rules, diagnostics } = parseOffenceRules(
      doc(
        page(
          [
            heading(40),
            labels(60),
            band(80, ["If punishable with death", "Imprisonment for life.", "Non-bailable.", "Court of Session."]),
            band(94, ["If punishable with fine only", "Fine.", "Bailable.", "Any Magistrate."]),
          ].join("\n"),
        ),
      ),
    );
    expect(rules).toHaveLength(0);
    expect(diagnostics).toContain("refused: Part II did not validate");
  });
});
