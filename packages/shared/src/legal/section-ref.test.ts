import { describe, expect, it } from "vitest";

import { ACT_ABBREVIATIONS, ACT_SLUG, parseSectionRef } from "./section-ref";

describe("ACT_SLUG", () => {
  it("has a slug for every abbreviation", () => {
    for (const abbr of ACT_ABBREVIATIONS) {
      expect(ACT_SLUG[abbr]).toBeTruthy();
    }
  });

  it("maps COI to 'constitution', NOT 'coi' (the slug≠abbreviation case)", () => {
    // Regression: parseSectionRef returns "COI"; the section route is
    // /acts/constitution/… — a lowercased abbreviation would 404.
    expect(ACT_SLUG.COI).toBe("constitution");
  });
});

describe("parseSectionRef", () => {
  it("parses '302 IPC' (number-first)", () => {
    expect(parseSectionRef("302 IPC")).toEqual({ act: "IPC", section: "302", isArticle: false });
  });

  it("parses 'ipc 302' (act-first, lowercase)", () => {
    expect(parseSectionRef("ipc 302")).toEqual({ act: "IPC", section: "302", isArticle: false });
  });

  it("parses 'S. 420 IPC' (section word + punctuation)", () => {
    expect(parseSectionRef("S. 420 IPC")).toEqual({ act: "IPC", section: "420", isArticle: false });
  });

  it("parses 'sec 154 of crpc' (noise words)", () => {
    expect(parseSectionRef("sec 154 of crpc")).toEqual({
      act: "CRPC",
      section: "154",
      isArticle: false,
    });
  });

  it("parses 'BNS 103'", () => {
    expect(parseSectionRef("BNS 103")).toEqual({ act: "BNS", section: "103", isArticle: false });
  });

  it("parses full act names: 'section 300 indian penal code'", () => {
    expect(parseSectionRef("section 300 indian penal code")).toEqual({
      act: "IPC",
      section: "300",
      isArticle: false,
    });
  });

  it("parses letter-suffixed sections: '498A IPC' and '498-A ipc' and '498 a ipc'", () => {
    const expected = { act: "IPC", section: "498A", isArticle: false };
    expect(parseSectionRef("498A IPC")).toEqual(expected);
    expect(parseSectionRef("498-A ipc")).toEqual(expected);
    expect(parseSectionRef("498 a ipc")).toEqual(expected);
  });

  it("strips sub-clauses: 'bns 103(1)'", () => {
    expect(parseSectionRef("bns 103(1)")).toEqual({
      act: "BNS",
      section: "103",
      isArticle: false,
    });
  });

  it("defaults 'article 21' to the Constitution", () => {
    expect(parseSectionRef("article 21")).toEqual({ act: "COI", section: "21", isArticle: true });
  });

  it("parses 'art 14 coi'", () => {
    expect(parseSectionRef("art 14 coi")).toEqual({ act: "COI", section: "14", isArticle: true });
  });

  it("returns act:null for a bare number (search across acts)", () => {
    expect(parseSectionRef("302")).toEqual({ act: null, section: "302", isArticle: false });
  });

  it("parses 'evidence act 65b' letter suffix uppercased", () => {
    expect(parseSectionRef("evidence act 65b")).toEqual({
      act: "IEA",
      section: "65B",
      isArticle: false,
    });
  });

  it("parses 'u/s 302 ipc' FIR-style phrasing", () => {
    expect(parseSectionRef("u/s 302 ipc")).toEqual({
      act: "IPC",
      section: "302",
      isArticle: false,
    });
  });

  it("rejects prose queries", () => {
    expect(parseSectionRef("what is culpable homicide")).toBeNull();
    expect(parseSectionRef("murder punishment")).toBeNull();
    expect(parseSectionRef("")).toBeNull();
  });

  it("rejects refs naming an unknown act (falls back to FTS)", () => {
    expect(parseSectionRef("302 xyz act")).toBeNull();
  });

  it("rejects overlong inputs", () => {
    expect(parseSectionRef(`302 ipc ${"x".repeat(100)}`)).toBeNull();
  });
});

describe("act names containing noise words", () => {
  it("resolves aliases written with 'of' — the natural way to type them", () => {
    // Queries drop "of"/"the" before the act name is assembled, so an alias key
    // containing them could never match. These three were dead on arrival.
    expect(parseSectionRef("constitution of india 21")).toMatchObject({ act: "COI", section: "21" });
    expect(parseSectionRef("code of criminal procedure 438")).toMatchObject({
      act: "CRPC",
      section: "438",
    });
    expect(parseSectionRef("code of civil procedure 151")).toMatchObject({
      act: "CPC",
      section: "151",
    });
  });

  it("resolves the acts added alongside the fix", () => {
    expect(parseSectionRef("transfer of property 54")).toMatchObject({ act: "TP", section: "54" });
    expect(parseSectionRef("tp 53A")).toMatchObject({ act: "TP", section: "53A" });
    expect(parseSectionRef("sale of goods 19")).toMatchObject({ act: "SGA", section: "19" });
    expect(parseSectionRef("specific relief act 38")).toMatchObject({ act: "SRA", section: "38" });
    expect(parseSectionRef("s. 10 sra")).toMatchObject({ act: "SRA", section: "10" });
  });

  it("still refuses an act it does not know", () => {
    expect(parseSectionRef("companies act 149")).toBeNull();
  });
});

