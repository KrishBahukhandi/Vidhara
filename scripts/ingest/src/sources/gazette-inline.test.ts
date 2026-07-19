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
