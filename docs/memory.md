# NexLex — Project Memory

> **Status**: Living document — the project's persistent brain. · **Last updated**: 2026-07-13
> Read this first when resuming work after any interruption. Update it whenever anything important changes. Keep newest items at the top of each list.

---

## Current Status

- **Phase**: Phase 0 — Foundation (see phases.md).
- **Done so far**: All six living documents created; **Android-first pivot decided and fully documented** (v0.2.0 across docs, ADR-8…10). This repo is the platform monorepo: `apps/mobile` (Expo/React Native, primary), `apps/web` (Next.js), `packages/{shared,tokens,db}`. No application code exists yet.
- **Next action**: Scaffold the monorepo (pnpm workspaces + Turborepo → Expo app + Next.js web + shared packages) → design tokens in `packages/tokens` → Supabase setup (`profiles` migration, RLS) → app auth + tab shell → EAS internal build.

## Completed Features

- 2026-07-13 — Android-first architecture pivot documented across all six docs (ADR-8/9/10).
- 2026-07-13 — Documentation foundation (the /docs six) — pre-implementation.

## Pending Features (by phase — details in phases.md)

- Phase 0 (rest): monorepo scaffold, tokens package, Supabase + auth, native tab shell, EAS internal build, CI, web placeholder on Vercel.
- Phase 1: Bare Acts Library + mapping in the app; SEO content pages on web; ingestion pipeline; search RPC.
- Phase 2: bookmarks, notes, progress, data export. (Start Play closed-testing clock at exit!)
- Phase 3: AI Legal Tutor v1 + **Play Store production launch**.
- Phases 4–8: case law, news, payments/offline, drafting, trial simulator, admin/iOS groundwork.

## Known Bugs

- None (no code yet).

## Design Decisions

- 2026-07-13 — **Platform**: Android app is the primary surface (360dp baseline, Android back conventions, deep links `nexlex://`); tokens single-sourced in `packages/tokens` → NativeWind (app) + Tailwind (web).
- 2026-07-13 — Design language: "quiet library with a sharp mind" — Source Serif 4 for statute reading, Inter for UI, warm-paper light + charcoal dark, brass accent sparingly. (design.md)
- 2026-07-13 — Bottom tab bar: Library · Mapping · Tutor · Notes · Profile (app + mobile web); desktop web gets sidebar.
- 2026-07-13 — Mapping change-types get dedicated semantic colors + icons (never color alone).

## Architectural Decisions (ADR index — full text in architecture.md §16)

- **ADR-8 (2026-07-13)** Android-first native launch built with **Expo (React Native)** — over Flutter (TS end-to-end, shared schemas/tokens; Dart forks the codebase) and over TWA wrapper (inadequate offline/perf). iOS later from same codebase.
- **ADR-9 (2026-07-13)** Single monorepo in `NexLex/` (pnpm + Turborepo): `apps/mobile` + `apps/web` + `packages/*`. **No sibling website folder** — founder asked us to decide; sibling repos would drift.
- **ADR-10 (2026-07-13)** Clients use supabase-js directly (RLS-guarded); Next.js server hosts only secret-bearing surfaces (AI SSE, webhooks, admin).
- ADR-2 Supabase as the only backend service. · ADR-4 Postgres FTS + pgvector first. · ADR-5 Anthropic Claude behind `AIProvider` interface. · ADR-6 mapping data human-curated. · ADR-7 prompts versioned as code + DB registry.
- ~~ADR-1 Next.js monolith~~, ~~ADR-3 PWA-first~~ — superseded 2026-07-13 by ADR-8/9.

## Important Assumptions (verify when they matter)

- Play Store publishing: if the founder's developer account is a **new personal account**, production access requires a closed test with 12+ testers for 14 days — verify account status before Phase 2 ends; this is the launch critical path.
- Play Billing: whether Razorpay web-checkout is policy-compliant for our subscription flow vs. mandatory Play Billing — must be resolved as an ADR at Phase 5 start (rules differ for digital goods consumed in-app).
- Bare act texts from India Code / official gazettes are public domain (Copyright Act s.52(1)(q)) — keep provenance regardless.
- Priority act list for Phase 1 matches judiciary-exam demand — validate with 3–5 aspirant interviews during Phase 1.
- Indicative pricing (₹149 Plus / ₹399 Pro) is a hypothesis — test before Phase 5.
- Expo SDK streaming fetch supports SSE consumption on Android (verified pattern as of SDK 52+; confirm at Phase 3 implementation).
- Supabase MCP server is connected (use for migrations/queries at implementation); Figma MCP available for design work.

## Database Decisions

- Content tables public-read via RLS `anon SELECT`; user tables owner-only; admin via JWT `app_role` claim.
- `law_mappings` = section→section edge table (1→many/many→1); bidirectional via indexes; `v_mapping_lookup` view.
- Search = SQL function `search_sections(q, scope)` exposed via RPC to both clients (not an HTTP API route).
- Migrations immutable; expand→migrate→contract; content corrections are data ops with errata provenance.
- `act_sections` carries `body_md` (canonical) + generated `fts` + `embedding` columns.
- App offline store: expo-sqlite (downloaded acts + local FTS + write queue), MMKV for prefs; conflict policy = last-write-wins + preserved "conflicted copy".

## API Decisions

- Data CRUD: supabase-js direct from both clients (no API tier). Server surfaces only: `POST /api/v1/ai/*` (SSE), payment webhooks, health, admin actions — hosted in `apps/web`.
- `/v1` is expand-only once the app ships (store-review lag means old binaries live long); `x-nexlex-client` header + `min_supported_version` forced-upgrade mechanism.
- Uniform result contract `{ ok, data | error: { code, message } }`; codes in `packages/shared/error-codes`.

## Important Conversations / Directives

- 2026-07-13 — **Founder: "this is an app I will launch for Android"**; website also planned; founder delegated the folder/repo structure decision → we chose monorepo-in-this-folder (ADR-9) and Android-first (ADR-8). Web = SEO/marketing now, full app later.
- 2026-07-13 — Founding master prompt: docs-first workflow, six living documents, docs = definition of done, full feature vision, SOLID/Clean Architecture bar, AI prompt architecture separation, challenge weak decisions, long-term maintainability over speed.

## Future Ideas (parking lot — not scope)

- iOS app (same codebase); full interactive web app; Hindi + regional language layer; OLED-black theme; MCQ/test-series with All-India rank; moot-court appellate mode; state amendments layer; judgment summarizer; institutional licensing; community study groups; WhatsApp daily-section bot; push-notification revision nudges (expo-notifications, Phase 2+ candidate).

## Technical Debt

- None yet. (Record with: date, what, why accepted, planned payoff phase.)

## TODO List (near-term, actionable)

1. Scaffold monorepo: pnpm-workspace + turbo.json; `apps/mobile` (create-expo-app, expo-router, NativeWind, TS strict), `apps/web` (create-next-app, Tailwind, shadcn/ui), `packages/{shared,tokens,db}`.
2. Implement `packages/tokens` from design.md §2–4 (light/dark), wire NativeWind + Tailwind presets; bundle fonts.
3. Supabase: create/link project, local CLI stack, `0001_create_profiles.sql` (RLS + signup trigger), generate types into `packages/db`. *(Cloud project creation needs founder cost confirmation via Supabase MCP.)*
4. App auth flows (email OTP + Google native) + onboarding + tab shell; exemplar profile-edit feature using shared schema.
5. EAS: configure project, dev client, internal distribution build on a physical device.
6. CI workflow (all workspaces) + Vercel deploy of web placeholder.
7. Verify founder's Play developer account status (new personal → 12-tester rule) — affects launch runway.
8. Phase 1 prep: source official texts for the 8 priority acts; locate authoritative IPC⇄BNS mapping source material for human review.

## Priority Queue (order of execution)

Phase 0 remainder (TODO 1–6, with 7 in parallel) → Phase 1. No out-of-phase work authorized.

## Recent Changes

- 2026-07-13 — **v0.2.0 docs sweep — Android-first pivot**: architecture.md rewritten (monorepo, Expo, EAS, offline SQLite, ADR-8…10); prd.md, design.md, rules.md, phases.md updated in sync.
- 2026-07-13 — Created /docs six (v0.1.0); git repo initialized; founding commit `66843f9`.

## Lessons Learned

- (Populate at each phase close — include estimate vs. actual.)
