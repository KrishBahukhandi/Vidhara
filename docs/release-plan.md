# NexLex — Release Plan

> **Status**: Living document. · **Last updated**: 2026-07-16
> One section per release. Every release answers the same 15 questions. Go/No-Go criteria are **pre-registered**: written before the data exists so they cannot be rationalized afterwards. Scope for V1.1+ is intentionally thin — filling it in today would be assumption-driven development with better formatting.

---

## V0.1 — "Deploy what exists" (internal)

| | |
|---|---|
| **Ship date** | Fri 2026-07-18 |
| **Est. dev time** | 2–3 days |
| **Risk level** | **Low** — no new product code; deploy + instrumentation only |

**Purpose.** Put the already-built product at a public URL and make every future learning claim measurable. V0.1 exists to kill the "it's not ready" excuse: the corpus (8 acts, 3,118 sections, 1,271 mappings) is live in Supabase and the web app renders it — nothing else is required for a stranger to get value.

**Target users.** Founder + 5 friendly users (law students in personal network) doing a scripted walkthrough.

**Problem being solved.** *Ours, not the user's*: zero deployment = zero learning. Every week un-deployed is a week of runway spent on assumptions.

**Features included.**
- `apps/web` deployed to Vercel (production + preview envs), custom domain if available, else `*.vercel.app`.
- PostHog (EU/India-appropriate config, anonymous IDs, no cookie banner needed with cookieless mode) wired into web: pageviews + the [analytics-plan.md](analytics-plan.md) V0.1 event set.
- Sentry on web (source maps uploaded in CI).
- UptimeRobot monitor on `/` and `/api/v1/health`.
- Legal disclaimer footer ("Reference only — verify against the official Gazette; not legal advice") + minimal privacy page (required before Play listing anyway).

**Features explicitly excluded.** Everything else. No UI changes, no fonts, no landing rework, no auth changes, no Android work. If it isn't deploy or measurement, it waits.

**Success metrics.** Site reachable (uptime >99% over the weekend); events flowing into PostHog (verify all V0.1 events fire); Sentry captures a forced test error; 5/5 friendlies complete "find IPC 420's new section and read it" unaided; zero P0 bugs found.

**Technical scope.** Vercel project + env vars (`NEXT_PUBLIC_SUPABASE_URL`, anon key only — service keys never in client env, standing rule); `pnpm add posthog-js @sentry/nextjs` in `apps/web`; instrument `section_viewed`, `mapping_card_viewed`, `mapping_lookup`, `search_performed` (components already exist: `apps/web/src/components/mapping-panel.tsx`, `features/acts/queries.ts` call sites); `feedback` not yet.

**Design scope.** None. Shipping ugly-but-real beats polished-but-private.

**Testing strategy.** Launch-checklist smoke script (15 min, manual): home → /acts → act → section → mapping card → cross-navigate → /mapping lookup "302 IPC" → search "cheating". Run on desktop + one Android phone browser. CI (typecheck, tests, build) already gates `main`.

**Launch checklist.** [launch-checklist.md](launch-checklist.md) §V0.1.

**Reason these features exist.** A URL and telemetry are the two prerequisites of every experiment that follows.

**Reason other features were delayed.** Any feature added now would be built on zero information. The corpus is the value; deployment is the bottleneck; nothing else changes what we learn this week.

**Go / No-Go (to V0.2).** GO if the smoke script passes and events are visible in PostHog. NO-GO triggers: content rendering defects on real devices (fix first — content trust is the moat), analytics not capturing (fix first — blind launches teach nothing).

---

## V0.2 — "Sharpen the wedge" (warm users)

| | |
|---|---|
| **Ship date** | 2026-07-24 |
| **Est. dev time** | 1 week |
| **Risk level** | Low–medium — small UI surface, first message-market test |

**Purpose.** Make the product *legible as the wedge* — "type any old section, see its new equivalent, read both" — and start the two clocks that gate V1.0: the Play 12-tester×14-day closed test and beta recruitment.

**Target users.** ~20 warm users (shared 1:1 in WhatsApp/Telegram), 12 Android closed testers.

**Problem being solved.** User: "My textbook/coaching notes say IPC 420 / CrPC 154 but my exam and the courts now say BNS/BNSS — I constantly need the cross-reference and the actual text." Ours: does *that framing* make strangers use it?

**Features included.**
- Landing page rebuilt around the mapping lookup: input box front-and-center ("IPC 420", "154 CrPC", "65B IEA" → result card), one-line value prop, 3 example chips. The lookup parser already exists in `@nexlex/shared`.
- Per-section share: OG image (act, §number, marginal note, old⇄new counterpart) + WhatsApp/Telegram share buttons. Share links are the product's viral unit — a student sharing "BNS 103 = old IPC 302" into a study group is our CAC=₹0 channel.
- Feedback widget on section pages (1–5 + optional text → new `feedback` table, migration 0005, anon INSERT-only RLS) + a "WhatsApp the founder" link.
- Bundle fonts properly (Source Serif 4 for statute text, Inter UI) — this is the *reading* product; typography is the product surface, 0.5 day cap.
- Android: internal EAS build distributed to 12 recruited testers; Play closed-test track created. **The 14-day clock starts here.**

**Features explicitly excluded.** Bookmarks, notes, auth changes, AI anything, MCQs, offline. Also excluded: redesigns beyond the landing page — V0.2 is a message test, not a facelift.

**Success metrics.** Landing→lookup conversion ≥40% of visitors who arrive on `/`; lookup→section-read ≥60%; ≥5 organic shares observed (share_clicked); 12/12 testers enrolled and opt-in confirmed; ≥10 feedback submissions.

**Technical scope.** 1 migration (`0005_feedback.sql`); landing page (`apps/web/src/app/page.tsx`); OG image route (`next/og`); share buttons; Expo EAS build + Play Console closed track setup; PostHog events `share_clicked`, `feedback_submitted`, `landing_lookup_submitted`.

**Design scope.** Landing page only, using existing tokens. One hero, one input, three chips, one screenshot. No new design system work.

**Testing strategy.** Smoke script + OG image render check (WhatsApp link preview debugger) + Play internal track install on the founder's device.

**Reason these features exist.** Each maps to a learning goal: landing = message test (E-2), share = distribution test, feedback = qualitative pipe, Play track = regulatory clock, fonts = credibility of a reading product.

**Reason other features were delayed.** Retention features (bookmarks) are unmeasurable until people return; AI is gated on G1; anything else dilutes the message test.

**Go / No-Go (to V0.5).** GO if warm users complete lookups without hand-holding and the message demonstrably lands (conversion above floor, or clear qualitative resonance in 5+ conversations). NO-GO: if warm users *don't get it*, stop and fix the framing — recruiting 50 beta users into a confusing product wastes the cohort (we only get one first impression per Telegram group).

---

## V0.5 — "Closed beta" (recruited cohort)

| | |
|---|---|
| **Cohort in by** | 2026-08-03 (feature freeze 2026-08-01) |
| **Learning window** | 3 weeks → 2026-08-24 |
| **Est. dev time** | 1 week build + 3 weeks learning (interviews run throughout) |
| **Risk level** | Medium — first cold-ish users; retention truth arrives |

**Purpose.** Answer the two questions everything depends on: **do they come back** (A-2), and **what do they reach for that isn't there** (V1.1 signal). This is the learning release; the build is deliberately small so the founder's week is interviews, not code.

**Target users.** 30–50 recruited users: judiciary-prep Telegram groups, law-college WhatsApp groups, LinkedIn — recruitment scripts in [user-feedback-plan.md](user-feedback-plan.md). Mix: ≥50% judiciary aspirants (highest pain), rest LLB students.

**Problem being solved.** User: same wedge + "I lose my place; I re-look-up the same sections." Ours: retention measurement and V1.1 direction.

**Features included.**
- **Recents** ("continue reading") — localStorage/AsyncStorage, no auth. Cheapest possible return-visit aid and a measurement instrument for return intent.
- **Local bookmarks** — star a section, list view. Local-first, no account wall (D-007): a signup gate in front of an unproven product measures tolerance for friction, not demand.
- **Fake doors** (D-010, honest copy "Coming soon — tap to tell us you want this"): (a) "Explain this section with AI" on the reader; (b) "Daily MCQ" card on home; (c) Android-only "Download for offline". Each fires `fake_door_clicked {feature}`.
- Beta onboarding: 1-screen "what this is + WhatsApp group link" (a beta WhatsApp group is the feedback firehose).
- Android app to the closed-test track with the same features.

**Features explicitly excluded.** Server-side sync (no accounts pressure yet), notes/highlights (no evidence), real AI (gated), MCQ content (fake door first), performance work beyond obvious jank.

**Success metrics** (cohort-based, definitions in [success-metrics.md](success-metrics.md)): activation ≥60% (recruited users are warm — below this the onboarding or product is broken); **D7 ≥25%**; sections/active-session ≥5; mapping lookups/user/week ≥3; ≥15 interviews completed; fake-door CTR ranking with ≥30 unique voters total.

**Technical scope.** Recents + bookmarks components (both apps); fake-door components + events; beta cohort tagged in PostHog (`cohort: beta-1` via URL param on invite links); weekly PostHog cohort review.

**Design scope.** Bookmark/recents UI from existing tokens; empty states for both.

**Testing strategy.** Smoke script both platforms; localStorage persistence across sessions; cohort tagging verified end-to-end before invites go out (a mis-tagged cohort invalidates the whole learning window).

**Reason these features exist.** Recents/bookmarks are the minimum machinery to *observe* returning behavior; fake doors buy V1.1 signal for ~a day of work; the WhatsApp group converts users into a research panel.

**Reason other features were delayed.** Anything bigger would eat the interview weeks — in this release the founder's scarce resource is conversations, not code.

**Go / No-Go (to V1.0).** GO if D7 ≥25% **or** (D7 ≥15% **and** interviews show strong pull with a fixable churn reason — e.g. "content missing my state's syllabus act" is fixable; "I just don't need this" is not). NO-GO: D7 <15% with flat interview enthusiasm → do **not** launch publicly; iterate the wedge inside the beta (cheaper to relaunch to 50 people than to burn the public channels). Public channels are one-shot.

---

## V1.0 — "Public launch"

| | |
|---|---|
| **Ship window** | week of 2026-09-01 (buffer for Play review) |
| **Est. dev time** | 2 weeks (polish + store + launch prep; no new features) |
| **Risk level** | Medium — public reputation now attaches to the product |

**Purpose.** Open the funnel: unknown-audience retention (the beta cohort was warm), SEO compounding, and enough volume for G1 to be decided on data instead of anecdotes.

**Target users.** Public — law students, judiciary aspirants; Android (Play production, staged) + web.

**Problem being solved.** Same wedge, at distribution scale.

**Features included.** V0.5 feature set, hardened: empty/error states audited, Play production listing (screenshots, data-safety form, content rating), staged rollout 20%→100%, SEO verification (Search Console, sitemap submitted — the per-section pages and JSON-LD already exist), launch posts + Lawctopus/LiveLaw/Bar&Bench outreach ("free tool maps every IPC section to the BNS"), winner of the fake-door test promoted to a visible "vote for what's next" card.

**Features explicitly excluded.** New features. V1.0 is distribution + hardening. Especially excluded: subscriptions (nothing proven to charge for), accounts requirement, AI.

**Success metrics.** Week-1: ≥500 unique visitors, ≥40% activation, crash-free sessions ≥99.5%; week-3 (G1 inputs): public **D7 ≥10%**, WRR trend up, ≥20 cumulative interviews, organic search impressions >0 and rising, ≥1 unprompted public mention.

**Technical scope.** Play submission pipeline (EAS build → console), staged rollout config, Search Console, OG/meta audit, `minSupportedAppVersion` wired in app boot check (exists in `/api/v1/health`), Sentry release tagging both platforms.

**Design scope.** Store assets; landing final pass; app icon check on real launcher.

**Testing strategy.** Full launch-checklist §V1.0 incl. rollback drill (deliberately promote previous Vercel deploy once, restore, document timing) and content QA (50-section random sample vs bundle artifacts — provenance already recorded).

**Reason these features exist.** Hardening protects the one-shot public first impression; staged rollout + rollback drill cap the blast radius of the unknown.

**Reason other features were delayed.** G1 hasn't happened; anything built now would front-run the data the whole plan exists to collect.

**Go / No-Go (Gate G1, 2026-09-22).** Written decision using [success-metrics.md](success-metrics.md) §G1: choose exactly **one** V1.1 bet from {AI section-explainer, Daily MCQ, Offline, other-from-interviews} using fake-door CTRs + interview pull + retention diagnosis. If public D7 <5% AND interviews show no pull → **pivot review instead of V1.1**: the wedge, not the feature set, is wrong (candidate pivots pre-listed in [validation-plan.md](validation-plan.md) §Pivots). Features cannot fix absent demand.

---

## V1.1 — "First validated bet" (scope decided at G1 — deliberately thin today)

| | |
|---|---|
| **Ship date** | 2026-10-06 (2 weeks post-G1) |
| **Risk level** | Medium; **High if the AI candidate wins** (accuracy risk) |

**Purpose.** Build the single thing users demonstrably reached for, instrumented to prove or kill it in 3 weeks.

**Pre-registered candidates** (one enters, chosen at G1):
- **A — "Explain this section" (AI probe).** Server-side Supabase Edge Function `ask-section`; answer grounded *only* in the section text + mapped counterparts (both already in DB — the corpus is the guardrail); citations + underlying text always shown; Haiku-class model; rate limit 10/day/anon-id; monthly budget cap ~₹5k; **pre-launch eval**: 50 hand-checked Q/A pairs, ship only if factual-error rate on evals is ~0 and hallucination style failures <5% — wrong legal answers to exam-takers are trust-fatal (D-004).
- **B — Daily MCQ.** 1/day, hand-authored from the corpus (30-day seed bank, ~2 founder-days), answer links to the section + mapping. Habit loop for the exam segment; zero AI risk.
- **C — Offline (Android).** SQLite snapshot of published sections shipped with the app. Real for tier-2/3 data costs; highest build cost of the three — needs the strongest fake-door + interview signal to win.

**Included / excluded / metrics / scope.** Written at G1 as an addendum here (one page, same 15 fields). Success metric shape is fixed now: *feature adoption ≥30% of WAU and measurable retention lift in adopters vs matched non-adopters within 3 weeks, else it dies in V1.2.*

**Go / No-Go (to V1.2).** The pre-registered metric above. No sunk-cost extensions: 3 weeks is the window.

---

## V1.2 — "Double down or kill"

| | |
|---|---|
| **Ship date** | 2026-10-27 |
| **Risk level** | Low — direction is data-driven by construction |

**Purpose.** If V1.1 hit: deepen it (quality, coverage, polish) — compounding beats novelty. If V1.1 missed: **remove it** (feature debt in a young product is real debt) and take the runner-up candidate or the strongest interview theme.

**Everything else**: defined at the V1.1 verdict, same 15-field addendum. Pre-commitment here would be theater.

**Go / No-Go (Gate G2, 2026-11-03).** Monetization gate: proceed to V2.0 only if WRR is stable-or-growing for 4 consecutive weeks, public D30 ≥8%, and ≥5 interviewees have *unprompted* asked about paying / requested more than free offers. Otherwise V2.0 waits — charging before value-retention exists just measures how fast users leave.

---

## V2.0 — "Business test"

| | |
|---|---|
| **Ship window** | ~2026-11-24 (gated on G2) |
| **Risk level** | High (pricing is one-shot-ish per audience) |

**Purpose.** Test willingness-to-pay on the *proven* value loop, not on hypothetical features. Structure decided at G2; current hypothesis (revisable): free = full bare acts + mapping (the moat stays free — it's the acquisition engine and public good), paid = the validated V1.1/V1.2 layer (e.g. unlimited AI explanations / full MCQ archive) at an India-student price point (₹99–₹199/mo band to be tested via interviews *before* build; the old ₹149/₹399 guess from `prd.md` is retired until then).

**Technical scope (sketch).** Payments: Play Billing for Android (policy requirement for in-app digital goods) + Razorpay for web; entitlements table + RLS; this is the release where **accounts become mandatory for payers only**.

**Success metrics.** Free→paid conversion ≥2% of WAU within 4 weeks, churn <15%/mo, refund/complaint rate ~0, and — the real test — retention of payers ≥ non-payers.

**Go / No-Go.** Defined at G2 in an addendum with the pricing-interview results attached.
