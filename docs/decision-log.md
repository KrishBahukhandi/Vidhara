# NexLex — Decision Log

> **Status**: Living document — append-only. · **Last updated**: 2026-07-16
> Product/strategy decisions with rationale and a revisit trigger. Architecture decisions stay in `architecture.md` §16 (ADR-1…11); this log covers product strategy from the 2026-07-16 lean reset onward. Updated the day a decision is made — not at release boundaries.

---

**D-001 · 2026-07-16 · Adopt release-based lean roadmap; phases.md superseded for forward planning.**
Context: Phase 1–8 plan deferred user contact by months and pre-committed features on zero evidence; founder called it out explicitly. Decision: releases V0.1→V2.0 with pre-registered gates ([release-plan.md](release-plan.md)); phases.md retained as historical build log only. Revisit: never (direction), quarterly (calendar).

**D-002 · 2026-07-16 · One wedge, one customer: old⇄new law mapping for law students & judiciary aspirants.**
Context: the vision spans ≥4 distinct products/customers. The 2023→new-codes transition is an urgent, universal, *expiring* pain in the student/aspirant segment, and our 1,271-mapping corpus is the only clean asset addressing it. Decision: everything not serving this wedge is FUTURE or REMOVE ([feature-priority.md](feature-priority.md)). Advocates are an expansion segment, not a launch segment. Revisit: G1 pivot review if A-1 fails; also if organic *advocate* usage appears unprompted.

**D-003 · 2026-07-16 · Web-first for validation; Android runs in parallel, launches at V1.0.**
Context: ADR-8 says Android-first — correct for the long-term product (audience is mobile-first), but Play's 12-tester × 14-day closed-test requirement gates a personal account's production access, while the web (already SEO-structured) deploys in days and shares cleanly into Telegram/WhatsApp. Decision: learning happens on web from V0.1; the Play clock starts at V0.2 so Android production lands inside V1.0. This amends ADR-8's *go-to-market order*, not the architecture (Expo app remains the flagship surface). Revisit: if web traction is blocked by mobile-web friction in beta interviews.

**D-004 · 2026-07-16 · No AI before Gate G1; first AI is a scoped, eval-gated, section-grounded explainer.**
Context: AI Tutor is the vision centerpiece, but wrong legal answers to exam-takers are trust-fatal, and a general tutor has unbounded scope/cost. Decision: fake-door demand test first (V0.5); if chosen at G1, ship only behind the E-7 eval bar (~0 factual errors on a 50-pair hand-checked set), answers always citing + displaying the underlying section; kill-switch feature flag; Sev-0 on any user-reported factual error. Revisit: at G1 with data.

**D-005 · 2026-07-16 · Kill list moved to parking lot with unlock conditions.**
Simulator, Moot Court, AI Judge, Virtual Internship, Advocate Workspace, Drafting, Community, Leaderboards, Achievements, Calendar, user-facing Analytics — each is a different startup or a post-PMF luxury ([future-ideas.md](future-ideas.md) has per-item reopen conditions). Revisit: only via those conditions.

**D-006 · 2026-07-16 · No monetization before Gate G2.**
Charging before retention measures churn speed, not willingness-to-pay. Free tier permanently includes the full corpus + mapping (acquisition engine, public good, SEO moat); the paid layer will be whatever V1.1/V1.2 *proves*. Old pricing guess (₹149/₹399) retired until E-8 pricing interviews. Revisit: G2 (2026-11-03).

**D-007 · 2026-07-16 · No account requirement to read; bookmarks/recents are local-first.**
A signup wall in front of an unproven product measures friction tolerance, not demand, and suppresses the retention signal we exist to measure. Accounts arrive when they carry user value (sync) or business necessity (payments, V2.0). Revisit: if local-bookmark loss (device switch/clear) surfaces as a top-3 interview complaint.

**D-008 · 2026-07-16 · Analytics stack: PostHog (cookieless, anonymous) + Sentry + UptimeRobot; event schema versioned in analytics-plan.md.**
Free tiers, zero infra, sufficient through V2.0. Instrumentation breakage is treated as an outage (a blind week = a lost week of learning). Raw lookup/search text never enters analytics (privacy). Revisit: at event-volume or team growth pressure.

**D-009 · 2026-07-16 · Beta design: 30–50 recruited users, 3-week window, D7 ≥25% bar, feature freeze during the window.**
Small enough to talk to everyone, large enough for cohort math to mean something; warm-cohort D7 below 25% ≈ absent pull. Freeze because shipping mid-window confounds the cohort. Revisit: n/a — one-shot design, judged at the V0.5 gate.

**D-010 · 2026-07-16 · Fake doors permitted, with honest copy only.**
"Coming soon — tap to tell us you want this" (no fake functionality, no bait UI that pretends to work). Measures curiosity cheaply; always cross-checked against interviews before money is spent (E-5). Revisit: if users express annoyance in feedback (then stop immediately — trust > signal).

**D-011 · 2026-07-16 · Content policy: source-faithful text, bundles as artifacts of record, corrections are Sev-0.**
The corpus is the moat and the trust anchor. India Code's own body-heading typos are preserved (documented in phases.md 2026-07-16 entries) pending an editorial-emendation policy; any user-reported *parsing* error outranks feature work. New acts are added on demand-evidence, not completionism (pipeline makes each act ~days). Revisit: emendation policy decision when search-miss data or user reports force it.

**D-012 · 2026-07-16 · Documentation cadence: decision-log same-day; release docs at release boundaries; docs never block a ship.**
Ten strategy docs + six build docs is a lot for a solo founder; the failure mode is documentation-as-procrastination. The only artifact that matters in any given week is the shipped release and the Monday numbers. Revisit: if docs drift is causing real mistakes (then simplify the doc set, don't write more).

**D-013 · 2026-07-16 · Observability accounts deferred by founder; V0.2 build proceeds; Vercel deploy flagged as the one deferral that hollows V0.1.**
Context: founder deferred PostHog/Sentry/Vercel/UptimeRobot account creation. Decision: acceptable for the three observability tools — all code no-ops without keys and activates by pasting env vars; NOT neutral for Vercel, which *is* V0.1 (a product nobody can reach isn't released) — recorded as the standing top founder action. Build continues into V0.2 so the eventual single deploy ships V0.1+V0.2 together. Cost accepted: friendly-user walkthroughs run without dashboards (observation only). Repo pushed to github.com/KrishBahukhandi/Vidhara. Revisit: the moment the Vercel import happens (then wire keys, verify live events, tag v0.1.0).

**D-014 · 2026-07-16 · Product renamed NexLex → Vidhara (umbrella: Bahukhandi Labs); nexlex.in retired.**
Context: on first deploy, `nexlex.in` (the hardcoded default SITE_URL) turned out to belong to an **unrelated law firm** ("NexLex — Best Lawyer in Indore"), and it soft-404s our paths with HTTP 200 — so every share link, canonical tag, and OG image was silently pointing at a competitor's domain (broken growth feature + SEO own-goal). Founder decision: rename the product to **Vidhara** (already the repo + Vercel project name), under a future **Bahukhandi Labs** umbrella (a domain like vidhara.in / *.bahukhandi-labs will be bought later). Scope of rename: **user-facing strings only** — site header/footer, page titles + metadata, OG cards, privacy page, section/mapping copy, health `service` field. **Internal `@nexlex/*` package names, the Supabase project ref, and `createNexlexClient` are deliberately NOT renamed** — code-internal, zero user value, and a monorepo-wide import churn/risk with no upside now (revisit only if it ever confuses a new engineer). Interim SITE_URL default = the Vercel deployment URL so share/canonical/OG work immediately; override `NEXT_PUBLIC_SITE_URL` when the real domain lands. Docs still say "NexLex" in prose — a cosmetic sweep, not load-bearing; deferred so it doesn't gate the release. Revisit: when the domain is purchased (set env var + custom domain in Vercel).

**D-015 · 2026-07-17 · Chapter titles repaired corpus-wide (text rule + curated set); suggestions channel opened.**
Context: chapter titles carried small-caps drop-cap artifacts ("A RREST OF PERSONS"), and — worse — 56 rows (CrPC 35, IPC 17, IEA 2, COI 5, + 4 running-head garbage) had initials-only or junk titles from running heads; the source PDFs are no longer on disk so a parser re-ingest wasn't possible. Decision: (a) `normalizeChapterTitle()` in gazette-common (two-pass: drop-capped "O F"→"OF", then solitary-capital+≥2-token join; punctuation tidy) applied in both parsers + 5 unit tests — future ingests are clean; (b) same rule applied to bundles + live DB (75 rows); (c) **curated titles** for the initials-only rows — CrPC 35 + IPC 17 chapter names from the statutes, each **corroborated against the attached section ranges and first marginal notes in our own DB** (e.g. "O O H B" at §299 Culpable homicide = OF OFFENCES AFFECTING THE HUMAN BODY); IEA/COI got a mechanical running-head-suffix strip. This is a narrow, verifiable exception to "no content from model memory" (D-011/ADR-6): chapter *names* are famous, low-risk, and cross-checked against ingested data; mappings/statute text remain strictly source-only. Known theoretical edge of the text rule ("A NEW …") documented in code; audit new acts' chapter diffs on ingest. Also: migration 0006 adds `feedback.kind` ('rating'|'suggestion', score nullable with shape check) powering the /feedback page (web) + Profile suggestion form (Android) — the founder-requested "tell us what to improve" channel. Revisit: if a future re-ingest with PDFs disagrees with any curated title, the parser wins.

---

*Template for future entries:*
**D-0XX · date · One-line decision.**
Context: … Decision: … Revisit: …
