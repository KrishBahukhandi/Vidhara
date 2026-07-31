import { describe, expect, it } from "vitest";

import { computeLimitation, parseLimitationPeriod } from "./limitation";

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
