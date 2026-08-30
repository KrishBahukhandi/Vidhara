import { describe, expect, it } from "vitest";

import { parseListSchedule } from "./list-schedule";

/** One bbox word. Heights mirror the 2026 Constitution print: body 8.10pt,
 * footnotes 7.24pt, superscript markers 5.40pt, watermark 11.79pt and above. */
const word = (x: number, y: number, h: number, text: string) =>
  `<word xMin="${x}" yMin="${y}" xMax="${x + text.length * 4}" yMax="${y + h}">${text}</word>`;

/** Lays each string out as one visual line, 12pt apart. An entry opens at the
 * indent (x=54) and wraps back to the margin (x=36). */
function lines(specs: Array<{ h?: number; text: string; x?: number }>, startY = 60): string {
  let y = startY;
  const out: string[] = [];
  for (const { h = 8.1, text, x: startX } of specs) {
    let x = startX ?? 36;
    for (const token of text.split(" ")) {
      out.push(word(x, y, h, token));
      x += token.length * 4 + 4;
    }
    y += 12;
  }
  return out.join("\n");
}

const page = (content: string) => `<page width="360" height="504">\n${content}\n</page>`;
const doc = (...pages: string[]) =>
  `<?xml version="1.0"?>\n<html><body>\n${pages.map(page).join("\n")}\n</body></html>`;

const OPTIONS = { heading: /SEVENTHSCHEDULE/i, endsBefore: /EIGHTHSCHEDULE/i };

describe("list-shaped schedules (D-087)", () => {
  it("reads three Lists, their titles and their entries", () => {
    const xhtml = doc(
      lines([
        { text: "SEVENTH SCHEDULE", x: 133 },
        { text: "(Article 246)", x: 157 },
        { text: "List I—Union List", x: 145 },
        { text: "1. Defence of India and every part thereof including preparation", x: 54 },
        { text: "for defence and effective demobilisation." },
        { text: "2. Naval, military and air forces.", x: 54 },
        { text: "List II—State List", x: 145 },
        { text: "1. Public order.", x: 54 },
        { text: "List III—Concurrent List", x: 130 },
        { text: "1. Criminal law.", x: 54 },
      ]),
      lines([{ text: "EIGHTH SCHEDULE", x: 136 }]),
    );
    const { authority, lists, diagnostics } = parseListSchedule(xhtml, OPTIONS);
    expect(authority).toBe("Article 246");
    expect(lists.map((l) => `${l.number}:${l.title}`)).toEqual([
      "I:Union List",
      "II:State List",
      "III:Concurrent List",
    ]);
    expect(lists[0]?.entries.map((e) => e.number)).toEqual(["1", "2"]);
    // A wrapped line belongs to the entry it continues, joined with a space.
    expect(lists[0]?.entries[0]?.text).toBe(
      "Defence of India and every part thereof including preparation for defence and effective demobilisation.",
    );
    expect(diagnostics).not.toContain(expect.stringContaining("ignored"));
  });

  it("numbers restart in each List without colliding", () => {
    // Entry 1 is defence in List I, public order in List II and criminal law
    // in List III — which is why the storage key carries the List.
    const xhtml = doc(
      lines([
        { text: "SEVENTH SCHEDULE", x: 133 },
        { text: "List I—Union List", x: 145 },
        { text: "1. Defence of India.", x: 54 },
        { text: "List II—State List", x: 145 },
        { text: "1. Public order.", x: 54 },
      ]),
      lines([{ text: "EIGHTH SCHEDULE", x: 136 }]),
    );
    const { lists } = parseListSchedule(xhtml, OPTIONS);
    expect(lists.map((l) => l.entries[0]?.text)).toEqual(["Defence of India.", "Public order."]);
  });

  it("keeps an amendment bracket and an omitted entry's asterisks, set either way", () => {
    // An omitted entry is a fact about the List: dropping it leaves a gap in
    // the numbering with nothing to explain it. The same schedule sets them
    // two ways — "[92. * * * * * *]" with a full stop and "[33* * * * *]"
    // without — and requiring the stop dropped six of them.
    const xhtml = doc(
      lines([
        { text: "SEVENTH SCHEDULE", x: 133 },
        { text: "List I—Union List", x: 145 },
        { text: "[2A. Deployment of any armed force of the Union.]", x: 57 },
        { text: "[33* * * * *]", x: 57 },
        { text: "[92. * * * * * *]", x: 57 },
      ]),
      lines([{ text: "EIGHTH SCHEDULE", x: 136 }]),
    );
    const { lists } = parseListSchedule(xhtml, OPTIONS);
    expect(lists[0]?.entries.map((e) => e.number)).toEqual(["2A", "33", "92"]);
    expect(lists[0]?.entries[0]?.text).toBe("Deployment of any armed force of the Union.]");
    expect(lists[0]?.entries[1]?.text).toBe("* * * * *]");
    expect(lists[0]?.entries[2]?.text).toBe("* * * * * *]");
  });

  it("excludes footnotes below the body and the watermark above it", () => {
    // Four tiers that do not overlap: 8.10pt body, 7.24pt footnotes, 5.40pt
    // superscripts, and the repository's "In di aC od e" stamp at 11.79pt up.
    const xhtml = doc(
      lines([
        { text: "SEVENTH SCHEDULE", x: 133 },
        { text: "List I—Union List", x: 145 },
        { text: "1. Defence of India.", x: 54 },
        { h: 25.92, text: "od", x: 223 },
        { h: 7.24, text: "1. Ins. by the Constitution (Forty-second Amendment) Act, 1976, s. 57." },
        { h: 5.4, text: "1", x: 54 },
      ]),
      lines([{ text: "EIGHTH SCHEDULE", x: 136 }]),
    );
    const { lists } = parseListSchedule(xhtml, OPTIONS);
    expect(lists[0]?.entries).toHaveLength(1);
    expect(lists[0]?.entries[0]?.text).toBe("Defence of India.");
  });

  it("does not read the arrangement of schedules as the schedule", () => {
    // The heading is printed in the contents pages too; the LAST page carrying
    // it is the schedule itself.
    const xhtml = doc(
      lines([{ text: "SEVENTH SCHEDULE", x: 133 }, { text: "310" }]),
      lines([
        { text: "SEVENTH SCHEDULE", x: 133 },
        { text: "List I—Union List", x: 145 },
        { text: "1. Defence of India.", x: 54 },
      ]),
      lines([{ text: "EIGHTH SCHEDULE", x: 136 }]),
    );
    const { lists } = parseListSchedule(xhtml, OPTIONS);
    expect(lists).toHaveLength(1);
    expect(lists[0]?.entries.map((e) => e.number)).toEqual(["1"]);
  });

  it("refuses to take a wrapped numeral for an entry opening", () => {
    // "…of entry\n2A of List I" wraps onto a line starting with a number that
    // has already been passed. Entries ascend; this one does not.
    const xhtml = doc(
      lines([
        { text: "SEVENTH SCHEDULE", x: 133 },
        { text: "List I—Union List", x: 145 },
        { text: "5. Police subject to the provisions of entry", x: 54 },
        { text: "2. of List I and nothing further." },
      ]),
      lines([{ text: "EIGHTH SCHEDULE", x: 136 }]),
    );
    const { lists, diagnostics } = parseListSchedule(xhtml, OPTIONS);
    expect(lists[0]?.entries).toHaveLength(1);
    expect(lists[0]?.entries[0]?.text).toBe(
      "Police subject to the provisions of entry 2. of List I and nothing further.",
    );
    expect(diagnostics.some((d) => d.includes('ignored non-ascending "2."'))).toBe(true);
  });
});
