# NexLex — Project Memory

> **Status**: Living document — the project's persistent brain. · **Last updated**: 2026-07-16
> Read this first when resuming work after any interruption. Update it whenever anything important changes. Keep newest items at the top of each list.

---

## Current Status

- **Plan of record (2026-07-16)**: **Lean release roadmap V0.1→V2.0** — [roadmap.md](roadmap.md) + [release-plan.md](release-plan.md) + 8 companion docs supersede phases.md (decisions D-001…D-012 in [decision-log.md](decision-log.md)). Wedge: old⇄new law mapping for students/judiciary aspirants. **Web-first for validation** (amends ADR-8 GTM order, not architecture); Play 12-tester×14-day clock starts V0.2. No AI before Gate G1; no payments before Gate G2.
- **Next release: V0.1 "Deploy what exists" — target Fri 2026-07-18**: Vercel deploy of apps/web + PostHog (cookieless, event schema v1 in analytics-plan.md) + Sentry + UptimeRobot + disclaimer/privacy pages + 5 friendly walkthroughs. No new product features. Checklist: launch-checklist.md §V0.1.
- **CONTENT CORE COMPLETE (2026-07-16)**: all 8 priority acts carry real official text — **IPC 585, CrPC 533, IEA 186, ICA 268, COI 487, BNS 358, BNSS 531, BSA 170 = 3,118 sections** — plus the **complete official old⇄new mapping tables: 1,271 mappings** from the NCRB Sankalan concordance (IPC⇄BNS 559, CrPC⇄BNSS 526, IEA⇄BSA 186), zero unresolved endpoints. Bundles in `scripts/ingest/bundles/` are the artifacts of record.
- **Backend**: Supabase `eubyvglzkbzfeznocilg` (Mumbai, $0). Migrations 0001–0004 (0004 = nullable mapping endpoints for omitted/new + LEFT-JOIN view); advisors clean (re-check after future DDL); types in `packages/db` regenerated from live schema.
- **What runs today**: 5/5 workspaces typecheck + lint; ingest suite 28 tests green; web builds; app browsable without sign-in per spec.
- **Next action (2026-07-16 evening)**: V0.1 + V0.2 CODE is complete, verified, and pushed to github.com/KrishBahukhandi/Vidhara (founder deferred observability accounts — D-013). **Everything now waits on three founder account actions**: (1) Vercel import (Root Directory `apps/web` + 2 Supabase env vars) → product is LIVE with the full wedge landing; (2) PostHog/Sentry keys → measurement on; (3) Play Console + 12 testers → 14-day clock starts. Next CODE work is V0.5 (recents, local bookmarks, fake doors) — do not start before at least the Vercel deploy exists, per the ship-before-build principle.

## Completed Features

- 2026-07-13 — **Phase 0 scaffold**: monorepo (apps/mobile, apps/web, packages/{tokens,shared,db}); design-token pipeline with CI sync check; app shell (5 tabs) + OTP auth flow + onboarding + profile exemplar feature; migration `0001_create_profiles.sql` (RLS + signup trigger); `.env.example`; GitHub Actions CI (typecheck, tests, web build, Metro bundle smoke); eas.json build profiles.
- 2026-07-13 — Android-first architecture pivot documented (ADR-8/9/10) and executed.
- 2026-07-13 — Documentation foundation (the /docs six).

## Pending Features (by phase — details in phases.md)

- Phase 0 exit items: Supabase cloud project + regenerated types, live auth + RLS integration test, EAS internal build on a device, Vercel deploy, fonts/ESLint/error-boundary polish, Google native sign-in.
- Phase 1: Bare Acts Library + mapping (app), SEO content pages (web), ingestion pipeline, search RPC.
- Phase 2: bookmarks, notes, progress, data export. (Start Play closed-testing clock at exit!)
- Phase 3: AI Legal Tutor v1 + **Play Store production launch**.
- Phases 4–8: case law, news, payments/offline, drafting, trial simulator, admin/iOS groundwork.

## Known Bugs

- ~~**Android native build**~~ **RESOLVED 2026-07-14** — clean build succeeds (`BUILD SUCCESSFUL in 1m 35s`, app-debug.apk produced). Founder: plug the phone in and run `cd apps/mobile && npx expo run:android` — it will reuse the cached build, install, and launch against Metro. History: (1) "SDK location not found" → android/local.properties; (2) `ExpoLogBoxPackage` unresolved → pnpm 11 ignores .npmrc, `nodeLinker: hoisted` moved to pnpm-workspace.yaml; (3) after an interrupted install, THREE layouts coexisted (hoisted root + .pnpm store + per-app trees) and Gradle compiled stale generated code from the old .pnpm path → full clean (`rm -rf` all node_modules + generated android/) + fresh install + `expo prebuild`. Lesson: after switching nodeLinker, always clean-slate node_modules AND regenerated native dirs; local.properties must be re-written after every prebuild --clean.
- Serif font family referenced by `AppText serif` isn't bundled yet — web preview falls back to Georgia via CSS; native falls back to system font (Phase 0 polish; cosmetic).

## Design Decisions

- 2026-07-13 — **ADR-11**: app consumes tokens via typed theme module (`apps/mobile/src/theme`: `useTheme()`, `sp()`, `type`) + RN StyleSheet; NativeWind dropped (unverified on SDK 57; ergonomics-only dependency). Web keeps Tailwind with the shared preset.
- 2026-07-13 — UI primitives established in app: `Screen`, `AppText` (variant/tone/serif), `Button` (4 variants, loading locks width), `Field` (visible label + inline error), `EmptyState`, chip pattern in onboarding. All colors via theme; zero hardcoded hex (grep-checked).
- 2026-07-13 — Design language: "quiet library with a sharp mind" (design.md); bottom tabs Library · Mapping · Tutor · Notes · Profile; mapping change-types color+icon.

## Architectural Decisions (ADR index — full text in architecture.md §16)

- **ADR-11 (2026-07-13)** Typed theme module replaces NativeWind on the app; Tailwind preset remains web-only.
- **ADR-8/9/10 (2026-07-13)** Android-first with Expo · single monorepo in `NexLex/` · clients use supabase-js directly, server hosts only secret-bearing surfaces.
- ADR-2 Supabase only backend · ADR-4 Postgres FTS + pgvector first · ADR-5 Claude behind `AIProvider` · ADR-6 mapping human-curated · ADR-7 prompts versioned code + DB registry.
- ~~ADR-1~~, ~~ADR-3~~ superseded.

## Important Assumptions (verify when they matter)

- **Expo SDK 57** (RN 0.86, React 19.2.3, TS ~6 default template — we pinned TS 5.9 for monorepo consistency; revisit TS 7 when whole repo can move). React/react-dom pinned to exactly 19.2.3 in BOTH apps to avoid duplicate React under hoisted node_modules — keep them aligned when upgrading.
- AsyncStorage (not SecureStore) for Supabase session persistence — session JSON exceeds SecureStore's 2KB item limit; Supabase's documented Expo pattern.
- Play Store: new personal dev accounts need 12-tester × 14-day closed test — verify founder's account status before Phase 2 ends (launch critical path).
- Supabase account facts (checked 2026-07-13): org `gsswdolhgvphznhqldrf`; existing projects UniRide (paused) + Tareshwar Tutorials (active); new project cost $0; free tier = 2 active projects, so NexLex fits. Free-tier built-in email OTP is heavily rate-limited (~2–4/hr) — fine for dev, custom SMTP (e.g., Resend) required before Phase 3 launch (add to launch checklist). Free projects pause after ~1 week idle.
- Play Billing vs Razorpay policy decision = ADR at Phase 5 start.
- Bare act texts public domain (Copyright Act s.52(1)(q)); keep provenance.
- Pricing (₹149/₹399) is a hypothesis; validate before Phase 5.

## Database Decisions

- `0001_create_profiles.sql`: enums `user_role`/`plan_tier`; profiles owner-only RLS (no INSERT/DELETE policies — signup trigger + auth cascade handle those); `touch_updated_at()` + `handle_new_user()` security-definer functions with empty search_path.
- `packages/db/src/database.types.ts` is a **hand-written placeholder** — regenerate via `pnpm --filter @nexlex/db gen:types` once Supabase exists (drop-in replacement).
- Content tables anon-SELECT; search via `search_sections` RPC; `law_mappings` edge table; migrations immutable, expand→migrate→contract.
- App offline store (Phase 5): expo-sqlite + MMKV; conflict = last-write-wins + preserved "conflicted copy".

## API Decisions

- Result contract `{ ok, data | error: { code, message } }` implemented in `@nexlex/shared` (`ok()`/`err()`, `ERROR_CODES`); profile + auth features follow it — the exemplar pattern.
- Feature APIs live in `apps/mobile/src/features/*/api.ts`; components never import the supabase client directly.
- `/api/v1/health` live (returns `minSupportedAppVersion` for the Phase 3 forced-upgrade gate). `/v1` expand-only once app ships.

## Important Conversations / Directives

- 2026-07-16 — Founder: "Ship fast, learn fast, improve fast" — rejected the phase roadmap as too big/slow/assumption-driven; requested YC-partner-grade rethink, release-based plan (V0.1→V2.0), feature triage into MUST/SHOULD/NICE/FUTURE/REMOVE, ten strategy docs as source of truth, optimized for learning/retention/feedback/speed, NOT investor optics. Executed same day (D-001…D-012).
- 2026-07-13 — Founder: Android-first launch; folder strategy delegated → monorepo (ADR-9). "Proceed" given for Phase 0 scaffold.
- 2026-07-13 — Founding master prompt: docs-first, six living documents = definition of done, challenge weak decisions, long-term maintainability.

## Future Ideas (parking lot — not scope)

- iOS app; full web app; Hindi layer; OLED-black theme; MCQ test series; moot-court mode; state amendments; judgment summarizer; institutional licensing; study groups; WhatsApp daily-section bot; push revision nudges.

## Technical Debt

- 2026-07-13 — `lint` scripts are typecheck placeholders (no ESLint configs yet). Accepted to keep scaffold velocity; payoff: Phase 0 exit polish (TODO 4). Risk: low (strict TS catches most; conventions enforced in review).
- 2026-07-13 — No error boundaries/logger util in apps yet (screens handle their own errors). Payoff: Phase 0 exit polish.
- 2026-07-13 — `packages/db` types are hand-written placeholders until Supabase project exists.

## TODO List (near-term, actionable)

0. **Phase 1 content COMPLETE for priority acts** (all 8 live 2026-07-16). Remaining Phase 1: complete mapping tables (full IPC⇄BNS ~511 rows etc. — needs authoritative concordance), proofread passes (note-title artifacts + COI schedules + COI 105th/106th refresh), search polish. Then Phase 0 residuals (device build ✓ works, Vercel deploy, fonts/ESLint) and onward. Then: full mapping tables (complete IPC⇄BNS ~511 rows etc. — needs an authoritative concordance source) + proofread pass on the ~40 wrap-artifact note titles. All three NEW codes (BNS/BNSS/BSA) fully live 2026-07-14; only their seeded famous sections still carry the old dev-sample IDs (now updated in place with real text). IPC/CrPC/IEA still show dev-sample placeholders (flagged in UI) until ingested.

1. ~~Supabase cloud project~~ **DONE 2026-07-13** (`eubyvglzkbzfeznocilg`). Remaining from this item: founder's real OTP sign-in → onboarding → profile edit on device; RLS cross-user integration test (needs 2 users).
2. **Device build (local-first strategy, 2026-07-13)**: founder has Android Studio + physical phone → daily dev via `npx expo run:android` (unlimited local builds, hot reload). `eas init` still wanted eventually for release builds + managed Play signing credentials, but NOT a Phase 0 blocker anymore.
3. **Vercel**: connect repo, deploy apps/web (staging + production).
4. **Polish to exit Phase 0**: bundle fonts (expo-font: Source Serif 4, Inter; next/font on web), real ESLint configs (expo config + next config), error boundary + logger conventions, Maestro smoke flow.
5. Verify founder's Play developer account status (12-tester rule — launch runway).
6. Phase 1 prep: source official act texts (8 priority acts); locate authoritative IPC⇄BNS mapping source for human review.

## Priority Queue (order of execution)

TODO 1 → 2 → 3 → 4 (Phase 0 exit) → 5 in parallel → Phase 1. No out-of-phase work authorized.

## Recent Changes

- 2026-07-16 — **LEAN STRATEGY RESET (founder directive): release-based roadmap replaces Phase 1–8.** Ten strategy docs created (roadmap, release-plan, feature-priority, validation-plan, launch-checklist, analytics-plan, user-feedback-plan, success-metrics, future-ideas, decision-log); phases.md archived as build log. Core calls (D-001…D-012): ONE wedge (old⇄new mapping for students/aspirants — the corpus we already built IS the MVP); web-first validation since Play gates production behind a 12-tester×14-day closed test (clock starts V0.2); V0.1 = deploy-what-exists Fri 2026-07-18; V0.5 = 30–50-user beta (D7 ≥25% bar); V1.0 public week of 2026-09-01; AI gated behind Gate G1 fake-door + eval evidence; payments gated behind Gate G2 retention; Simulator/Moot-Court/AI-Judge/Advocate-Workspace/Drafting/Community/gamification parked in future-ideas.md with unlock conditions. North star: Weekly Returning Readers. Analytics: PostHog + Sentry + UptimeRobot, schema v1 in analytics-plan.md.
- 2026-07-16 — **~480 MARGINAL NOTES CORRECTED (BNS/BNSS/BSA) + schedule cutoff.** The proofread backlog ("~40 wrap artifacts") was actually ~480 mangled notes. Root cause: notes lead at 9.6pt vs body 12pt, so every few lines a note word shares a body line's ±4pt baseline window; the left-margin split tested word ENDS (xMax≤135) which body continuation words (x≈117.6) also pass → split failed → note words leaked into bodies. Fix: column membership by word STARTS (`LEFT_NOTE_WORD_MAX_X` 112 / `LEFT_BODY_RESUME_X` 115 — mind the dead zone: BNSS §401's "or"@106.5 was eaten by a 106 boundary). Plus: ragged-note peel (a period-less note at section start reclaims queued tail fragments — BNSS §391/392 "themselves."), section flush deferred past chapter headings (note tails wrap below "CHAPTER XXIX"; body text under a pending chapter is title material, never body), CITATION tolerates padding/stacking, bbox parser now stops at "THE … SCHEDULE" (BNSS §531 body 172 KB→1.8 KB). **Audit method: NCRB table titles as oracle** — 14 residual new-code mismatches all verified NCRB-side; old-code diffs are India Code's own body-heading typos (kept source-faithfully: IPC §312 "miscarraige", §452 "alter", CrPC §447/§409, IEA §95 — TOCs correct, body headings not). 7 parser unit tests added (35 total). Republished BNS/BNSS/BSA (IDs preserved, mappings intact at 1,271); edge fn v14→tombstone v15.
- 2026-07-16 — **COMPLETE NCRB MAPPING TABLES LIVE (1,271) + ~140 MISSING SECTIONS RECOVERED.** The official NCRB Sankalan comparative tables (SectionTableBNS/BNSS/BSA.html) are now the mapping source (ADR-6 satisfied: authoritative concordance, not model memory). New `ncrb-table.ts` parser: two redundant table directions (header rows flip column roles — detect only when act-names appear in BOTH cells; a data cell's own "-->" once flipped orientation and inverted half the table), sub-section→section aggregation, multi-old-section cells, types from cardinality + "(Change)". Migration 0004: omitted/new mappings get a null endpoint (shape+type checks, partial uniques, LEFT-JOIN view); UI renders "No corresponding provision". **Publishing the concordance cross-validated ingestion**: ~140 real sections were silently missing across 6 acts and are now recovered — (1) integer-only monotonic guard rejected every lettered insertion (IPC 498A/304B/120B…, COI Art 21A/239AA…) → sort-key comparison; (2) `/THE GAZETTE OF INDIA/i` furniture regex ate any body line saying "…notification in the Gazette of India…" (IEA §113 vanished whole) → case-sensitive; (3) IPC §17 `1[17 “Government”` (bracket ate the dot) and §174A `4 [174A .…` (body-height footnote digit) → dotless-quote fallback + footnote-digit strip + space-before-dot tolerance; (4) BSA §170 hid behind a left-margin citation ("1 of 1872.") on a recto page → citations stripped from the left zone on either page side. Live: 3,118 sections, 1,271 mappings, all landmark pairs verified via anon REST; edge function v12 (act+mappings modes) → tombstoned v13.
- 2026-07-16 — **ICA (266) + CONSTITUTION (382 arts/19 parts) LIVE — ALL 8 PHASE-1 PRIORITY ACTS REAL.** ICA runs to §266 (repealed Sale-of-Goods/Partnership stubs included). COI = [As on 9 Dec 2020] English from India Code (legislative.gov.in's hashed uploads turned out to be regional-language editions — got Kannada then Santali before pivoting; refresh COI when a newer English consolidation is found — provenance flags 105th/106th). Parser hardening: no-space numbers ("16.“Undue"), PART→chapter, preamble start (ADOPT ENACT AND GIVE), schedule terminator, and the **title-shaped guard** (line-start number + lowercase = wrapped cross-reference — had hijacked Arts 16–29 via "…of article\n30."). Arts 379–391 legitimately omitted (7th Amdt). Beware stale intermediate files: a bbox regenerated from the wrong PDF cost a debugging loop — regenerate extractions after every re-download.
- 2026-07-16 — **CrPC 1973 LIVE (484/484, 37 ch) — ALL SIX MAPPED ACTS NOW REAL.** Sourcing breakthrough: the `*.nic.in` block is **DNS-level only** — resolve via `https://dns.google/resolve?name=…` then `curl --resolve host:443:IP` hits the Akamai edge (indiacode = 23.11.x) and works instantly; NIC-origin hosts (164.100.x, e.g. lddashboard) stay unreachable (IP-level). Large files: range-chunk (`-r`) past the environment's 1 MiB download cap. CrPC's old handle 16225 is dead (site reorg; the Wayback `1974_ceiminal_AA` file was likely an Amendment Act, not the code) — current canonical: handle 15247, bitstream 15272. Inline-parser fixes: enactment regex broadened for "enacted by Parliament in the twenty-fourth Year…", and a second enactment formula mid-document (appended amendment act) now ENDS parsing. Published via edge function (v7→tombstone v8).
- 2026-07-15 — **OLD CODES: IPC (510/511) + Evidence Act (167) LIVE.** Different era, different format: pre-2023 acts use RUN-IN section headings (`302. Punishment for murder.—Whoever…`), not a marginal-note column — so a 2nd parser `gazette-inline.ts` was built (drops footnotes/superscripts by font height <8.6pt; strips amendment `[` brackets; splits title at first `.—`/`.–` with first-period fallback for repealed sections like "Definition of 'Queen'. Omitted by A.O. 1950"; never-empty note + chapter-title fallbacks). PDFs: indiacode.nic.in blocked network-wide (whole `*.nic.in` blocked here) → fetched via **Internet Archive Wayback CDX** (env caps downloads at 1 MiB — IPC 1.02MB/IEA 432KB fit). IPC §17 the one gap (`[17 "Government"` no dot). Published over seed rows; mappings intact (IPC302→BNS103, IEA65B→BSA63). **CrPC BLOCKED**: only Wayback snapshot is truncated at 1 MiB (incomplete); still on dev-sample placeholder until a complete official PDF is found. 5 of 6 mapped acts now have real text.
- 2026-07-14 — **ALL THREE NEW CRIMINAL CODES LIVE: BNS (358), BNSS (531), BSA (169)** — every section + chapter of the 2023 recodification, from official MHA Gazette PDFs. Parser rewritten to be **producer-independent** after BNSS (iTextSharp) broke the BNS-tuned (cairo) height heuristic: `gazette-bbox.ts` now groups lines by **baseline/yMax** (italics/emphasis share baseline, differ in yMin), detects note side **per page by weighing left vs right note evidence** (citations excluded — they sit right on both sides), **always extracts the right column** (a section's note can sit right even on a left page — fixed BNS §113 "Terrorist act" empty note), accepts **bare-number section starts** ("262." with body on next line), and uses a strictly-increasing plausibility guard (≤20 jump). `gazette-common.ts` = shared assembly state machine. Result: 0 gaps, 0 empty notes across all 3. Known residue: ~40 sections have multi-line marginal-note TITLES with wrap/word-order artifacts (bodies correct) → proofread task. Published via the redeployed→tombstoned edge function; upsert preserved seed IDs so all 3 mappings survive. bundles/{bns,bnss,bsa}.json committed as artifacts of record.
- 2026-07-14 — **FIRST REAL ACT LIVE: BNS 2023 complete** (358 sections, 20 chapters) from the official Gazette PDF. Key facts: indiacode.nic.in unreachable from founder's network AND Anthropic fetcher (Apify cloud probe confirmed site itself up — section pages are JS-rendered anyway); source = MHA-hosted official PDF. Parser evolution (all in scripts/ingest/src/sources/): -layout column heuristics failed (grid drift: note column wandered cols 84–98, single-space merges corrupted body) → **-bbox word coordinates + font-height discrimination (notes 8.8pt vs body 11pt) is the canonical path** (gazette-bbox.ts), with assembleSections shared state machine (gazette-common.ts) handling kerning quirks, note overflow (period-sealing), plausibility guards. Publish channel: temporary secret-gated edge function (service key server-side), bundle POSTed from disk, function tombstoned (410) after — avoids both secret handling and context flooding; `emit-sql` command added as the reviewable-SQL alternative. BNS seed rows overwritten in place (IDs preserved → all mappings intact, verified). Bundle committed at scripts/ingest/bundles/bns.json = artifact of record for proofreading.
- 2026-07-14 — **Web SEO pages + ingestion pipeline**: apps/web gains /acts, /acts/[slug], /acts/[slug]/[number] (counterpart-naming metadata + Legislation JSON-LD + no-JS statute HTML), /mapping, sitemap (25 URLs), robots, site chrome; all SSG+ISR, verified over HTTP. New `@nexlex/ingest` workspace package (bundle schema, validators + 12 tests, review-gated service-role publish, CLI). `scripts/*` added to workspace; db factory gains `persistSession` option. Hoisted relink applied after full clean (see Known Bugs history); android/ regenerated via prebuild.
- 2026-07-13 — **Phase 1 slice: content core live** — migration 0003 + sample seed on Mumbai project; `features/acts` API (search with parser-first strategy, mapping lookup); Library/act-detail/reader/Mapping screens; anonymous browsing enabled (entry → Library, sign-in moved to Profile tab); MarkdownLite + MappingCard components. Browser-verified: acts list → IPC → §302 (serif text + sample-content chip + Modified mapping card) → cross-nav to BNS §103; "crpc 154" → BNSS §173. All screens themed via tokens only.
- 2026-07-13 — **Android build attempt (founder, on-device)**: "SDK location not found" fixed via android/local.properties; second failure root-caused to pnpm isolated linking (see Known Bugs); `nodeLinker: hoisted` staged; founder chose web-preview development for now.
- 2026-07-13 — **Supabase project created and verified live** (founder confirmed $0): ref `eubyvglzkbzfeznocilg` @ ap-south-1; migrations 0001 + **0002 (new: revoke public EXECUTE on SECURITY DEFINER trigger functions — security-advisor finding)**; trigger/cascade tested with throwaway user then cleaned; types regenerated from live schema; env files written (gitignored); auth gate verified in browser against real backend.
- 2026-07-13 — **Browser verification pass**: web landing verified light+dark; app sign-in + tab shell verified via Expo web preview (mobile viewport). Three real bugs found and fixed: (1) unquoted "Source Serif 4" made the browser drop the `.font-serif` rule (preset now quotes font names); (2) hardcoded white-on-brand text was unreadable in dark mode → new `onBrand` token used by both apps; (3) AsyncStorage crashed expo-router's Node SSR on web → platform-conditional storage in the app's supabase client. `.claude/launch.json` added (web:3000, app-web-preview:8081).
- 2026-07-13 — **Phase 0 scaffold commit**: monorepo + both apps + packages + migration + CI, all green (typecheck ×5, tests 16/16, web build 102 kB, Metro bundle OK). ADR-11 recorded; docs v0.2.1 sync.
- 2026-07-13 — v0.2.0 docs sweep — Android-first pivot (ADR-8…10).
- 2026-07-13 — Created /docs six (v0.1.0); repo initialized (`66843f9`).

## Lessons Learned

- 2026-07-16 — **An independent dataset is the best validator.** Zero-gap checks on section numbers used `int()` comparisons, so ~140 LETTERED sections (498A, 304B, Art 21A…) were invisible to both the parser's monotonic guard and the gap audit — every act "validated clean" while missing some of the most-cited provisions in Indian law. Publishing the NCRB concordance (which references those sections) exposed all of them at once. Generalize: when two independent official sources must agree, joining them IS the audit — run it before declaring a corpus complete. Corollaries: never anchor-free case-insensitive regexes for page furniture (`/THE GAZETTE OF INDIA/i` deleted statute text that merely mentioned the Gazette); guards that compare "numbers" must use the domain's real ordering (sort keys), not integers.
- 2026-07-13 — Scaffold-time reality beats plan-time assumptions: Expo SDK 57 shipped a different template (src/app, native tabs, React Compiler) than the SDK 54 the plan assumed — checking the generated code before wiring styling avoided shipping an unverified NativeWind dependency (became ADR-11). Generalize: verify generated scaffolds before layering choices made on paper.
- 2026-07-13 — pnpm 11 gates dependency build scripts (`allowBuilds` in workspace yaml) — remember for future native deps.
