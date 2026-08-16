# Vidhara — Roadmap (Lean / Release-Based)

> **Status**: Living document — single source of truth for forward planning. · **Last updated**: 2026-08-16
> Supersedes `phases.md` for all forward planning (phases.md is retained as the historical build log).
> Companion docs: [backlog.md](backlog.md) (what is not done) · [release-plan.md](release-plan.md) · [feature-priority.md](feature-priority.md) · [validation-plan.md](validation-plan.md) · [launch-checklist.md](launch-checklist.md) · [analytics-plan.md](analytics-plan.md) · [user-feedback-plan.md](user-feedback-plan.md) · [success-metrics.md](success-metrics.md) · [future-ideas.md](future-ideas.md) · [decision-log.md](decision-log.md)

---

## ⚠️ Reconciliation — read before the plan below (2026-08-16)

This document was written on 2026-07-16 and the month since diverged from it in four
ways that matter. The *reasoning* below is largely intact; several of its **facts and
dates are not**, and one of its core principles was deliberately overridden by the
founder. Corrected here rather than quietly edited, because a plan that silently
rewrites itself to match what happened teaches nothing.

**1. The calendar is void, not merely late.** Every date in §1 was drawn from a chain
that begins with the Play 12-tester × 14-day clock, and **that clock has still never
started** — no Play Console account exists. V1.0 was pencilled for the week of
2026-09-01, which is now roughly two weeks away with a 14-day gate untouched. Treat the
release *ladder* (the order, the gates, the pre-registered criteria) as valid and every
*date* as void until the Play account exists. Re-date from that day, not from today.

**2. "No AI until retention exists" (§0.4) was overridden — knowingly, by the founder.**
AI shipped on 2026-07-24: a grounded section explainer (D-019, D-020) and a retrieval
"librarian" that routes questions to real sections and never answers them (D-023). The
guardrail the principle actually protected — *no unbounded answer bot, ever, without
evals* — **still holds and was never breached**: every explanation is grounded in the
section's own text server-side, and the open-ended answer bot remains gated behind
retention. What changed is the sequencing, not the safety rule.

**3. The fake doors are gone, so the G1 measurement changed.** Both the AI-explain and
Daily MCQ fake doors were **retired into real features** (D-022, D-024). G1 can no
longer read fake-door CTR because there are no doors left to click; it must read
*adoption and retention of what is built*. §1's V1.1 row and
[validation-plan.md](validation-plan.md) E-5 both still describe the old design.

**4. There is a second track and a strategy amendment this doc predates.** D-028 opened
an **advocate track** (quick cite, case diary, limitation worksheet, case documents) as
a deliberate amendment to §0.2's "one wedge, one customer" — a *track*, explicitly not a
pivot; the student wedge runs unchanged. D-049 then narrowed the positioning: compete as
the **reference product** — the corpus you can trust, surfaced at `/verification` — rather
than fight seven incumbents on practice management.

**Also stale below:** the corpus is **36 acts / 5,594 sections** (0 SEV1), not the "8
priority acts / 3,118 sections" §0.1 describes; and web **sign-in now exists** (D-065),
which §3 lists as out of scope.

**What has not changed:** the wedge, the gates, the pre-registered go/no-go criteria, the
kill list, and §0.6's warning that documentation is also a way of building without
shipping.

---

## 0. The strategy verdict (read this first)

1. **The bottleneck is deployment, not development.** The hardest asset — a complete, provenance-tracked corpus (8 priority acts then; **36 acts / 5,594 sections now**) with the complete official old⇄new mapping tables — already exists and is live in Supabase. The web app with SEO pages exists. Nothing is deployed. V0.1 is therefore not a build, it is a deploy.
2. **One customer, one wedge.** The vision lists five different products (study tool, advocate workspace, drafting suite, simulation platform, community). We build **one**: the old⇄new law transition tool for **law students and judiciary aspirants**. The 2023 codes (BNS/BNSS/BSA) came into force July 2024; every exam and every classroom in India is straddling both regimes **right now**. This pain is urgent, universal in the segment, and expires — a competitor or the passage of time will absorb it. That urgency is the wedge. Advocates come later via the same content.
3. **Web-first for learning, Android in parallel for the launch.** Google Play requires a 12-tester × 14-day closed test before a personal account gets production access. That is a *regulatory clock*, not a build task — we start it immediately (V0.2) but we do not wait for it. The web is live in days, is shareable in Telegram/WhatsApp groups where this audience lives, and is already SEO-structured. This amends the *go-to-market order* of ADR-8, not the architecture ([decision-log.md](decision-log.md) D-003).
4. **No AI until retention exists.** *(OVERRIDDEN 2026-07-24 by founder decision — see Reconciliation §2. The safety rule held; the sequencing did not.)* The AI Tutor is the vision's centerpiece and the roadmap's biggest trap. LLM answers that are wrong about the law, delivered to exam-takers, destroy trust permanently. AI enters at V1.1 at the earliest, as a *scoped, section-grounded* probe, only if V1.0 data says comprehension (not access) is the real pain — and demand is measured first with a fake door ([validation-plan.md](validation-plan.md) E-5).
5. **The roadmap ends in a decision gate, not a feature list.** V1.1+ scope is intentionally *not* pre-committed. Pre-writing V1.2 features today would be the same mistake as the old Phase 1–8 plan with better formatting.
6. **A warning about these ten documents.** Documentation is also a way of building without shipping. Each doc below is as short as honesty allows, and none of them matters next week compared to one thing: **a URL in a stranger's hands**.

## 1. Release ladder & timeline

Original plan of 2026-07-16, with actuals as of 2026-08-16. **Dates from V0.5 onward are
void** — they all descend from a Play clock that has not started (see Reconciliation §1).

| Release | Name | Ships | Planned | **Actual / status** |
|---|---|---|---|---|
| **V0.1** | Deploy what exists | Web live on Vercel + analytics + crash reporting | Fri 2026-07-18 | ✅ **shipped 2026-07-16**, tagged `v0.1.0`. PostHog live; **Sentry + UptimeRobot never configured** |
| **V0.2** | Sharpen the wedge | Mapping-first landing, share links, feedback widget, fonts; Play clock starts | 2026-07-24 | ⚠️ **code shipped**, tagged `v0.2.0`. **Play clock never started** — the one thing this release existed to trigger |
| **V0.5** | Closed beta | Cohort of 30–50, local bookmarks/recents, fake doors, weekly interviews | cohort by 2026-08-03 | ❌ **not started.** Code done (both platforms); **no cohort recruited, no interviews, no tag.** Fake doors retired into real features instead (D-022/D-024) |
| **V1.0** | Public launch | Web public push + Play production (staged), SEO indexed, launch posts | week of 2026-09-01 | ⛔ **unreachable on this date** — needs 14 continuous tester-days that have not begun |
| — | **Gate G1** | 3 weeks of data + ≥20 interviews → choose V1.1 bet | 2026-09-22 | ⛔ **cannot run** — no cohort, so no data and no interviews |
| **V1.1** | First validated bet | ONE feature chosen by G1 data | 2026-10-06 | ⚠️ **pre-empted.** Both candidates (AI explainer, Daily MCQ) were built early by founder decision — D-019/D-020, D-022/D-024 — so G1 now reads *adoption of what exists*, not which to build |
| **V1.2** | Double down or kill | Iterate the V1.1 winner; kill it if it failed its metric | 2026-10-27 | — depends on G1 |
| — | **Gate G2** | Retention review → monetization go/no-go | 2026-11-03 | — unchanged |
| **V2.0** | Business test | Subscription experiment on the proven value | ~2026-11-24 | — unchanged |

**Off-ladder work since 2026-07-16** (real, and not represented above): the corpus grew
8 → **36 acts / 5,594 sections** at 0 SEV1; the **advocate track** shipped on both
platforms (D-028…D-048); `/verification` made provenance visible (D-049); the domain
moved to `vidhara.bahukhandi-labs.com` (D-064); **web sign-in shipped** (D-065).

**The single blocking item is not on this ladder at all: create the Play Console account.**
Everything from V0.5 rightward is calendar-gated behind it, and it is a ₹25 form.

Full per-release detail (purpose, scope, exclusions, metrics, go/no-go) lives in [release-plan.md](release-plan.md).

## 2. Dependencies (the real ones)

```
Content corpus (DONE) ──► V0.1 web deploy ──► V0.2 wedge polish ──► V0.5 beta ──► V1.0 public
                                   │
Play 12-tester×14-day clock ───────┴─ starts V0.2, must complete + review pass before V1.0 Android
PostHog + Sentry (V0.1) ─────────── prerequisite for every learning claim afterwards
Beta recruitment (V0.2–V0.5) ────── prerequisite for interviews; starts before the build finishes
G1 data + interviews ────────────── prerequisite for ANY V1.1 code
Retention evidence (G2) ─────────── prerequisite for subscriptions (V2.0)
Claude API key server-side proxy ── prerequisite for the AI probe IF chosen at G1 (never in client)
```

Non-dependencies (things we previously treated as blockers that are not): device-lab testing beyond one physical phone; font perfection; admin dashboards; remaining acts beyond the 8; proofreading beyond the NCRB-validated pass already done.

## 3. Workstreams (who does what — solo founder + AI pair)

### Technical / Backend
- V0.1: none (Supabase is live; RLS verified; advisors clean). Health endpoint `/api/v1/health` already exists.
- V0.5: `bookmarks` stay **local-first** (localStorage / AsyncStorage) — no new tables, no auth wall. Revisit server sync only when accounts earn their existence (D-007).
- V1.1 (only if AI probe chosen): one Supabase Edge Function `ask-section` — server-side Claude call, grounded strictly in the section text + its mapped counterparts, rate-limited per anon id, hard monthly budget cap. Model: cheapest adequate (Haiku-class); prompt + eval set versioned in repo.

### Frontend (web `apps/web`, app `apps/mobile`)
- V0.1: deploy untouched; wire PostHog + Sentry; cookie-less analytics config.
- V0.2: landing page rebuilt around the mapping lookup ("Type any IPC/CrPC/IEA section → see its new equivalent"), OG images per section, share buttons (WhatsApp/Telegram first — this audience), feedback widget (1–5 + free text → Supabase table `feedback`), bundle Source Serif 4 / Inter properly.
- V0.5: recents ("continue reading"), local bookmarks, fake-door buttons with honest copy (D-010). **Both doors have since been replaced by the real features** (D-022/D-024); only the Android offline door remains.
- V1.0: empty states, error boundaries verified, Play store listing assets.

### Database
- Planned: nothing new until V1.1. **Actual: migrations 0001–0016** — feedback and its kinds, AI cache + usage cap, hearing reminders, schedules, chapter kind/nesting, State amendments, and the auth-role RLS fix (D-065). The "nothing new" line did not survive contact with the advocate track.

### AI
- ~~**Zero AI tasks before G1.**~~ **Superseded 2026-07-24.** At G1, if chosen: build eval set (50 Q/A pairs hand-checked against bundles) *before* the feature; wrong-answer rate on evals must be measured pre-launch; answers must cite section numbers and show the underlying text (the corpus is the moat *and* the guardrail).

### Testing
- Existing: 35 ingest unit tests, 16+ shared tests, typecheck ×5 in CI. Per release: the [launch-checklist.md](launch-checklist.md) smoke pass (manual, 15 min, scripted) + Maestro flow later only if regressions actually bite. No new test infra for its own sake.

### Deployment
- Web: Vercel, auto-deploy from `main`, immutable deploys = instant rollback. Env vars: publishable/anon keys only (service keys never leave server contexts — standing rule).
- Android: `expo run:android` locally → EAS build for the closed test → Play staged rollout (20% → 100%) at V1.0. `minSupportedAppVersion` in the health endpoint is the forced-upgrade lever, reserved for security/data-integrity only.
- Versioning: semver tags on `main` (`v0.1.0`, …); Android `versionCode` monotonic; no release branches at this scale.

### Marketing / Distribution (starts BEFORE the product is "ready" — that's the point)
- V0.2: recruit 12 Android closed testers (personal network) + draft beta-recruitment posts.
- V0.5: recruit 30–50 beta users from: judiciary-prep Telegram groups, law-college WhatsApp groups (personal network first), LinkedIn law-student communities, 1–2 college "campus ambassadors". Scripts in [user-feedback-plan.md](user-feedback-plan.md).
- V1.0: launch posts in the same channels; outreach to Lawctopus/LiveLaw/Bar&Bench for the mapping tool as a story ("free tool maps every IPC section to the BNS"); Google Search Console + sitemap submission (SEO pages exist — this is the compounding channel); no Product Hunt (wrong audience).

### Monitoring / Crash reporting
- Sentry (web + RN) from V0.1: crash-free sessions is a launch-gate metric.
- UptimeRobot (free) on the web URL + `/api/v1/health` from V0.1.
- Supabase dashboard alerts + weekly advisor check. Details in [analytics-plan.md](analytics-plan.md).

## 4. Operating cadence

- **Weekly** (during beta → V1.2): Monday metrics review against [success-metrics.md](success-metrics.md); 3–5 user interviews; Friday ship.
- **Per release**: update release-plan (actuals vs plan), launch-checklist run, decision-log entries for anything that changed.
- **Per gate**: written go/no-go using the pre-registered criteria — decided *before* looking at the data (they're in release-plan now, precisely so we can't rationalize later).
- **Docs discipline**: decision-log is updated the day a decision is made; everything else at release boundaries. Docs never block a ship.

## 5. What was killed (summary — full reasoning in feature-priority.md)

Removed from the roadmap entirely (→ [future-ideas.md](future-ideas.md) parking lot, each with an explicit unlock condition): AI Courtroom Simulator, AI Moot Court, AI Judge, Virtual Internship, Advocate Workspace, Community, Leaderboards, Achievements, Drafting, Calendar, user-facing Analytics. These are not bad ideas; they are **different startups** or **post-PMF luxuries**, and every week spent on them before retention exists is burned runway.
