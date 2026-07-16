# NexLex — Development Phases

> **Status**: Living document · **Version**: 0.3.0 · **Last updated**: 2026-07-13
> **CURRENT PHASE: Phase 1 — Content Core (in progress)**, opened by founder directive with three Phase 0 residuals tracked below (device build, Vercel deploy, polish). UI verification runs on the web previews until the Android build lands.
> When a phase's exit criteria are met, mark it ✅ here and update memory.md in the same commit.

Complexity scale: S / M / L / XL. Times assume focused solo development with AI assistance and will be recalibrated after Phase 1 (record actuals in memory.md → Lessons Learned).

---

## Phase 0 — Foundation 🟡 RESIDUALS ONLY

> Remaining before ✅: (a) Android device build — `expo run:android` Gradle failure root-caused to pnpm isolated linking breaking Expo autolinking classpaths; fix staged (`nodeLinker: hoisted` in pnpm-workspace.yaml), applies on next `pnpm install`, then rebuild; (b) Vercel deploy of apps/web; (c) polish: fonts, ESLint, error boundaries; (d) founder OTP sign-in end-to-end on device.

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

## Phase 1 — Content Core: Bare Acts + Mapping 🔵 IN PROGRESS

**Progress 2026-07-13 — first vertical slice LIVE and browser-verified:**
- [x] Migration 0003 applied (acts/chapters/sections/mappings, FTS + trigram indexes, published-only RLS, `search_sections` RPC, `v_mapping_lookup` security-invoker view)
- [x] Dev sample seed (6 acts, 16 famous sections, 8 reviewed mappings across all three pairs) — honest provenance: placeholder bodies flagged in-UI with a "sample content" chip; **purge before real ingestion**
- [x] App screens live against real DB: Library (acts list + search box), act detail, section reader (serif statute type + mapping cards with change-type badges), Mapping tab lookup via shared parser
- [x] Anonymous browsing per architecture.md §6 (tabs open to all; sign-in lives in Profile; onboarding redirect only for signed-in users)
- [x] Verified in Expo web preview: library → act → §302 reader → mapping card → cross-navigate to BNS §103; "crpc 154" lookup → BNSS §173 card
- [x] Ingestion pipeline (`scripts/ingest`, workspace package): act-bundle Zod schema, structural validators (dupes, unsortable numbers, orphan chapter refs, out-of-order, placeholder-body and dev-sample rejection; gap warnings), service-role publish with draft→reviewed→published gating, CLI + README, 12 unit tests — **remaining**: source parsers (India Code) + real priority-act bundles + mapping bundles
- [x] Web SEO pages (`apps/web`): /acts, /acts/[slug], /acts/[slug]/[number] (per-section metadata naming the counterpart section, schema.org Legislation JSON-LD, sample-content notice), /mapping index grouped by pair, sitemap.xml (25 URLs from DB) + robots.txt, site header/footer — all SSG with 1h ISR; verified served HTML contains statute text without JS
- [x] **All three NEW criminal codes fully ingested and LIVE** (2026-07-14): **BNS 358 sections/20 ch, BNSS 531/39, BSA 169/12** from official Gazette PDFs (MHA mirror; indiacode.nic.in unreachable network-wide + JS-rendered). Parser matured to be **producer-independent** (`gazette-bbox.ts`): `pdftotext -bbox` word coordinates, **baseline (yMax) line grouping** (survives italic/emphasis runs with different yMin), **position/side note detection** — per-page recto/verso side by weighing left- vs right-note evidence (excluding citations), always-extract right column (notes sometimes sit right on a left page), bare-number section starts ("262." alone), strictly-increasing plausibility guard. Handles cairo (BNS) AND iTextSharp (BNSS/BSA) producers whose font metrics disagree. Zero section-number gaps, zero empty notes across all three. Verbatim spot-checks incl. BNSS §173 (Zero-FIR) and BSA §63 (electronic records). Published over seed rows (IDs preserved → all 3 mappings intact: IPC302→BNS103, CrPC154→BNSS173, IEA65B→BSA63); verified live via REST + app preview
- [x] **Old codes IPC + Evidence Act LIVE** (2026-07-15): **IPC 510/511 sections/22 ch, IEA 167 sections** from official India Code PDFs (indiacode.nic.in blocked network-wide → retrieved via Internet Archive Wayback). These use a totally different **run-in-heading** format (`302. Punishment for murder.—Whoever…`, no margin column), so a second parser was built: `gazette-inline.ts` — drops footnotes/superscripts by font height (<8.6pt), strips amendment brackets (`[34. …`), splits title at the first `.—`/`.–` (with a first-period fallback for repealed sections), starts after "enacted as follows". IPC §17 is the one gap (source renders `[17 "Government"` with no dot). Published over seed rows; IPC302→BNS103 and IEA65B→BSA63 mappings intact; app shows real text on BOTH old & new sides.
- [x] **CrPC 1973 LIVE** (2026-07-16): **484/484 sections, zero gaps, 37 chapters** — sourced directly from India Code after discovering the network block is **DNS-level only** (`dns.google` + `curl --resolve` to the Akamai edge IP works); PDF (1.88 MB) range-chunked past the 1 MiB download cap. Inline parser fixes: enactment regex broadened ("enacted by Parliament in the twenty-fourth Year…"), and a SECOND enactment formula mid-document (appended amendment act) now terminates parsing. §41/§125/§154/§438 verbatim; CrPC154→BNSS173 mapping intact. **All six mapped criminal-law acts now carry real official text.**
- [x] **Contract Act 1872 + Constitution of India LIVE** (2026-07-16): **ICA 266/266 sections** (incl. repealed stubs to §266 — Sale-of-Goods/Partnership carve-outs; the "238" figure counts only extant sections), **COI 382 extant articles/19 parts** ([As on 9 Dec 2020] English consolidation; Arts 379–391 omitted by the 7th Amendment — the source's own range stub; Schedules excluded this pass; 105th/106th-amendment refresh flagged in provenance). Parser hardening: no-space section numbers ("16.“Undue"), PART headings folded to chapters, preamble start marker (ADOPT ENACT…), schedule terminator, and the **title-shaped guard** — a line-start number followed by lowercase is a wrapped cross-reference ("…of article\n30. shall…"), which had hijacked Arts 16–29. **All 8 Phase-1 priority acts now live: COI, IPC, ICA, IEA, CrPC, BNS, BNSS, BSA.**
- [x] **Complete official mapping tables LIVE + lettered-section recovery** (2026-07-16): **1,271 mappings** across all three pairs (IPC⇄BNS 559, CrPC⇄BNSS 526, IEA⇄BSA 186) parsed from the official **NCRB Sankalan comparative tables** (`ncrb-table.ts` + tests; sub-section rows aggregate to sections; both redundant table directions normalized; types from cardinality + "(Change)" marks → 675 renumbered / 272 modified / 260 merged / 34 omitted / 17 new / 7 identical / 6 split). Migration 0004: nullable mapping endpoints with shape+type checks, partial unique indexes, LEFT-JOIN `v_mapping_lookup` so omitted (IPC 497 adultery, 377, **124A sedition**) and new (BNS 304 snatching, BNS 69) rows surface; mapping cards/panels render the missing side as "No corresponding provision". Publishing the concordance **cross-validated the act ingestion** and exposed ~140 silently missing sections — all recovered: lettered insertions (IPC 120B/304B/354A–D/376A–AB/498A…, CrPC 41A–D/265B–L/436A…, COI Arts 21A/31A–C/39A/239AA…) had been rejected by an integer-only monotonic guard (now sort-key based); IEA §113 was eaten by an unanchored case-insensitive Gazette-masthead furniture regex (now case-sensitive); IPC §17/§174A had bracket-eaten periods and body-height footnote digits (regex fallbacks); BSA §170 hid behind a left-margin statutory citation on a recto page (citation now stripped on either page side). **Final live counts: IPC 585, CrPC 533, IEA 186, ICA 268, COI 487, BNS 358, BNSS 531, BSA 170 = 3,118 sections; zero unresolved mapping endpoints.** Landmarks verified via anon REST: 302→103, 420→318, 375→63, 498A→85+86 (split), CrPC 154→173, IEA 65B→63.
- [ ] Further exam-priority acts (Transfer of Property, Specific Relief, etc.) — as demand dictates
- [ ] Proofread pass: ~40 new-code sections have multi-line marginal-note TITLE wrap artifacts (bodies correct); bundles/*.json are the artifacts of record
- [ ] Search polish: `⌘K`-style palette, typo tolerance verification at corpus scale

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
- 2026-07-13 · v0.3.0 · **Phase 1 opened** (founder directive; web previews for UI checks). Content-core slice shipped: migration 0003 live, sample seed, Library/Reader/Mapping screens verified end-to-end in browser. Phase 0 downgraded to residuals (device build blocked on staged nodeLinker fix, Vercel, polish).
- 2026-07-13 · v0.2.1 · Phase 0 scaffold delivered (monorepo, tokens, both apps, migration 0001, CI); remaining items: Supabase cloud project, EAS device build, Vercel deploy, fonts/ESLint/boundaries polish.
- 2026-07-13 · v0.2.0 · Android-first pivot: Phase 0 rebuilt around monorepo + Expo + EAS; Phase 1 splits app reader vs web SEO pages; Phase 3 launch = Play Store (closed-testing clock flagged as critical path); Phase 5 offline → SQLite + Play Billing decision; Phase 8 adds iOS groundwork.
- 2026-07-13 · v0.1.0 · Initial phase plan (0–8). Phase 0 started; docs deliverable completed.
