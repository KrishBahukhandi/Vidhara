import { describe, expect, it } from "vitest";

import { parseColumnTable } from "./column-table";

/**
 * Geometry mirrors the 2026 Constitution print — a 360×504 page, body type at
 * 8.10pt, footnotes at 7.24pt — because that is the print the annexure to
 * Appendix I is set in and every measurement in the parser is calibrated
 * against it. THE ROW CONTENT IS INVENTED: the enclave inventory itself is not
 * reproduced here, and nothing in this file should be read as its text.
 */
const word = (x: number, y: number, h: number, text: string) =>
  `<word xMin="${x}" yMin="${y}" xMax="${x + text.length * 4}" yMax="${y + h}">${text}</word>`;

/** Where each of the six columns begins. */
const COL = [36, 62, 150, 185, 250, 315];

const COLUMNS = [
  "Sl. No.",
  "Name of Chhits",
  "Chhit No.",
  "Lying within PS Bangladesh",
  "Lying within PS W. Bengal",
  "Area in acres",
];

/** One printed line of cells, at their columns. A null cell is one the print
 * leaves empty on that line — which is what every wrapped cell looks like. */
function row(cells: (string | null)[], y: number, h = 8.1): string {
  const out: string[] = [];
  cells.forEach((cell, index) => {
    if (!cell) return;
    let x = COL[index]!;
    for (const token of cell.split(" ")) {
      out.push(word(x, y, h, token));
      x += token.length * 4 + 4;
    }
  });
  return out.join("\n");
}

/** A line set across the table, as a heading or a footnote is. */
const across = (text: string, y: number, h = 8.1, x = 36) => row([null], y) + word(x, y, h, text);

function spread(text: string, y: number, h = 8.1, startX = 36): string {
  let x = startX;
  return text
    .split(" ")
    .map((token) => {
      const w = word(x, y, h, token);
      x += token.length * 4 + 4;
      return w;
    })
    .join("\n");
}

/** The header, wrapped over two lines exactly as a six-column table this
 * narrow must wrap it: the fourth and fifth headings do not fit their columns
 * and break in the same place, so they interleave in reading order. */
const HEADER = (y: number) =>
  [
    row(["Sl.", "Name of", "Chhit", "Lying within", "Lying within", "Area in"], y),
    row(["No.", "Chhits", "No.", "PS Bangladesh", "PS W. Bengal", "acres"], y + 11),
  ].join("\n");

const page = (content: string) => `<page width="360" height="504">\n${content}\n</page>`;
const doc = (...pages: string[]) =>
  `<?xml version="1.0"?>\n<html><body>\n${pages.map(page).join("\n")}\n</body></html>`;

describe("a schedule that is a table of any width", () => {
  it("reads six columns, and joins a cell that wraps", () => {
    const xhtml = doc(
      [
        HEADER(60),
        row(["1", "Baragachhi", "12", "Panchagarh", "Dinhata", "34.90"], 90),
        row(["2", "Nayapara", "13", "Debiganj", "Dinhata", "1160.30"], 102),
        // The second row's name runs to a second line; nothing else does.
        row([null, "Khasbari", null, null, null, null], 114),
      ].join("\n"),
    );

    const { columns, rows, diagnostics } = parseColumnTable(xhtml, { columns: COLUMNS });
    expect(columns).toEqual(COLUMNS);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.cells).toEqual(["1", "Baragachhi", "12", "Panchagarh", "Dinhata", "34.90"]);
    expect(rows[1]?.cells).toEqual([
      "2",
      "Nayapara Khasbari",
      "13",
      "Debiganj",
      "Dinhata",
      "1160.30",
    ]);
    expect(diagnostics.some((d) => d.startsWith("columns at x="))).toBe(true);
  });

  it("finds the headings even where two of them wrap together", () => {
    // Read in reading order the header block gives "Lying within", "Lying
    // within", "PS Bangladesh", "PS W. Bengal" — no heading appears whole, so
    // the columns are anchored on each heading's FIRST word instead.
    const xhtml = doc([HEADER(60), row(["1", "Baragachhi", "12", "Panchagarh", "Dinhata", "34.90"], 90)].join("\n"));
    const { rows } = parseColumnTable(xhtml, { columns: COLUMNS });
    expect(rows[0]?.cells[3]).toBe("Panchagarh");
    expect(rows[0]?.cells[4]).toBe("Dinhata");
  });

  it("takes the whole header, including the half of it that wrapped", () => {
    // Every heading's FIRST word fits on one line, so that is where the columns
    // are anchored — but the rest of the headings are on the next line, and
    // unconsumed they arrive as the table's first row of cells.
    const xhtml = doc([HEADER(60), row(["1", "Baragachhi", "12", "Panchagarh", "Dinhata", "34.90"], 90)].join("\n"));
    const { rows, diagnostics } = parseColumnTable(xhtml, { columns: COLUMNS });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.cells[1]).toBe("Baragachhi");
    expect(diagnostics.some((d) => d.startsWith("before the first row"))).toBe(false);
  });

  it("is not entered on a page that merely names the table", () => {
    // The contents-page trap, which every parser in this directory has met on
    // a different print: the words are there, the table is not.
    const xhtml = doc(spread("THE FIRST SCHEDULE 384", 60), spread("Name of Chhits", 90));
    const { rows, diagnostics } = parseColumnTable(xhtml, { columns: COLUMNS });
    expect(rows).toEqual([]);
    expect(diagnostics[0]).toContain("no page carries the headings");
  });

  it("re-measures a page that reprints the headings and inherits on one that does not", () => {
    const xhtml = doc(
      [HEADER(60), row(["1", "Baragachhi", "12", "Panchagarh", "Dinhata", "34.90"], 90)].join("\n"),
      // A continuation page: rows straight from the top, no header row.
      [
        row(["2", "Nayapara", "13", "Debiganj", "Dinhata", "1160.30"], 60),
        row(["3", "Sonatala", "14", "Debiganj", "Dinhata", "8.20"], 72),
      ].join("\n"),
    );
    const { rows, diagnostics } = parseColumnTable(xhtml, { columns: COLUMNS });
    expect(rows.map((r) => r.number)).toEqual(["1", "2", "3"]);
    expect(rows[2]?.cells[5]).toBe("8.20");
    expect(diagnostics.some((d) => d.includes("inheriting the previous page's columns"))).toBe(true);
  });

  it("restarts the numbering under a group heading, and records the group", () => {
    const xhtml = doc(
      [
        HEADER(60),
        across("ENCLAVES IN BANGLADESH TRANSFERRED TO INDIA", 84),
        row(["1", "Baragachhi", "12", "Panchagarh", "Dinhata", "34.90"], 96),
        across("ENCLAVES IN INDIA TRANSFERRED TO BANGLADESH", 120),
        row(["1", "Sonatala", "14", "Debiganj", "Dinhata", "8.20"], 132),
      ].join("\n"),
    );
    const { rows, diagnostics } = parseColumnTable(xhtml, {
      columns: COLUMNS,
      groupHeading: /^ENCLAVES IN/,
    });
    expect(rows.map((r) => `${r.division}|${r.number}`)).toEqual([
      "ENCLAVES IN BANGLADESH TRANSFERRED TO INDIA|1",
      "ENCLAVES IN INDIA TRANSFERRED TO BANGLADESH|1",
    ]);
    // Row 1 of the second group is not a row that went backwards.
    expect(diagnostics.some((d) => d.includes("non-ascending"))).toBe(false);
  });

  it("does not open a row on a wrapped cell that begins with a numeral", () => {
    const xhtml = doc(
      [
        HEADER(60),
        row(["5", "Baragachhi", "12", "Panchagarh", "Dinhata", "34.90"], 90),
        // A stray numeral in the first column, below a row numbered 5.
        row(["2", "Khasbari", null, null, null, null], 102),
      ].join("\n"),
    );
    const { rows, diagnostics } = parseColumnTable(xhtml, { columns: COLUMNS });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.cells[0]).toBe("5");
    expect(rows[0]?.cells[1]).toBe("Baragachhi Khasbari");
    expect(diagnostics.some((d) => d.includes('ignored non-ascending row "2"'))).toBe(true);
  });

  it("reports a gap in the numbering rather than closing it", () => {
    const xhtml = doc(
      [
        HEADER(60),
        row(["1", "Baragachhi", "12", "Panchagarh", "Dinhata", "34.90"], 90),
        row(["7", "Sonatala", "14", "Debiganj", "Dinhata", "8.20"], 102),
      ].join("\n"),
    );
    const { rows, diagnostics } = parseColumnTable(xhtml, { columns: COLUMNS });
    expect(rows.map((r) => r.number)).toEqual(["1", "7"]);
    expect(diagnostics.some((d) => d.includes("row 7 follows 1"))).toBe(true);
  });

  it("drops the folio and a footnote at the foot of the page", () => {
    const xhtml = doc(
      [
        HEADER(60),
        row(["1", "Baragachhi", "12", "Panchagarh", "Dinhata", "34.90"], 90),
        across("386", 102),
        // A footnote opens at 7.24pt and WRAPS at body height, which is why the
        // height window alone cannot hold it out.
        spread("1. Subs. by s. 3, ibid.", 400, 7.24),
        spread("(w.e.f. 31-7-2015).", 411),
      ].join("\n"),
    );
    const { rows } = parseColumnTable(xhtml, { columns: COLUMNS });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.cells.join(" ")).not.toContain("Subs.");
    expect(rows[0]?.cells.join(" ")).not.toContain("386");
  });

  it("ends where the rows do, on a page that is prose", () => {
    // The annexure carries boundary descriptions after its inventory. Read as
    // cells they arrive as columns of whatever row the table ended on.
    const xhtml = doc(
      [HEADER(60), row(["1", "Baragachhi", "12", "Panchagarh", "Dinhata", "34.90"], 90)].join("\n"),
      [
        spread("From boundary pillar No. 1 the line shall run", 60),
        spread("northwards along the mid-stream of the river.", 72),
      ].join("\n"),
    );
    const { rows, diagnostics } = parseColumnTable(xhtml, { columns: COLUMNS });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.cells.join(" ")).not.toContain("boundary pillar");
    expect(diagnostics.some((d) => d.includes("neither the headings nor a row"))).toBe(true);
  });

  it("stops at the line the caller names, part-way down a page", () => {
    const xhtml = doc(
      [
        HEADER(60),
        row(["1", "Baragachhi", "12", "Panchagarh", "Dinhata", "34.90"], 90),
        across("THE THIRD SCHEDULE", 114),
        row(["1", "Something", "9", "Else", "Entirely", "0.00"], 126),
      ].join("\n"),
    );
    const { rows } = parseColumnTable(xhtml, {
      columns: COLUMNS,
      endsAtLine: /^THE THIRD SCHEDULE$/,
    });
    expect(rows.map((r) => r.number)).toEqual(["1"]);
  });

  it("keeps an empty cell empty rather than shifting the row left", () => {
    const xhtml = doc(
      [
        HEADER(60),
        row(["1", "Baragachhi", null, "Panchagarh", "Dinhata", "34.90"], 90),
      ].join("\n"),
    );
    const { rows } = parseColumnTable(xhtml, { columns: COLUMNS });
    expect(rows[0]?.cells).toEqual(["1", "Baragachhi", "", "Panchagarh", "Dinhata", "34.90"]);
  });
});
