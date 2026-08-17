import { describe, expect, it } from "vitest";

import { parseCpcSchedule } from "./cpc-schedule";

/** Minimal bbox page, matching the fixtures the inline parser's tests use. */
function page(lines: { text: string; h?: number; y?: number }[]): string {
  const words = lines
    .map((l, i) => {
      const y = l.y ?? 100 + i * 20;
      const h = l.h ?? 12.2;
      return l.text
        .split(" ")
        .map(
          (w, j) =>
            `<word xMin="${70 + j * 30}" yMin="${y}" xMax="${95 + j * 30}" yMax="${y + h}">${w}</word>`,
        )
        .join("");
    })
    .join("");
  return `<page width="595" height="841">${words}</page>`;
}

const SCHEDULE_HEAD = { text: "THE FIRST SCHEDULE" };

describe("parseCpcSchedule", () => {
  it("enters at the Schedule and reads Orders and Rules", () => {
    const xml = page([
      SCHEDULE_HEAD,
      { text: "ORDER I" },
      { text: "Parties to Suits" },
      { text: "1. Who may be joined as plaintiffs.—All persons may be joined in one suit." },
      { text: "2. Power of Court to order separate trial.—Where it appears to the Court." },
    ]);
    const { orders } = parseCpcSchedule(xml);
    expect(orders).toHaveLength(1);
    expect(orders[0]?.number).toBe("I");
    expect(orders[0]?.title).toBe("Parties to Suits");
    expect(orders[0]?.rules.map((r) => r.number)).toEqual(["1", "2"]);
    expect(orders[0]?.rules[0]?.marginalNote).toBe("Who may be joined as plaintiffs");
  });

  it("restarts rule numbering in each Order", () => {
    // The reason this parser exists: the section parser's strictly-increasing
    // guard would reject Order II rule 1 after Order I rule 13.
    const xml = page([
      SCHEDULE_HEAD,
      { text: "ORDER I" },
      { text: "Parties" },
      { text: "13. Objections as to non-joinder.—All objections shall be taken." },
      { text: "ORDER II" },
      { text: "Frame of suit" },
      { text: "1. Frame of suit.—Every suit shall be framed so far as practicable." },
    ]);
    const { orders } = parseCpcSchedule(xml);
    expect(orders.map((o) => o.number)).toEqual(["I", "II"]);
    expect(orders[1]?.rules.map((r) => r.number)).toEqual(["1"]);
  });

  it("reads an Order heading carrying amendment apparatus", () => {
    // Order XV is printed "*[ORDER XV"; XVI-A is "1 [ORDER XVI A", with a
    // space before the letter rather than a hyphen. Both were lost entirely
    // before the marker strip and the space-separated suffix.
    const xml = page([
      SCHEDULE_HEAD,
      { text: "ORDER I" },
      { text: "Parties" },
      { text: "1. First rule.—Something is provided here for the suit." },
      { text: "1 [ORDER XVI A" },
      { text: "Attendance of witnesses confined or detained in prisons" },
      { text: "1. Definitions.—In this Order, the following words apply." },
    ]);
    const { orders } = parseCpcSchedule(xml);
    expect(orders.map((o) => o.number)).toContain("XVI-A");
  });

  it("keeps State amendments out, including one with no banner", () => {
    // D-052's model: an amending instruction opens a region on its own where
    // no STATE AMENDMENT line is printed. Uttar Pradesh's second insertion into
    // Order XV does exactly that, and its rule 5 entered as central law.
    const xml = page([
      SCHEDULE_HEAD,
      { text: "ORDER I" },
      { text: "Parties" },
      { text: "1. Real rule.—This is the central provision and must survive." },
      { text: "Uttar Pradesh Insertion of new rule in Order I" },
      { text: "1. State rule.—This belongs to one State and must not enter." },
      { text: "ORDER II" },
      { text: "Frame of suit" },
      { text: "1. Frame of suit.—Every suit shall be framed so far as practicable." },
    ]);
    const { orders } = parseCpcSchedule(xml);
    const first = orders.find((o) => o.number === "I");
    expect(first?.rules.map((r) => r.number)).toEqual(["1"]);
    expect(first?.rules[0]?.bodyMd).toContain("central provision");
    expect(JSON.stringify(orders)).not.toContain("belongs to one State");
  });

  it("stops at the Appendices and not at a mention of one", () => {
    // Case-sensitivity matters: body text says "in the form in Appendix C,
    // with such variations as circumstances may require", and an /i prefix
    // match ended the Schedule at Order XI.
    const xml = page([
      SCHEDULE_HEAD,
      { text: "ORDER I" },
      { text: "Parties" },
      { text: "1. First rule.—Shall be in the form in Appendix C, with such variations." },
      { text: "2. Second rule.—This must still be read after that mention." },
      { text: "APPENDIX A" },
      { text: "1. Form of plaint.—This is a form, not a rule." },
    ]);
    const { orders } = parseCpcSchedule(xml);
    expect(orders[0]?.rules.map((r) => r.number)).toEqual(["1", "2"]);
    expect(JSON.stringify(orders)).not.toContain("This is a form");
  });

  it("keeps a repealed rule but drops a footnote wearing a rule number", () => {
    const xml = page([
      SCHEDULE_HEAD,
      { text: "ORDER I" },
      { text: "Parties" },
      { text: "1. Real rule.—The central provision reads as follows here." },
      { text: "2. [Consolidation of suits.] Rep. by the Code of Civil Procedure Act 1976." },
      { text: "3. Explanation ins. by s. 59, ibid. (w.e.f. 1-2-1977)." },
    ]);
    const { orders } = parseCpcSchedule(xml);
    const nums = orders[0]?.rules.map((r) => r.number);
    expect(nums).toContain("2"); // repealed rule is content
    expect(nums).not.toContain("3"); // footnote is not
  });
});
