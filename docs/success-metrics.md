# NexLex — Success Metrics

> **Status**: Living document. · **Last updated**: 2026-07-16
> Definitions first (so numbers can't be gamed by redefinition), then per-release targets, then the kill/pivot lines. Targets are priors, not prophecy — their job is to force a *decision*, not to be hit precisely. Changing a target after seeing the data requires a decision-log entry explaining why that isn't rationalization.

---

## Definitions (fixed)

- **Visitor**: unique PostHog anon-id with ≥1 pageview.
- **Activated user**: within their **first session**: viewed ≥3 sections **and** interacted with ≥1 mapping (card view or lookup). This is the "aha": they read *and* they touched the wedge.
- **Active user**: ≥1 `section_viewed` or `mapping_lookup` that day (pure landing bounces don't count).
- **D1/D7/D30 retention**: % of a signup-day cohort active again on that day (+/-1-day window for D7/D30, PostHog default).
- **WRR — Weekly Returning Readers (north star)**: users with ≥2 active days ≥1 day apart within a rolling 7 days. Chosen because it directly encodes "study tool people come back to" — the thing the whole company is a bet on. Not DAU (study is bursty), not signups (no accounts), not pageviews (vanity).
- **Sections/active session**: median, not mean (power readers skew means).
- **Crash-free sessions**: Sentry, both platforms.

## Per-release targets

| Metric | V0.1 (n=5, scripted) | V0.5 beta (n=30–50, warm) | V1.0 public wk-3 | V1.1 window |
|---|---|---|---|---|
| Task completion unaided | 5/5 | — | — | — |
| Activation | — | ≥60% | ≥40% | ≥40% |
| D7 | — | **≥25%** | **≥10%** | ≥10% |
| Sections/active session | — | ≥5 | ≥4 | ≥4 |
| Mapping lookups /user/wk | — | ≥3 | ≥2 | ≥2 |
| WRR | — | establish baseline | trend ↑ 3 wks | ↑ vs V1.0 |
| Interviews (cumulative) | 5 think-alouds | ≥15 | ≥20 | +5/wk |
| Crash-free sessions | ≥99% | ≥99% | ≥99.5% | ≥99.5% |
| Feature-specific (V1.1) | — | — | — | adoption ≥30% of WAU **and** adopter-vs-non-adopter retention lift |

*Why these numbers:* recruited warm cohorts that don't hit D7 25% signal absent pull (they were pre-sold and still left); 10% public D7 is a defensible floor for an un-onboarded content tool; 5 sections/session separates "reading" from "bounced into one lookup". They are thresholds for the pre-registered decisions in [release-plan.md](release-plan.md), nothing more.

## Gate criteria (verbatim from release-plan, kept in one place)

- **V0.5 → V1.0 GO:** D7 ≥25%, or D7 ≥15% with strong interview pull + fixable churn cause. **NO-GO:** D7 <15% + flat enthusiasm → iterate wedge inside beta; do not spend public channels.
- **G1 (2026-09-22):** pick ONE V1.1 bet where fake-door CTR ranking and interview pull **agree**; if they disagree, interviews win (CTR measures curiosity). **Pivot trigger:** public D7 <5% AND no interview pull → validation-plan §Pivots, no V1.1.
- **G2 (2026-11-03, monetization):** WRR stable/↑ 4 consecutive weeks AND D30 ≥8% AND ≥5 unprompted payment signals in interviews. All three or V2.0 waits.

## Kill / pivot lines (the brutal section)

- **Wedge kill:** 6 weeks post-V1.0: D7 <5%, WRR flat/declining, interviews yield "nice, but I use my PDF" → the mapping wedge is not a product. Run the pivot review. **Do not add features to a leaky bucket.**
- **V1.1 feature kill:** misses adoption ≥30% WAU or shows no retention lift in 3 weeks → removed in V1.2. No extensions.
- **AI probe kill (pre-launch):** fails the E-7 eval bar → does not ship, candidate B replaces it. Post-launch: any user-reported factual error on statute content = same-day disable switch (feature flag), fix, re-eval before re-enable.
- **Company-level honesty check (quarterly):** if organic search (E-6) shows the *query demand itself* declining (transition pain fading as new codes normalize), the wedge has a shelf life — the validated retention layer (whatever V1.1/V1.2 proved) must be on track to replace it as the reason to return.

## Review ritual

Monday 30-min metrics review against this file (PostHog dashboard "NexLex Core" — [analytics-plan.md](analytics-plan.md)); numbers logged in a running `docs/metrics-log.md` table from V0.5 (created at first beta Monday); gate decisions written up in [decision-log.md](decision-log.md) with the dashboard screenshot attached.
