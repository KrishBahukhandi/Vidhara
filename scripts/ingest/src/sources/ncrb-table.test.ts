import { describe, expect, it } from "vitest";

import { parseNcrbTable } from "./ncrb-table";

const row = (l: string, r: string) => `<tr><td>${l}</td><td>${r}</td></tr>`;

// Mirrors the structure of the real NCRB Sankalan tables: a new→old table,
// then a reverse old→new index; data cells may themselves contain "-->".
const FIXTURE = `<table>
${row("Bharatiya Nyaya Sanhita, 2023 --&gt;".replaceAll("&gt;", ">"), "Indian Penal Code, 1860 -->")}
${row("CHAPTER I &ndash; PRELIMINARY", "CHAPTER I &ndash; INTRODUCTION")}
${row("1. Short title. 1(1)", "1. Title and extent.")}
${row("1(2)", "New Sub-Section")}
${row("1(3)", "2. Punishment of offences committed within India.")}
${row("5. Commutation of sentence. 5(a) -->", "54. Commutation of death. 55. Commutation of life.")}
${row("103. Punishment for murder. (Change)", "302. Punishment for murder.")}
${row("304. Snatching.", "New Section")}
${row("Deleted", "497. Adultery")}
${row("Indian Penal Code, 1860 -->", "Bharatiya Nyaya Sanhita, 2023 -->")}
${row("302. Punishment for murder.", "103. Punishment for murder. (Change)")}
${row("377. Unnatural offences.", "Deleted")}
</table>`;

describe("parseNcrbTable", () => {
  const { entries } = parseNcrbTable(FIXTURE, "IPC", "BNS");
  const find = (o: string | null, n: string | null) =>
    entries.find((e) => e.oldSection === o && e.newSection === n);

  it("pairs plain rows and honours (Change)", () => {
    expect(find("302", "103")?.type).toBe("modified");
  });

  it("does not invert pairs from the reverse table (dedupes them)", () => {
    expect(find("103", "302")).toBeUndefined();
    expect(entries.filter((e) => e.oldSection === "302")).toHaveLength(1);
  });

  it("aggregates sub-section rows to the parent section (merged)", () => {
    expect(find("1", "1")?.type).toBe("merged");
    expect(find("2", "1")?.type).toBe("merged");
  });

  it("does not treat an in-cell arrow as a header, and reads multi-old cells", () => {
    expect(find("54", "5")?.type).toBe("merged");
    expect(find("55", "5")?.type).toBe("merged");
  });

  it("records omitted old sections from either table direction", () => {
    expect(find("497", null)?.type).toBe("omitted");
    expect(find("377", null)?.type).toBe("omitted");
  });

  it("records wholly-new sections but not sub-section-level novelty", () => {
    expect(find(null, "304")?.type).toBe("new");
    expect(find(null, "1")).toBeUndefined(); // 1(2) is a new SUB-section only
  });
});
