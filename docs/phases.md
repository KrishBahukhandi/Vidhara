# NexLex — Development Phases

> **Status**: Living document · **Version**: 0.2.0 · **Last updated**: 2026-07-13
> **CURRENT PHASE: Phase 0 — Foundation** (documentation complete; scaffolding next)
> When a phase's exit criteria are met, mark it ✅ here and update memory.md in the same commit.

Complexity scale: S / M / L / XL. Times assume focused solo development with AI assistance and will be recalibrated after Phase 1 (record actuals in memory.md → Lessons Learned).

---

## Phase 0 — Foundation 🔵 IN PROGRESS

**Objectives**: A running, installable, tested skeleton — monorepo, Android app shell, web shell, auth, design tokens, CI — so every later phase is pure feature work.

**Features/Deliverables**
- [x] `/docs` six living documents (prd, architecture, design, rules, phases, memory)
- [x] Git repo initialized; Conventional Commits from first commit
- [x] Architecture pivot to Android-first monorepo documented (ADR-8…10)
- [x] Monorepo scaffold (pnpm workspaces + Turborepo): `apps/mobile` (Expo SDK 57 + expo-router, TS strict), `apps/web` (Next.js 15 + Tailwind), `packages/{shared,tokens,db}` per architecture.md §4
- [x] Design tokens implemented once in `packages/tokens` (light/dark, CI sync check), consumed by both apps via typed theme module (app, ADR-11) and Tailwind preset + CSS vars (web)
- [x] Supabase project live (`eubyvglzkbzfeznocilg`, ap-south-1 Mumbai, $0): migrations 0001–0002 applied, security advisors clean, signup trigger + DPDP cascade verified by test, real generated types in `packages/db`, env wired in both apps, anon REST probe returns RLS-empty 200
- [x] App auth flow: email OTP screens + onboarding (role + exam targets) + tab shell (Library · Mapping · Tutor · Notes · Profile); auth gate verified live (unauthenticated /library redirects to sign-in against the real project) — **remaining**: founder completes an OTP sign-in end-to-end on device; Google native sign-in deferred within Phase 0
- [x] Exemplar feature end-to-end (profile feature): shared Zod schema → typed Result API → RLS — the pattern all features copy
- [x] CI: typecheck, unit tests, web build, Android Metro bundle smoke (GitHub Actions)
- [x] `.env.example`, READMEs
- [ ] EAS configured: dev client + internal distribution build installable on a physical Android device (requires founder's Expo account login)
- [ ] Web deployed to Vercel (staging + production)
- [ ] Fonts bundled (Source Serif 4, Inter) + proper ESLint configs (currently typecheck-as-lint)
- [ ] Error boundary + logger conventions finalized in both apps

**Dependencies**: none.
**Complexity**: M–L (monorepo + EAS setup added) · **Estimate**: 5–7 days

**Testing checklist**
- [x] Unit: section-ref parser (16 cases), tokens CSS sync check; all workspaces typecheck; web prod build (102 kB first-load, budget 180 kB); Android Metro bundle exports
- [ ] Integration: signup → profile row created (RLS verified: cross-user read blocked) — needs live Supabase
- [ ] App: Maestro smoke — launch → sign in (OTP) → onboard → tab shell renders both themes
- [ ] Web: Playwright smoke on marketing shell; Lighthouse ≥ 90

**Exit criteria**: A new user can install the internal build on a real Android device, sign up, onboard, and see the tab shell in both themes; web placeholder live on production URL; CI green; docs current.

---

## Phase 1 — Content Core: Bare Acts + Mapping ⚪ NOT STARTED

**Objectives**: The content moat — best-in-class bare act reader and the canonical old⇄new criminal law mapping in the app, with the same content published as SEO pages on the web.

**Features**
- Content schema migrations (`acts`, `act_chapters`, `act_sections`, `law_mappings`) + FTS + `search_sections` RPC
- Ingestion pipeline (`scripts/ingest/`): parse → validate → review → publish; provenance recorded
- Priority content ingested: **BNS, BNSS, BSA, IPC, CrPC, Evidence Act, Constitution (initial), Contract Act** + mapping datasets for all three pairs (human-reviewed)
- **App**: acts library (browse, chapter tree), section reader (design.md components), deep links (`nexlex://`), global search (shared structured parser "302 IPC" + FTS RPC)
- **App**: mapping experience — lookup screen, `MappingChip` in reader, `MappingComparator` side-by-side with change annotations
- **Web**: read-only SEO pages for every act/section/mapping pair (ISR, per-section metadata, sitemap) — the acquisition engine, reading the same DB

**Dependencies**: Phase 0.
**Complexity**: XL (ingestion quality is the long pole) · **Estimate**: 2.5–3.5 weeks

**Testing checklist**
- [ ] Ingestion validators (numbering continuity, empty bodies, orphan sections) with corrupted-fixture tests
- [ ] Mapping integrity: every published mapping resolves both directions; spot-check list signed off (50 famous sections: 302/420/376/511 IPC, 154 CrPC …)
- [ ] Search: section-ref queries resolve in 1 query; typo tolerance; perf < 300 ms on full corpus
- [ ] App flows (Maestro): browse → read → follow mapping chip → comparator
- [ ] Web SEO: section pages render full text without JS; sitemap generated; Lighthouse ≥ 90

**Exit criteria**: All priority acts + three mapping pairs live and reviewed; search meets latency target; the full read+map journey works in the app on a real device and every section has a public web URL.

---

## Phase 2 — Study Layer: Bookmarks, Notes, Progress ⚪ NOT STARTED

**Objectives**: Turn readers into returning learners; first retention mechanics.

**Features**
- Bookmarks + folders (free-tier caps from `src/config/plans.ts`), optimistic UI
- Notes: rich-text (TipTap-based — 10tap editor on React Native, TipTap on web later), section-anchored + standalone, tags, search within notes
- Reading progress per act; streaks; "continue where you left off" home surface
- Profile v2: study stats
- Data export (DPDP): user can download their data (JSON)

**Dependencies**: Phase 1 (sections to anchor to).
**Complexity**: M · **Estimate**: 1–1.5 weeks

**Testing checklist**
- [ ] RLS cross-user isolation tests for all new tables
- [ ] Offline-queued note edit syncs correctly (SQLite write queue, architecture.md §15.5)
- [ ] Cap enforcement (free limits) server-side, not just UI
- [ ] Sync: bookmark → foldered → note attached → visible on a second device/session

**Exit criteria**: Full study loop usable daily; caps enforced; export works; docs updated.

---

## Phase 3 — AI Legal Tutor v1 → 🚀 PLAY STORE LAUNCH ⚪ NOT STARTED

**Objectives**: First AI feature, fully grounded, quota-ed, evaluated. Then launch on the Play Store.

**Features**
- AI service layer complete (architecture.md §10): provider interface, prompt v1 (tutor), context builder (structured + FTS + pgvector retrieval; embeddings ingestion for sections), guardrails, citation validator, quota system, logging
- App tutor chat: SSE streaming, `CitationLink`s deep-linking into library, feedback buttons, quota meter, conversation history
- Answer evaluation mode (paste answer → rubric feedback) behind same quota
- Golden-set evals (≥ 60 questions across IPC/BNS core topics) + prompt-injection fixtures
- **Play Store launch track**: store listing (screenshots, data-safety form, content rating), closed testing (≥ 12 testers × 14 days if account requires — start this clock during Phase 2), staged production rollout
- Launch checklist: rate limiting live, Sentry, analytics events, web marketing landing final, disclaimers in-app

**Dependencies**: Phases 1–2. **Closed-testing clock is the critical path — start it as soon as Phase 2 exits.**
**Complexity**: L · **Estimate**: 2 weeks (+ Play review/testing calendar time in parallel)

**Testing checklist**
- [ ] Citation validator: valid/invalid/malformed refs; adversarial "fake section" fixtures
- [ ] Guardrails: legal-advice-seeking, off-topic, injection attempts → correct refusals (fixture suite)
- [ ] Quota: exhaustion, reset boundary (IST midnight), race on parallel messages
- [ ] Provider-down degradation path (library remains fully usable)
- [ ] Streaming on real devices over 4G (mid-range Android matrix)
- [ ] Golden-set eval pass ≥ agreed threshold; results archived in repo

**Exit criteria**: Eval pass; P95 first-token < 2.5 s on 4G; cost per free user per day within budget; MVP success-bar journey (prd.md §10) demo-able on a real device; **live on Play Store production**.

---

## Phase 4 — Case Law Search + Legal News ⚪ NOT STARTED

**Objectives**: Expand from statutes to living law.

**Features**: `case_laws` schema + sourcing pipeline (landmark cases first, curated), case reader, citator basics (cases citing this section), tutor grounding extended to cases; `news_articles` + curated daily digest + tagging (haiku-assisted, human-published).
**Dependencies**: Phase 3. **Complexity**: L · **Estimate**: 2 weeks
**Testing**: source attribution correctness, dedupe, tutor citation validator extended to cases.
**Exit criteria**: 500+ landmark cases searchable and linked from relevant sections; daily news shipping ≥ 5 items/day for 2 consecutive weeks.

## Phase 5 — Monetization + Offline ⚪ NOT STARTED

**Objectives**: Revenue on; premium value real.

**Features**: Razorpay subscriptions (webhooks, `subscriptions`/`payments` tables, idempotent handlers), plan gating, pricing page (web) + upgrade flow, offline downloads (acts → on-device SQLite + local FTS index), quota tiers live, billing admin views. **Design decision to make at phase start**: Google Play Billing policy for in-app digital subscriptions vs web-checkout flow — document outcome as an ADR before implementation.
**Dependencies**: Phase 3 (quota infra), Phase 2 (caps). **Complexity**: L · **Estimate**: 1.5–2 weeks
**Testing**: webhook replay/idempotency, plan downgrade edge cases, airplane-mode reading of downloaded acts (Maestro), payment failure paths.
**Exit criteria**: A user can pay, get Plus features instantly, and read a downloaded act in airplane mode; reconciliation report matches Razorpay dashboard; billing approach compliant with Play policy.

## Phase 6 — AI Drafting Assistant ⚪ NOT STARTED

**Objectives**: First practitioner-tier feature (Pro).

**Features**: draft type templates (bail application, legal notice, plaint, written statement, rent agreement), guided intake forms → structured prompt → draft with clause-by-clause explanations, `drafts` storage + versioning + DOCX export, drafting prompt suite + evals.
**Dependencies**: Phase 5 (Pro gating). **Complexity**: L · **Estimate**: 2 weeks
**Exit criteria**: 5 draft types production-quality (reviewed by a practicing advocate), export works, Pro-gated.

## Phase 7 — AI Courtroom Trial Simulator (flagship) ⚪ NOT STARTED

**Objectives**: The category-defining feature.

**Features**: scenario library (fact patterns tagged by offence/procedure), stateful multi-turn simulation engine (`trial_sessions`/`trial_turns`; stages: framing → evidence → examination → cross → arguments → judgment), AI roles (judge, opposing counsel, witnesses) with role-consistent prompts, objection handling, performance scoring rubric + transcript review, BNSS-procedure accuracy layer.
**Dependencies**: Phase 6 AI maturity. **Complexity**: XL · **Estimate**: 3–4 weeks
**Testing**: stage-machine unit tests, role-leak fixtures (judge must not lawyer), rubric consistency evals, long-session memory summarization.
**Exit criteria**: A full mock trial (30+ turns) completes coherently with procedurally-accurate rulings and a useful scorecard; beta cohort (≥ 20 aspirants) CSAT ≥ 80%.

## Phase 8 — Admin, Analytics Depth, Hardening ⚪ NOT STARTED

**Objectives**: Operate at scale; prepare native-app groundwork.

**Features**: admin dashboard v2 on web (content CMS with review queues, errata workflow, user/plan management, AI cost + quality dashboards, feature flags UI), study-analytics for users, performance hardening pass (app cold start, bundle size), security review (OWASP ASVS L1 + mobile MASVS-L1 checklist), load testing, **iOS groundwork** (same Expo codebase: safe-area/HIG audit, TestFlight pipeline).
**Dependencies**: all prior. **Complexity**: L · **Estimate**: 2 weeks
**Exit criteria**: Non-engineer can publish content corrections safely; ASVS/MASVS checklists archived; load test at 10× current traffic passes; iOS build runs on a simulator.

---

## Phase discipline

- Work outside the current phase requires a written justification in memory.md (Priority Queue) — otherwise it waits.
- Discovered-but-deferred work goes to memory.md → TODO/Future Ideas immediately, not into scope.
- At each phase close: retro notes → memory.md Lessons Learned; estimates recalibrated here.

*Change log*
- 2026-07-13 · v0.2.1 · Phase 0 scaffold delivered (monorepo, tokens, both apps, migration 0001, CI); remaining items: Supabase cloud project, EAS device build, Vercel deploy, fonts/ESLint/boundaries polish.
- 2026-07-13 · v0.2.0 · Android-first pivot: Phase 0 rebuilt around monorepo + Expo + EAS; Phase 1 splits app reader vs web SEO pages; Phase 3 launch = Play Store (closed-testing clock flagged as critical path); Phase 5 offline → SQLite + Play Billing decision; Phase 8 adds iOS groundwork.
- 2026-07-13 · v0.1.0 · Initial phase plan (0–8). Phase 0 started; docs deliverable completed.
