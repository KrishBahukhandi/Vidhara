"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  computeLimitation,
  LIMITATION_FACTORS,
  parseLimitationPeriod,
  type LimitationPeriod,
} from "@nexlex/shared";

import { track } from "@/lib/analytics";
import type { ScheduleArticle } from "@/features/acts/queries";

/**
 * A limitation worksheet, deliberately not a limitation calculator.
 *
 * The arithmetic is the easy part and the least valuable: what actually costs
 * advocates their cases is picking the wrong Article, or missing that s.14, 18
 * or 19 moved the date. So this shows its working at every step — which
 * Article, the Schedule's own words for the period and the event it runs from,
 * the s.12(1) rule being applied — and ends on the sections that can change the
 * answer, rather than on a number.
 *
 * It never says "your deadline is X". It says "Article N gives you this period
 * from this event, which lands here, and here is what would move it."
 */
export function LimitationWorksheet({ articles }: { articles: ScheduleArticle[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [limbIndex, setLimbIndex] = useState(0);
  const [startOn, setStartOn] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return articles
      .filter(
        (a) =>
          a.number === q ||
          a.rows.some((r) => `${r.description} ${r.commencement}`.toLowerCase().includes(q)),
      )
      .slice(0, 12);
  }, [articles, query]);

  const selected = articles.find((a) => a.id === selectedId) ?? null;
  // Limbs that carry a period of their own — a lead-in limb has none and is not
  // something you can compute from.
  const limbs = selected?.rows.filter((r) => parseLimitationPeriod(r.period)) ?? [];
  const limb = limbs[limbIndex] ?? limbs[0] ?? null;
  const period: LimitationPeriod | null = limb ? parseLimitationPeriod(limb.period) : null;
  const result = period && startOn ? computeLimitation(startOn, period) : null;

  const longDate = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

  const choose = (id: string) => {
    setSelectedId(id);
    setLimbIndex(0);
    setQuery("");
  };

  return (
    <div className="mt-6 space-y-6">
      <section>
        <h2 className="text-small font-semibold uppercase tracking-wide text-text-muted">
          1 · Find the Article
        </h2>
        <input
          type="search"
          inputMode="search"
          placeholder="What kind of proceeding? e.g. promissory note, possession, appeal to High Court, 137"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-2 h-11 w-full rounded-md border border-border bg-surface px-4 text-body text-text placeholder:text-text-faint focus:border-brand focus:outline-none"
        />
        {query.trim() && matches.length === 0 ? (
          <p className="mt-2 text-small text-text-muted">
            Nothing matches “{query}”. Try the kind of suit rather than the statute — the Schedule
            describes proceedings, not sections.
          </p>
        ) : null}
        {matches.length > 0 ? (
          <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-surface">
            {matches.map((article) => (
              <li key={article.id}>
                <button
                  type="button"
                  onClick={() => choose(article.id)}
                  className="flex w-full items-baseline gap-3 px-4 py-3 text-left transition-colors hover:bg-bg">
                  <span className="min-w-10 font-mono text-small font-bold text-brand">
                    {article.number}
                  </span>
                  <span className="text-body text-text">{article.rows[0]?.description}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {selected ? (
        <>
          <section className="rounded-md border border-border bg-surface p-4">
            <h2 className="text-small font-semibold uppercase tracking-wide text-text-muted">
              2 · What the Schedule says
            </h2>
            <p className="mt-2 font-mono text-small font-bold text-brand">
              Article {selected.number}
              {selected.division ? (
                <span className="font-sans font-normal text-text-faint"> · {selected.division}</span>
              ) : null}
            </p>

            {limbs.length > 1 ? (
              <div className="mt-3">
                <p className="text-small text-text-muted">
                  This Article has more than one limb. Pick the one you are on:
                </p>
                <div className="mt-2 space-y-1">
                  {limbs.map((row, index) => (
                    <label key={index} className="flex items-start gap-2 text-body text-text">
                      <input
                        type="radio"
                        name="limb"
                        checked={limbIndex === index}
                        onChange={() => setLimbIndex(index)}
                        className="mt-1.5"
                      />
                      <span>
                        {row.description} <span className="text-text-muted">— {row.period}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {limb ? (
              <dl className="mt-3 space-y-2 text-body">
                {limbs.length === 1 ? (
                  <div>
                    <dt className="text-small text-text-muted">Description of suit</dt>
                    <dd className="text-text">{limb.description}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-small text-text-muted">Period of limitation</dt>
                  <dd className="font-medium text-text">{limb.period}</dd>
                </div>
                <div>
                  <dt className="text-small text-text-muted">
                    Time from which period begins to run
                  </dt>
                  <dd className="text-text">{limb.commencement}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-body text-text-muted">
                The Schedule prescribes no period on this limb, so there is nothing to compute from
                it. Read the Article in full.
              </p>
            )}
            <Link
              href={`/acts/lim/schedule/schedule#article-${selected.number}`}
              className="mt-3 inline-block text-small text-brand hover:underline">
              See it in the Schedule →
            </Link>
          </section>

          {limb && period ? (
            <section>
              <h2 className="text-small font-semibold uppercase tracking-wide text-text-muted">
                3 · When did that happen?
              </h2>
              <p className="mt-1 text-small text-text-muted">{limb.commencement}</p>
              <input
                type="date"
                value={startOn}
                onChange={(event) => {
                  setStartOn(event.target.value);
                  if (event.target.value) track("limitation_computed", { article: selected.number });
                }}
                className="mt-2 h-11 rounded-md border border-border bg-surface px-4 text-body text-text focus:border-brand focus:outline-none"
              />
            </section>
          ) : null}

          {result ? (
            <section className="rounded-md border border-brand bg-surface p-4">
              <h2 className="text-small font-semibold uppercase tracking-wide text-text-muted">
                4 · Working
              </h2>
              <ol className="mt-2 space-y-1 text-body text-text">
                <li>
                  Period begins to run: <strong>{longDate(startOn)}</strong>
                </li>
                <li>
                  Prescribed period: <strong>{limb?.period}</strong> (Article {selected.number})
                </li>
                <li>
                  s.12(1) — the day it runs from is excluded, so the period is counted from the day
                  after.
                </li>
                {result.clamped ? (
                  <li className="text-text-muted">
                    The corresponding day does not exist in that month, so the period ends on its
                    last day.
                  </li>
                ) : null}
              </ol>
              <p className="mt-3 border-t border-border pt-3 text-body">
                On these facts alone, the period ends on{" "}
                <strong className="text-text">{longDate(result.expiresOn)}</strong>.
              </p>
              {result.weekday === "Sunday" || result.weekday === "Saturday" ? (
                <p className="mt-2 text-small text-text-muted">
                  That is a {result.weekday}. If the court is closed that day, s.4 lets you file on
                  the day it reopens — check the court calendar rather than assuming.
                </p>
              ) : null}
            </section>
          ) : null}

          <section>
            <h2 className="text-small font-semibold uppercase tracking-wide text-text-muted">
              5 · What would move that date
            </h2>
            <p className="mt-1 text-small text-text-muted">
              The date above is only right if none of these apply. Whether they do is a question of
              fact on your file, not something this page can know.
            </p>
            <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-surface">
              {LIMITATION_FACTORS.map((factor) => (
                <li key={factor.section} className="px-4 py-3">
                  <Link
                    href={`/acts/lim/${factor.section}`}
                    className="font-mono text-small font-bold text-brand hover:underline">
                    s.{factor.section}
                  </Link>{" "}
                  <span className="text-body font-medium text-text">{factor.title}</span>
                  <p className="mt-1 text-small text-text-muted">{factor.effect}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
