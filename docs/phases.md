# NexLex — Development Phases

> **Status**: Living document · **Version**: 0.1.0 · **Last updated**: 2026-07-13
> **CURRENT PHASE: Phase 0 — Foundation** (documentation complete; scaffolding next)
> When a phase's exit criteria are met, mark it ✅ here and update memory.md in the same commit.

Complexity scale: S / M / L / XL. Times assume focused solo development with AI assistance and will be recalibrated after Phase 1 (record actuals in memory.md → Lessons Learned).

---

## Phase 0 — Foundation 🔵 IN PROGRESS

**Objectives**: A running, deployable, tested skeleton with auth, design tokens, CI, and all documentation — so every later phase is pure feature work.

**Features/Deliverables**
- [x] `/docs` six living documents (prd, architecture, design, rules, phases, memory)
- [ ] Git repo initialized; Conventional Commits from first commit
- [ ] Next.js 15 + TypeScript strict + Tailwind + shadcn/ui scaffold per architecture.md §4
- [ ] Design tokens implemented (`tokens.css`, light/dark, fonts self-hosted)
- [ ] Supabase project + local CLI stack; `profiles` migration + RLS + signup trigger
- [ ] Auth: email OTP + Google; onboarding (role + exam targets); app shell (bottom tabs / sidebar)
- [ ] Error boundaries, logger, Zod-validated server-action pattern established (one exemplar feature: profile edit)
- [ ] CI: typecheck, lint, unit tests, build; deployed to Vercel (staging + production)
- [ ] `.env.example`, README

**Dependencies**: none.
**Complexity**: M · **Estimate**: 3–5 days

**Testing checklist**
- [ ] Unit: token/config helpers, profile schemas
- [ ] Integration: signup → profile row created (RLS verified: cross-user read blocked)
- [ ] e2e: signup → onboard → land on library placeholder (Playwright)
- [ ] Lighthouse mobile ≥ 90 performance on shell

**Exit criteria**: A new user can sign up, onboard, see the empty app shell in both themes on mobile + desktop, deployed on production URL, CI green, docs current.

---

## Phase 1 — Content Core: Bare Acts + Mapping ⚪ NOT STARTED

**Objectives**: The content moat — best-in-class bare act reader and the canonical old⇄new criminal law mapping. Publicly readable (SEO) without login.

**Features**
- Content schema migrations (`acts`, `act_chapters`, `act_sections`, `law_mappings`) + FTS
- Ingestion pipeline (`scripts/ingest/`): parse → validate → review → publish; provenance recorded
- Priority content ingested: **BNS, BNSS, BSA, IPC, CrPC, Evidence Act, Constitution (initial), Contract Act** + mapping datasets for all three pairs (human-reviewed)
- Acts library UI: browse, act detail (chapter tree), section reader (design.md components), deep links, ISR/SEO (per-section metadata)
- Global search: structured parser ("302 IPC") + FTS + `⌘K` palette
- Mapping experience: lookup page, `MappingChip` in reader, `MappingComparator` side-by-side with change annotations

**Dependencies**: Phase 0.
**Complexity**: XL (ingestion quality is the long pole) · **Estimate**: 2–3 weeks

**Testing checklist**
- [ ] Ingestion validators (numbering continuity, empty bodies, orphan sections) with corrupted-fixture tests
- [ ] Mapping integrity: every published mapping resolves both directions; spot-check list signed off (50 famous sections: 302/420/376/511 IPC, 154 CrPC …)
- [ ] Search: section-ref queries resolve in 1 query; typo tolerance; perf < 300 ms on full corpus
- [ ] e2e: browse → read → follow mapping chip → comparator
- [ ] SEO: section pages render full text without JS; sitemap generated

**Exit criteria**: All priority acts + three mapping pairs live and reviewed; search meets latency target; anonymous user can complete the full read+map journey; Lighthouse ≥ 90.

---

## Phase 2 — Study Layer: Bookmarks, Notes, Progress ⚪ NOT STARTED

**Objectives**: Turn readers into returning learners; first retention mechanics.

**Features**
- Bookmarks + folders (free-tier caps from `src/config/plans.ts`), optimistic UI
- Notes: rich-text (TipTap), section-anchored + standalone, tags, search within notes
- Reading progress per act; streaks; "continue where you left off" home surface
- Profile v2: study stats
- Data export (DPDP): user can download their data (JSON)

**Dependencies**: Phase 1 (sections to anchor to).
**Complexity**: M · **Estimate**: 1–1.5 weeks

**Testing checklist**
- [ ] RLS cross-user isolation tests for all new tables
- [ ] Offline-queued note edit syncs correctly (basic SW queue)
- [ ] Cap enforcement (free limits) server-side, not just UI
- [ ] e2e: bookmark → foldered → note attached → visible on second device (second context)

**Exit criteria**: Full study loop usable daily; caps enforced; export works; docs updated.

---

## Phase 3 — AI Legal Tutor v1 → 🚀 PUBLIC MVP LAUNCH ⚪ NOT STARTED

**Objectives**: First AI feature, fully grounded, quota-ed, evaluated. Then launch.

**Features**
- AI service layer complete (architecture.md §10): provider interface, prompt v1 (tutor), context builder (structured + FTS + pgvector retrieval; embeddings ingestion for sections), guardrails, citation validator, quota system, logging
- Tutor chat UI: streaming, `CitationLink`s into library, feedback buttons, quota meter, conversation history
- Answer evaluation mode (paste answer → rubric feedback) behind same quota
- Golden-set evals (≥ 60 questions across IPC/BNS core topics) + prompt-injection fixtures
- Launch checklist: rate limiting live, Sentry, analytics events, marketing landing, disclaimers

**Dependencies**: Phases 1–2.
**Complexity**: L · **Estimate**: 2 weeks

**Testing checklist**
- [ ] Citation validator: valid/invalid/malformed refs; adversarial "fake section" fixtures
- [ ] Guardrails: legal-advice-seeking, off-topic, injection attempts → correct refusals (fixture suite)
- [ ] Quota: exhaustion, reset boundary (IST midnight), race on parallel messages
- [ ] Provider-down degradation path
- [ ] Golden-set eval pass ≥ agreed threshold; results archived in repo

**Exit criteria**: Eval pass; P95 first-token < 2.5 s; cost per free user per day within budget; MVP success-bar journey (prd.md §10) demo-able end-to-end; **launched**.

---

## Phase 4 — Case Law Search + Legal News ⚪ NOT STARTED

**Objectives**: Expand from statutes to living law.

**Features**: `case_laws` schema + sourcing pipeline (landmark cases first, curated), case reader, citator basics (cases citing this section), tutor grounding extended to cases; `news_articles` + curated daily digest + tagging (haiku-assisted, human-published).
**Dependencies**: Phase 3. **Complexity**: L · **Estimate**: 2 weeks
**Testing**: source attribution correctness, dedupe, tutor citation validator extended to cases.
**Exit criteria**: 500+ landmark cases searchable and linked from relevant sections; daily news shipping ≥ 5 items/day for 2 consecutive weeks.

## Phase 5 — Monetization + Offline ⚪ NOT STARTED

**Objectives**: Revenue on; premium value real.

**Features**: Razorpay subscriptions (webhooks, `subscriptions`/`payments` tables, idempotent handlers), plan gating middleware, pricing page, offline downloads (acts → IndexedDB, SW routes), quota tiers live, billing admin views.
**Dependencies**: Phase 3 (quota infra), Phase 2 (caps). **Complexity**: L · **Estimate**: 1.5–2 weeks
**Testing**: webhook replay/idempotency, plan downgrade edge cases, offline reader airplane-mode e2e, payment failure paths.
**Exit criteria**: A user can pay via UPI, get Plus features instantly, read a downloaded act in airplane mode; reconciliation report matches Razorpay dashboard.

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

**Features**: admin dashboard v2 (content CMS with review queues, errata workflow, user/plan management, AI cost + quality dashboards, feature flags UI), study-analytics for users, performance hardening pass, security review (OWASP ASVS L1 checklist), load testing, API readiness for native clients.
**Dependencies**: all prior. **Complexity**: L · **Estimate**: 2 weeks
**Exit criteria**: Non-engineer can publish content corrections safely; ASVS checklist archived; load test at 10× current traffic passes.

---

## Phase discipline

- Work outside the current phase requires a written justification in memory.md (Priority Queue) — otherwise it waits.
- Discovered-but-deferred work goes to memory.md → TODO/Future Ideas immediately, not into scope.
- At each phase close: retro notes → memory.md Lessons Learned; estimates recalibrated here.

*Change log*
- 2026-07-13 · v0.1.0 · Initial phase plan (0–8). Phase 0 started; docs deliverable completed.
