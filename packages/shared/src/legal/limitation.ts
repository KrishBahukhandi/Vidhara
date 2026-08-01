/**
 * Limitation arithmetic for the Schedule to the Limitation Act, 1963.
 *
 * This computes ONE thing: the last day of the prescribed period, given a start
 * date and an Article's period. It is deliberately small, because the honest
 * value of a limitation tool is not the arithmetic — that part is trivial — but
 * naming the Article and surfacing the sections that move the date. A tool that
 * returns a bare date invites reliance it cannot support; a wrong limitation
 * date is a professional negligence claim, not a bug report.
 *
 * Two rules are encoded here, both from the Act itself:
 *
 * - **s.12(1)** — "the day from which such period is to be reckoned shall be
 *   excluded". Excluding the first day and then counting the period is the same
 *   arithmetic as adding the period to the start date, which is what makes
 *   3 years from 1 Jan 2023 expire on 1 Jan 2026 rather than 31 Dec 2025.
 * - **month-end clamping** — 3 years from 29 Feb 2024 is 28 Feb 2027, because
 *   the target year has no 29 February. Reported via `clamped` so the caller
 *   can say so rather than let it pass silently.
 *
 * Everything else the Act does to a limitation period — ss. 4, 5, 6-8, 14, 15,
 * 17, 18, 19 — depends on facts this function cannot see, and is surfaced to
 * the reader as a checklist instead of being guessed at.
 *
 * Dates are handled in UTC throughout. Parsing "2026-08-20" as local time and
 * formatting it back has already produced an off-by-two-day bug in this
 * codebase (D-030, hearing reminders shifted by IST); a limitation date is a
 * much worse place to repeat it.
 */

export interface LimitationPeriod {
  years?: number;
  months?: number;
  days?: number;
  /** The period exactly as the Schedule prints it. */
  source: string;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirty: 30,
  sixty: 60,
  ninety: 90,
};

/**
 * "Three years." → { years: 3 }. Returns null for anything not recognised —
 * including a blank period, which the Schedule prints for a limb that has none
 * of its own. Refusing is the point: the caller shows the Article's text and
 * declines to compute, rather than inventing a period.
 *
 * Amendment brackets are stripped ("[Sixty days]." is Article 117 as amended).
 */
export function parseLimitationPeriod(text: string): LimitationPeriod | null {
  const cleaned = text.replace(/[[\]]/g, "").trim();
  const match = /^([A-Za-z]+)\s+(year|month|day)s?\s*\.?$/i.exec(cleaned);
  if (!match) return null;

  const count = NUMBER_WORDS[match[1]!.toLowerCase()];
  if (!count) return null;

  const unit = match[2]!.toLowerCase();
  const base = { source: text.trim() };
  if (unit === "year") return { ...base, years: count };
  if (unit === "month") return { ...base, months: count };
  return { ...base, days: count };
}

export interface LimitationResult {
  /** Last day of the prescribed period, ISO (YYYY-MM-DD). */
  expiresOn: string;
  /** True when the target month was too short and the day was pulled back
   * (29 Feb + 3 years → 28 Feb), so the caller can say so. */
  clamped: boolean;
  /** Day of week of the expiry, for the s.4 "court closed" prompt. */
  weekday: string;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Parses YYYY-MM-DD as UTC midnight. Never use Date.parse on a bare date. */
function parseISO(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  // Rejects 31 April and friends, which Date would roll into the next month.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date;
}

const toISO = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * The last day on which the proceeding may be filed, per s.12(1).
 *
 * @param startOn ISO date of the event the Article's third column names.
 */
export function computeLimitation(
  startOn: string,
  period: LimitationPeriod,
  /** Days excluded under s.12(2)-(4) — see `copyingDays`. */
  excludedDays = 0,
): LimitationResult | null {
  const start = parseISO(startOn);
  if (!start) return null;

  let clamped = false;
  let result: Date;

  if (period.days) {
    result = new Date(start.getTime());
    result.setUTCDate(result.getUTCDate() + period.days);
  } else {
    const months = (period.years ?? 0) * 12 + (period.months ?? 0);
    if (months === 0) return null;
    const day = start.getUTCDate();
    result = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, day));
    // Overflow means the target month is shorter (31 Jan + 1 month, 29 Feb +
    // 1 year): step back to that month's last day.
    if (result.getUTCDate() !== day) {
      result = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth(), 0));
      clamped = true;
    }
  }

  // s.12(2)-(4) exclusions extend the period by the days they remove from it.
  if (excludedDays > 0) result.setUTCDate(result.getUTCDate() + excludedDays);

  return { expiresOn: toISO(result), clamped, weekday: WEEKDAYS[result.getUTCDay()]! };
}

/**
 * The sections that move a limitation date. Shown alongside every computation,
 * because the number this module produces is only correct if none of these
 * apply — and whether they apply is a question of fact the tool cannot answer.
 */
export interface LimitationFactor {
  section: string;
  title: string;
  effect: string;
}

export const LIMITATION_FACTORS: LimitationFactor[] = [
  {
    section: "4",
    title: "Court closed on the last day",
    effect: "If the period expires on a day the court is closed, the proceeding may be filed the day it reopens.",
  },
  {
    section: "5",
    title: "Condonation of delay",
    effect:
      "An appeal or application (not a suit) may be admitted late on sufficient cause shown. Never assume it will be.",
  },
  {
    section: "6",
    title: "Legal disability",
    effect: "Minority, insanity or idiocy at the time the right accrued extends the period — read with ss. 7 and 8.",
  },
  {
    section: "12",
    title: "Exclusions in computing",
    effect:
      "The day the period runs from is excluded (applied here). For appeals and reviews, time taken to obtain copies of the decree and judgment is also excluded.",
  },
  {
    section: "14",
    title: "Proceeding in the wrong forum",
    effect: "Time spent prosecuting the same matter in good faith in a court without jurisdiction is excluded.",
  },
  {
    section: "15",
    title: "Stay or injunction",
    effect: "Time during which the proceeding was stayed, or notice was required, is excluded.",
  },
  {
    section: "17",
    title: "Fraud or mistake",
    effect: "Where the right is concealed by fraud, or relief is sought from a mistake, time runs from discovery.",
  },
  {
    section: "18",
    title: "Acknowledgment in writing",
    effect:
      "A signed written acknowledgment made BEFORE the period expires restarts it from the date of the acknowledgment.",
  },
  {
    section: "19",
    title: "Part payment",
    effect: "Part payment of a debt or interest before expiry restarts the period from the date of payment.",
  },
];

/**
 * s.12(2)-(4): the time requisite for obtaining a copy.
 *
 * For an appeal, an application for leave to appeal, revision or review, s.12(2)
 * excludes the day the judgment was pronounced AND "the time requisite for
 * obtaining a copy of the decree, sentence or order"; s.12(3) also excludes the
 * time for a copy of the judgment; s.12(4) does the same for the award on an
 * application to set one aside.
 *
 * The pronouncement day is already excluded by `computeLimitation` (it is the
 * start date, and s.12(1) excludes it), so what is added here is only the
 * copying time.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO: decide what "requisite" means. That is a
 * question courts answer on the copy certificate, and the Explanation to s.12
 * is emphatic that time the court took to prepare the decree BEFORE a copy was
 * applied for does **not** count — which is why the input is the application
 * date, never the date of the decree. Whether the endpoints are themselves
 * counted varies in practice, so the caller shows both dates and the interval
 * rather than presenting a number as settled.
 */
export interface CopyingTime {
  /** Date the copy was applied for — NOT the date of the decree (see the
   * Explanation to s.12). */
  appliedOn: string;
  /** Date the copy was ready for delivery, as certified. */
  readyOn: string;
}

/** Days between application and the copy being ready. null if either date is
 * unusable or the order is reversed, which is a data-entry error, not a period. */
export function copyingDays(time: CopyingTime): number | null {
  const applied = Date.parse(`${time.appliedOn}T00:00:00Z`);
  const ready = Date.parse(`${time.readyOn}T00:00:00Z`);
  if (Number.isNaN(applied) || Number.isNaN(ready)) return null;
  const days = Math.round((ready - applied) / 86_400_000);
  return days < 0 ? null : days;
}

/**
 * Whether s.12(2)-(4) can apply at all to a given Article. It is available for
 * appeals, leave to appeal, revision, review and setting aside an award — and
 * NOT for suits, which is most of the Schedule. Offering it everywhere would
 * invite an advocate to add copying time to a plain suit, which would overstate
 * their limitation.
 *
 * Decided from the Article's own printed words rather than a list of numbers,
 * so it stays correct if the Schedule is re-ingested.
 */
export function allowsCopyingExclusion(description: string, division: string | null): boolean {
  if ((division ?? "").toLowerCase().includes("appeal")) return true;
  return /\b(appeal|revision|revise|review|set aside an award)\b/i.test(description);
}
