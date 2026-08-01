import { describe, expect, it } from "vitest";

import {
  allowsCopyingExclusion,
  computeLimitation,
  copyingDays,
  parseLimitationPeriod,
} from "./limitation";

describe("parseLimitationPeriod", () => {
  it("reads every period form the Schedule actually prints", () => {
    // These ten strings are the complete set in the published Schedule.
    expect(parseLimitationPeriod("Three years.")).toMatchObject({ years: 3 });
    expect(parseLimitationPeriod("Twelve years.")).toMatchObject({ years: 12 });
    expect(parseLimitationPeriod("One year.")).toMatchObject({ years: 1 });
    expect(parseLimitationPeriod("Two years.")).toMatchObject({ years: 2 });
    expect(parseLimitationPeriod("Thirty years.")).toMatchObject({ years: 30 });
    expect(parseLimitationPeriod("Thirty days.")).toMatchObject({ days: 30 });
    expect(parseLimitationPeriod("Sixty days.")).toMatchObject({ days: 60 });
    expect(parseLimitationPeriod("Ninety days.")).toMatchObject({ days: 90 });
    expect(parseLimitationPeriod("Ten days.")).toMatchObject({ days: 10 });
    // Article 117 as amended keeps its brackets in the source text.
    expect(parseLimitationPeriod("[Sixty days].")).toMatchObject({ days: 60 });
  });

  it("keeps the Schedule's own wording for display", () => {
    expect(parseLimitationPeriod("Three years.")?.source).toBe("Three years.");
  });

  it("refuses anything it does not recognise rather than guessing", () => {
    // A limb with no period of its own prints blank — inventing one here would
    // put a date on a row the legislature left empty.
    expect(parseLimitationPeriod("")).toBeNull();
    expect(parseLimitationPeriod("—")).toBeNull();
    expect(parseLimitationPeriod("Such period as the court allows.")).toBeNull();
    expect(parseLimitationPeriod("Seventeen fortnights.")).toBeNull();
  });
});

describe("computeLimitation", () => {
  it("excludes the day the period runs from (s.12(1))", () => {
    // Right accrues 1 Jan 2023; three years expires 1 Jan 2026, not 31 Dec 2025.
    expect(computeLimitation("2023-01-01", { years: 3, source: "Three years." })).toMatchObject({
      expiresOn: "2026-01-01",
    });
    // 30 days from 1 January runs to 31 January.
    expect(computeLimitation("2026-01-01", { days: 30, source: "Thirty days." })).toMatchObject({
      expiresOn: "2026-01-31",
    });
  });

  it("crosses month and year boundaries by calendar, not by 365 days", () => {
    expect(computeLimitation("2024-11-15", { days: 90, source: "Ninety days." })).toMatchObject({
      expiresOn: "2025-02-13",
    });
    expect(computeLimitation("2020-06-30", { years: 12, source: "Twelve years." })).toMatchObject({
      expiresOn: "2032-06-30",
    });
  });

  it("pulls back to the last day when the target month is shorter, and says so", () => {
    // 29 Feb 2024 + 3 years: 2027 has no 29 February.
    expect(computeLimitation("2024-02-29", { years: 3, source: "Three years." })).toMatchObject({
      expiresOn: "2027-02-28",
      clamped: true,
    });
    expect(computeLimitation("2026-01-31", { months: 6, source: "Six months." })).toMatchObject({
      expiresOn: "2026-07-31",
      clamped: false,
    });
  });

  it("counts a leap day when one falls inside the period", () => {
    expect(computeLimitation("2024-01-01", { days: 60, source: "Sixty days." })).toMatchObject({
      expiresOn: "2024-03-01",
    });
  });

  it("reports the weekday, which is what raises the s.4 question", () => {
    expect(computeLimitation("2023-01-01", { years: 3, source: "Three years." })?.weekday).toBe(
      "Thursday",
    );
  });

  it("rejects a date that does not exist instead of rolling it forward", () => {
    // Date would silently turn 31 April into 1 May.
    expect(computeLimitation("2026-04-31", { years: 3, source: "Three years." })).toBeNull();
    expect(computeLimitation("20-08-2026", { years: 3, source: "Three years." })).toBeNull();
    expect(computeLimitation("", { years: 3, source: "Three years." })).toBeNull();
  });

  it("is not shifted by the machine's timezone", () => {
    // A local-time parse plus toISOString() moved hearing reminders two days in
    // IST (D-030). The same slip on a limitation date is unacceptable.
    const result = computeLimitation("2026-01-01", { years: 3, source: "Three years." });
    expect(result?.expiresOn).toBe("2029-01-01");
  });
});

describe("copyingDays (s.12(2)-(4))", () => {
  it("counts application to copy-ready", () => {
    // The certificate on the copy states both dates; this is the interval
    // between them, which is what the court is asked to accept as requisite.
    expect(copyingDays({ appliedOn: "2026-02-03", readyOn: "2026-02-11" })).toBe(8);
    expect(copyingDays({ appliedOn: "2026-02-03", readyOn: "2026-02-03" })).toBe(0);
  });

  it("spans months and leap days by calendar", () => {
    expect(copyingDays({ appliedOn: "2024-02-26", readyOn: "2024-03-02" })).toBe(5);
  });

  it("refuses a reversed or unreadable pair rather than returning a negative", () => {
    expect(copyingDays({ appliedOn: "2026-02-11", readyOn: "2026-02-03" })).toBeNull();
    expect(copyingDays({ appliedOn: "", readyOn: "2026-02-03" })).toBeNull();
    expect(copyingDays({ appliedOn: "2026-02-03", readyOn: "not a date" })).toBeNull();
  });
});

describe("computeLimitation with a s.12(2) exclusion", () => {
  it("extends the period by the excluded days", () => {
    // Ninety days from a decree of 15 Jan 2026 ends 15 Apr 2026; excluding 8
    // days spent obtaining the copy moves it to 23 Apr.
    const plain = computeLimitation("2026-01-15", { days: 90, source: "Ninety days." });
    expect(plain?.expiresOn).toBe("2026-04-15");
    const excluded = computeLimitation("2026-01-15", { days: 90, source: "Ninety days." }, 8);
    expect(excluded?.expiresOn).toBe("2026-04-23");
  });

  it("does not shift the date when nothing is excluded", () => {
    expect(computeLimitation("2026-01-15", { days: 30, source: "Thirty days." }, 0)?.expiresOn).toBe(
      computeLimitation("2026-01-15", { days: 30, source: "Thirty days." })?.expiresOn,
    );
  });

  it("applies the exclusion after month-end clamping, not before", () => {
    // 29 Feb 2024 + 3 years clamps to 28 Feb 2027; +2 days is 2 March.
    // Adding first would give 2 Mar 2024 → 2 Mar 2027 and hide the clamp.
    const r = computeLimitation("2024-02-29", { years: 3, source: "Three years." }, 2);
    expect(r?.expiresOn).toBe("2027-03-02");
    expect(r?.clamped).toBe(true);
  });
});

describe("allowsCopyingExclusion", () => {
  it("is available for appeals, revision, review and setting aside an award", () => {
    expect(allowsCopyingExclusion("Under the Code of Civil Procedure…", "Second Division — Appeals")).toBe(true);
    expect(allowsCopyingExclusion("For a review of judgment by a court.", "Third Division — Applications")).toBe(true);
    expect(allowsCopyingExclusion("For the exercise of powers of revision.", null)).toBe(true);
    expect(allowsCopyingExclusion("To set aside an award.", null)).toBe(true);
  });

  it("is NOT available for a plain suit", () => {
    // s.12(2) names appeals and applications only. Offering it on a suit would
    // invite an advocate to add copying time they are not entitled to and
    // overstate their own limitation.
    expect(allowsCopyingExclusion("For the balance due on a mutual account.", "First Division — Suits")).toBe(false);
    expect(
      allowsCopyingExclusion("For possession of immovable property based on title.", "First Division — Suits"),
    ).toBe(false);
  });
});
