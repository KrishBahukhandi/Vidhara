import { describe, expect, it } from "vitest";

import {
  byHearing,
  hydrateCase,
  parseDiaryExport,
  remindDateFor,
  type DiaryCase,
} from "./case-diary";

const aCase = (over: Partial<DiaryCase> = {}): DiaryCase => ({
  id: "1",
  title: "Sharma v. State",
  court: "",
  caseNumber: "",
  nextHearing: "",
  stage: "",
  notes: "",
  sections: [],
  hearings: [],
  todos: [],
  status: "active",
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe("remindDateFor", () => {
  it("is the day before, unshifted by the machine's timezone", () => {
    // `T00:00:00` without a zone is LOCAL; round-tripping through
    // toISOString() then moves it, which in IST put reminders two days early.
    expect(remindDateFor("2026-08-20")).toBe("2026-08-19");
    expect(remindDateFor("2026-01-01")).toBe("2025-12-31");
    expect(remindDateFor("2026-03-01")).toBe("2026-02-28");
    expect(remindDateFor("2024-03-01")).toBe("2024-02-29");
  });
});

describe("byHearing", () => {
  it("puts the soonest hearing first and keeps overdue at the top", () => {
    const list = [
      aCase({ id: "later", nextHearing: "2026-09-01" }),
      aCase({ id: "overdue", nextHearing: "2026-01-01" }),
      aCase({ id: "soon", nextHearing: "2026-08-10" }),
    ].sort(byHearing);
    // Overdue first: a date that has passed is the most urgent thing on a
    // cause list, not the least.
    expect(list.map((c) => c.id)).toEqual(["overdue", "soon", "later"]);
  });

  it("sinks undated matters below every dated one", () => {
    const list = [
      aCase({ id: "undated", nextHearing: "", updatedAt: 100 }),
      aCase({ id: "dated", nextHearing: "2026-09-01" }),
    ].sort(byHearing);
    expect(list.map((c) => c.id)).toEqual(["dated", "undated"]);
  });

  it("orders undated matters by most recently touched", () => {
    const list = [
      aCase({ id: "old", nextHearing: "", updatedAt: 1 }),
      aCase({ id: "fresh", nextHearing: "", updatedAt: 999 }),
    ].sort(byHearing);
    expect(list.map((c) => c.id)).toEqual(["fresh", "old"]);
  });
});

describe("hydrateCase", () => {
  it("fills in collections added after a record was written", () => {
    const old = { id: "1", title: "X", updatedAt: 0 } as unknown as DiaryCase;
    const c = hydrateCase(old);
    expect(c.sections).toEqual([]);
    expect(c.hearings).toEqual([]);
    expect(c.todos).toEqual([]);
    expect(c.status).toBe("active");
  });

  it("leaves `limitation` absent rather than defaulting it", () => {
    // Absent means "never worked out"; an empty object would claim otherwise.
    expect(hydrateCase(aCase()).limitation).toBeUndefined();
  });

  it("does not clobber values that are already set", () => {
    const c = hydrateCase(aCase({ status: "disposed", todos: [{ id: "t", text: "file", done: true }] }));
    expect(c.status).toBe("disposed");
    expect(c.todos).toHaveLength(1);
  });
});

describe("parseDiaryExport", () => {
  it("reads a bare array of matters", () => {
    const result = parseDiaryExport(JSON.stringify([aCase()]));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.cases[0]?.title).toBe("Sharma v. State");
  });

  it("reads a wrapped { cases: [...] } export too", () => {
    // Both platforms must accept whichever shape the other writes, since this
    // file is the only route between devices while the diary is local-only.
    const result = parseDiaryExport(JSON.stringify({ cases: [aCase()] }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.cases).toHaveLength(1);
  });

  it("hydrates imported records, so an old export restores usable", () => {
    const result = parseDiaryExport(JSON.stringify([{ id: "1", title: "X", updatedAt: 0 }]));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.cases[0]?.hearings).toEqual([]);
  });

  it("refuses anything that is not a diary, with a reason", () => {
    expect(parseDiaryExport("not json")).toMatchObject({ ok: false });
    expect(parseDiaryExport(JSON.stringify({ foo: 1 }))).toMatchObject({ ok: false });
    // An array of things without titles is not a diary — importing it would
    // silently create blank matters.
    expect(parseDiaryExport(JSON.stringify([{ nope: true }]))).toMatchObject({ ok: false });
    expect(parseDiaryExport("[]")).toMatchObject({ ok: false });
  });
});
