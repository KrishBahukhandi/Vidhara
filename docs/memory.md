# NexLex — Project Memory

> **Status**: Living document — the project's persistent brain. · **Last updated**: 2026-07-13
> Read this first when resuming work after any interruption. Update it whenever anything important changes. Keep newest items at the top of each list.

---

## Current Status

- **Phase**: Phase 0 — Foundation (see phases.md).
- **Done so far**: All six living documents created (prd, architecture, design, rules, phases, memory). No application code exists yet.
- **Next action**: Initialize git repo → scaffold Next.js 15 + TypeScript strict + Tailwind + shadcn/ui per architecture.md §4 → implement design tokens → Supabase setup (`profiles` migration, RLS, auth).

## Completed Features

- 2026-07-13 — Documentation foundation (the /docs six) — pre-implementation.

## Pending Features (by phase — details in phases.md)

- Phase 0 (rest): scaffold, tokens, Supabase + auth, app shell, CI/CD, exemplar feature.
- Phase 1: Bare Acts Library, ingestion pipeline, search, IPC⇄BNS / CrPC⇄BNSS / IEA⇄BSA mapping.
- Phase 2: bookmarks, notes, progress, data export.
- Phase 3: AI Legal Tutor v1 + MVP launch.
- Phases 4–8: case law, news, payments/offline, drafting, trial simulator, admin/hardening.

## Known Bugs

- None (no code yet).

## Design Decisions

- 2026-07-13 — Design language: "quiet library with a sharp mind" — serif (Source Serif 4) for statute reading, Inter for UI, warm-paper light theme + charcoal dark theme, brass accent used sparingly. (design.md)
- 2026-07-13 — Mobile-first with bottom tab bar (Library · Mapping · Tutor · Notes · Profile); desktop sidebar is the enhancement.
- 2026-07-13 — Mapping change-types get dedicated semantic colors + icons (never color alone).

## Architectural Decisions (ADR index — full text in architecture.md §16)

- ADR-1 Next.js monolith (App Router, RSC) — SEO + one deploy.
- ADR-2 Supabase (Postgres + RLS + Auth + Storage) as the only backend service.
- ADR-3 PWA-first; native apps deferred.
- ADR-4 Postgres FTS + pgvector before any dedicated search/vector infra.
- ADR-5 Anthropic Claude primary AI provider behind an `AIProvider` interface (sonnet-5 for reasoning, haiku-4-5 for cheap tasks).
- ADR-6 Law-mapping data is human-curated with provenance; AI assists authoring only.
- ADR-7 Prompts versioned as code files + `prompt_versions` DB registry; every AI message stores its prompt version.

## Important Assumptions (verify when they matter)

- Bare act texts from India Code / official gazettes are public domain (Copyright Act s.52(1)(q)) — confirmed standard position; keep provenance anyway.
- Priority act list for Phase 1 (BNS/BNSS/BSA/IPC/CrPC/IEA/Constitution/Contract) matches judiciary-exam demand — validate with 3–5 aspirant interviews during Phase 1.
- Indicative pricing (₹149 Plus / ₹399 Pro monthly) is a hypothesis, not committed — test before Phase 5.
- Estimates in phases.md assume solo dev + AI assistance; recalibrate after Phase 1 actuals.
- Supabase MCP server is connected for this project (use it for migrations/queries when implementation starts); Figma MCP available for design work.

## Database Decisions

- Content tables public-read via RLS `anon SELECT`; all user tables owner-only; admin via JWT `app_role` claim.
- `law_mappings` = section→section edge table (supports 1→many/many→1); bidirectional via indexes, `v_mapping_lookup` view.
- Migrations immutable, expand→migrate→contract for breaking changes; content corrections are data ops with errata provenance, never migrations.
- `act_sections` carries both `body_md` (canonical) and generated `fts` + `embedding` columns.

## API Decisions

- RSC direct reads for content; Server Actions for user mutations; Route Handlers only for streaming AI (SSE), search, webhooks. All under `/api/v1`.
- Uniform result contract `{ ok, data | error: { code, message } }`; error codes centralized.

## Important Conversations / Directives

- 2026-07-13 — Founding master prompt received: docs-first workflow, six living documents, docs = definition of done, full feature vision (trial simulator, mapping, tutor, drafting, etc.), quality bar (SOLID/Clean Architecture), AI prompt architecture separation (system/developer/context/memory/user/guardrails/validation). This document set implements that directive.
- Standing rule from founder prompt: never mark a task complete until docs are synchronized; challenge weak architecture; think long-term maintainability.

## Future Ideas (parking lot — not scope)

- Hindi + regional language content layer; OLED-black theme; MCQ/test-series with All-India rank; moot-court appellate mode; state amendments layer; judgment summarizer; institutional licensing; community study groups; notes marketplace (needs policy thought); WhatsApp daily-section bot for retention.

## Technical Debt

- None yet. (Record with: date, what, why accepted, planned payoff phase.)

## TODO List (near-term, actionable)

1. `git init` + initial commit of docs (Conventional Commits from the start).
2. Scaffold Next.js app per architecture.md §4 folder structure.
3. Implement design tokens (`src/styles/tokens.css`) from design.md §2–4; wire Tailwind theme; self-host fonts.
4. Supabase: create project (or link existing), local CLI stack, `0001_create_profiles.sql` with RLS + signup trigger.
5. Auth flows (email OTP + Google) + onboarding screens + app shell.
6. CI workflow + Vercel deploy (staging/production).
7. Decide Sentry + PostHog project setup timing (Phase 0 exit at latest).
8. During Phase 1 prep: source and verify official texts for the 8 priority acts; locate authoritative IPC⇄BNS mapping source material for the human-review pipeline.

## Priority Queue (order of execution)

Phase 0 remainder (TODO 1–7) → Phase 1. No out-of-phase work is currently authorized.

## Recent Changes

- 2026-07-13 — Created /docs six: prd.md v0.1.0, architecture.md v0.1.0 (ADR-1…7), design.md v0.1.0, rules.md v0.1.0, phases.md v0.1.0, memory.md (this file). Project state: documentation complete, zero code.

## Lessons Learned

- (Populate at each phase close — include estimate vs. actual.)
