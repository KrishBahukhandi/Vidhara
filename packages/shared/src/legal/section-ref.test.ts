import { describe, expect, it } from "vitest";

import { parseSectionRef } from "./section-ref";

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
