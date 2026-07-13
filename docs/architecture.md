# NexLex — Technical Architecture

> **Status**: Living document · **Version**: 0.2.0 · **Last updated**: 2026-07-13
> Any change to system design, APIs, database, or infrastructure MUST be reflected here in the same task.
> **v0.2.0 pivot**: Android-first native launch; this repository is now a monorepo (Android app + web + shared packages). See ADR-8…10.

---

## 1. Architecture Principles

1. **Boring technology, few moving parts** — one repo, one database, one AI provider behind an abstraction, one language (TypeScript) across app, web, and server. Optimize for a small team shipping for years.
2. **Content is relational, not blobs** — acts, sections, and mappings are first-class rows so search, linking, citation validation, and AI grounding all query the same truth.
3. **AI is grounded or it doesn't ship** — every AI feature retrieves from our own content DB and validates citations post-generation.
4. **Clients are untrusted** — all authorization via Postgres RLS + server-side checks; AI keys and prompts never reach app or browser.
5. **Offline-tolerant by design** — the Android app treats connectivity as optional for reading: downloaded acts in on-device SQLite, queued writes, cache-first UX.
6. **Every layer replaceable** — repository pattern for data, provider interface for AI, so Supabase/Anthropic/Expo are choices, not handcuffs.

## 2. System Architecture

```
┌───────────────────────────────┐    ┌──────────────────────────────────┐
│  ANDROID APP  (primary)       │    │  WEB  (apps/web)                 │
│  Expo / React Native · TS     │    │  Next.js 15 (App Router, RSC)    │
│  expo-router · token theme    │    │  marketing site + SEO act/mapping│
│  TanStack Query · SQLite      │    │  pages + admin → full web app    │
│  (offline acts)               │    │  later                           │
└──────────────┬────────────────┘    └────────────────┬─────────────────┘
               │  supabase-js (RLS-guarded data, auth) │
               │  HTTPS /api/v1 (AI SSE, secrets-side) │
       ┌───────▼───────────────────────────────────────▼───────┐
       │   SERVER LAYER — Next.js server (Vercel, in apps/web) │
       │   ├── /api/v1/* route handlers: AI streaming, search  │
       │   │   orchestration, payment webhooks, health         │
       │   ├── Server Actions + RSC (web app surfaces)         │
       │   └── AI Service Layer (prompts, guardrails,          │
       │       citation validation, quotas, logging)           │
       └───────┬──────────────────────────┬────────────────────┘
               │                          │
┌──────────────▼───────┐   ┌──────────────▼───────────────────────┐
│  SUPABASE            │   │  ANTHROPIC API                       │
│  ├── Postgres (+RLS) │   │  claude-sonnet-5 (tutor/sim/draft)   │
│  ├── Auth (OTP,OAuth)│   │  claude-haiku-4-5 (classify/cheap)   │
│  ├── Storage         │   └──────────────────────────────────────┘
│  ├── FTS + pgvector  │   ┌──────────────────────────────────────┐
│  └── Edge Functions  │   │  RAZORPAY (Phase 5) · webhooks       │
└──────────────────────┘   └──────────────────────────────────────┘
```

**Client–backend contract (ADR-10)**: both clients speak to Supabase **directly** via supabase-js for auth and RLS-guarded data (acts, bookmarks, notes, progress) — no API hop, works identically offline-queued. The Next.js server layer exists **only** for operations requiring server secrets or orchestration: AI calls, payment webhooks, admin mutations, and cross-cutting search orchestration. Search itself is a Postgres function exposed via RPC, callable from both clients.

Supporting services (added only when their phase requires): Sentry (app + web + server), PostHog (product analytics), Upstash Redis (rate limiting at scale), EAS (build/submit/update for the app).

## 3. Technology Stack

### 3.1 Android app (`apps/mobile`) — primary surface
| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Expo (React Native), TypeScript strict** | TS end-to-end; shared schemas/types with web+server; EAS build pipeline; OTA JS updates |
| Navigation | **expo-router** (file-based) | Mirrors Next.js mental model; typed routes; deep links (`nexlex://acts/bns/103`) |
| Styling | **Typed theme module** (`src/theme`) reading `@nexlex/tokens` + RN StyleSheet (ADR-11) | Same token values as web; zero styling-runtime dependencies |
| Data | **supabase-js + TanStack Query** (persisted cache) | Direct RLS data access; offline-friendly caching |
| Offline store | **expo-sqlite** (downloaded acts, search index) + **MMKV** (prefs) | Real offline reading, better than webview caches |
| Auth session | **AsyncStorage** persistence (Supabase's documented Expo pattern; session JSON exceeds SecureStore's 2KB item limit); Google native sign-in + email OTP | |
| AI streaming | `expo/fetch` streaming consumer of `/api/v1/ai/*` SSE | |
| Push (Phase 2+) | expo-notifications | Streaks, news digest |
| Distribution | **EAS Build → Play Console** (internal → closed → production tracks); **EAS Update** for OTA JS fixes | |

### 3.2 Web (`apps/web`)
| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15+ (App Router), TypeScript strict** | RSC + ISR for SEO on act/section/mapping pages — the acquisition engine; also hosts the server layer |
| UI | **Tailwind CSS + shadcn/ui + Radix**, tokens from `packages/tokens` | |
| Role now | Marketing + SEO content pages (read-only reader, mapping lookup) + admin | Full interactive web app grows here post-MVP |

### 3.3 Shared platform
| Layer | Choice | Rationale |
|---|---|---|
| Monorepo | **pnpm workspaces + Turborepo** | Shared packages, one CI, atomic cross-cutting changes |
| Shared code | `packages/shared` (Zod schemas, types, constants, plans/quotas, error codes, section-ref parser), `packages/tokens` (design tokens: `tokens.cjs` source → typed theme module on app, Tailwind preset + generated CSS vars on web), `packages/db` (generated Supabase types, client factories) | Single source of truth consumed by app, web, server |
| Database | **Supabase Postgres** (RLS, FTS, pgvector, Storage) | |
| Auth | **Supabase Auth** — email OTP (primary) + Google | OTP suits Indian users; Google native on Android |
| Search | **Postgres FTS (tsvector, pg_trgm)** via RPC; Typesense later if metrics demand | |
| Vector/RAG | **pgvector** embeddings of sections | Same DB = same backup/RLS story |
| AI | **Anthropic Claude** via server-side AI service layer | Best legal reasoning; streaming; prompt caching |
| Payments | **Razorpay** (Phase 5) — UPI-first; Play Billing implications tracked in Phase 5 design | |
| Hosting | Vercel (web+server) · Supabase cloud (data) · EAS (app builds) | Zero-ops |
| Testing | **Vitest** (unit, all packages) · **Playwright** (web e2e) · **Maestro** (app flows) | |
| Errors/analytics | Sentry (RN + Next) · PostHog | |

## 4. Folder Structure (monorepo)

```
NexLex/                            # ← this repo = the whole platform (ADR-9)
├── docs/                          # Living documentation (this folder)
├── apps/
│   ├── mobile/                    # PRIMARY: Android app (Expo / React Native)
│   │   ├── app/                   #   expo-router routes
│   │   │   ├── (auth)/            #     sign-in, otp, onboarding
│   │   │   └── (tabs)/            #     library/ mapping/ tutor/ notes/ profile/
│   │   ├── src/
│   │   │   ├── components/        #   RN components (ui/ + per-feature)
│   │   │   ├── features/          #   app-side feature logic (queries, mutations)
│   │   │   └── lib/               #   supabase client, offline (sqlite), analytics
│   │   ├── assets/                #   fonts, icons, splash
│   │   └── app.json · eas.json
│   └── web/                       # Next.js: marketing + SEO content + admin + server layer
│       └── src/
│           ├── app/
│           │   ├── (marketing)/   #   landing, pricing
│           │   ├── acts/ mapping/ #   SEO read-only content pages (ISR)
│           │   ├── admin/         #   role-gated admin
│           │   └── api/v1/        #   AI SSE, webhooks, health
│           ├── components/
│           ├── features/
│           └── lib/ai/            #   AI service layer (server-only; see §10)
├── packages/
│   ├── shared/                    # Zod schemas, domain types, constants, error codes,
│   │                              # plans/quotas, section-ref parser ("302 IPC" → ref)
│   ├── tokens/                    # design tokens (tokens.cjs) → tailwind preset (web),
│   │                              # generated CSS vars, typed theme module source (app)
│   └── db/                        # supabase generated types + typed client factories
├── supabase/
│   ├── migrations/                # numbered, immutable SQL migrations
│   └── seed/
├── scripts/ingest/                # act parsers, mapping importers (run with service role)
├── turbo.json · pnpm-workspace.yaml · package.json
└── .github/workflows/             # CI
```

**Rules**: domain logic lives in `features/*` (per app) with all validation schemas imported from `packages/shared` — never duplicated. Components never import supabase clients directly. New top-level folders require an ADR. (Enforced by rules.md.)

## 5. Database Design

*(Unchanged by the v0.2.0 client pivot — the database is client-agnostic by design.)*

### 5.1 Schema overview (MVP tables)

**Content (public-read, admin-write):**

```sql
acts            (id, slug, title, short_title, abbreviation, year, category,
                 status[active|repealed|replaced], replaced_by_act_id,
                 enactment_date, enforcement_date, source_url, version, published_at)
act_chapters    (id, act_id, number, title, part_number, part_title, sort_order)
act_sections    (id, act_id, chapter_id, number,           -- "302", "34A"
                 sort_key,                                   -- numeric ordering key
                 marginal_note,                              -- section title
                 body_md,                                    -- canonical text (markdown)
                 body_plain,                                 -- for FTS
                 fts tsvector GENERATED,                     -- GIN indexed
                 embedding vector(1536),                     -- pgvector, for RAG
                 is_repealed, effective_from, version)
law_mappings    (id, source_section_id → act_sections, target_section_id → act_sections,
                 mapping_type[identical|renumbered|modified|expanded|merged|split|new|omitted],
                 change_summary_md, review_status[draft|reviewed|published],
                 reviewed_by, provenance)                    -- bidirectional lookups via indexes both ways
```

**Users (RLS: owner-only unless stated):**

```sql
profiles        (id → auth.users, display_name, role[student|aspirant|advocate|professor|other],
                 exam_targets text[], avatar_url, onboarded_at, plan[free|plus|pro],
                 plan_expires_at, created_at)
bookmarks       (id, user_id, section_id → act_sections, folder_id?, created_at)
bookmark_folders(id, user_id, name, sort_order)
notes           (id, user_id, title, content_md, section_id?,   -- optional anchor
                 act_id?, tags text[], updated_at)
progress        (user_id, act_id, sections_read int, last_section_id, streak fields on profiles)
```

**AI (RLS: owner-only; logs admin-readable):**

```sql
ai_conversations(id, user_id, feature[tutor|simulator|drafting], title, created_at)
ai_messages     (id, conversation_id, role[user|assistant|system_note],
                 content_md, citations jsonb,                -- validated citations
                 prompt_version, model, input_tokens, output_tokens,
                 latency_ms, flagged, created_at)
ai_usage_daily  (user_id, date, feature, message_count, tokens)   -- quota enforcement
prompt_versions (id, feature, version, system_prompt, developer_prompt,
                 params jsonb, active, created_at, notes)     -- prompts are data
ai_feedback     (id, message_id, user_id, rating[up|down], reason, created_at)
```

**Platform (later phases):** `subscriptions`, `payments`, `news_articles`, `case_laws`, `drafts`, `trial_sessions`, `trial_turns`, `audit_logs`, `feature_flags` — designed when their phase begins; documented here at that time.

### 5.2 Key relationships

- `law_mappings` is a section→section edge table; 1→many and many→1 supported naturally (multiple rows). A composite view `v_mapping_lookup` serves bidirectional queries.
- `act_sections.embedding` powers RAG retrieval; refreshed by ingestion pipeline, never at request time.
- All user tables FK to `auth.users` via `profiles.id`; `ON DELETE CASCADE` for DPDP deletion compliance.

### 5.3 Database rules (summary; full rules in rules.md)

- Every schema change = one immutable migration in `supabase/migrations`, applied via CLI/MCP, never hand-edited in dashboard.
- RLS enabled on **every** table; content tables get `SELECT` for `anon`, write for service role only.
- No business logic in triggers except: `updated_at` touch, `profiles` auto-create on signup, quota counters.

## 6. Authentication & Authorization

- **AuthN**: Supabase Auth. Email OTP (primary), Google (native sign-in on Android via ID-token flow; OAuth on web). App sessions persisted in expo-secure-store; web sessions in HTTP-only cookies via `@supabase/ssr`.
- **Deep links**: `nexlex://` scheme + Android App Links for OAuth callbacks and shared section links.
- **AuthZ layers**:
  1. Postgres RLS — source of truth for data access.
  2. Server-side plan/quota checks in the AI service layer (`profiles.plan` + `ai_usage_daily`).
  3. Admin: `app_role` claim (`admin|editor`) via custom access token hook; admin surfaces (web only) verify claim server-side; RLS policies check the claim for admin tables.
- Anonymous users: app allows browsing acts/mapping without account (sign-in prompted on save/AI); web content pages fully public (SEO).

## 7. Caching & Offline Strategy

| Layer | What | Strategy |
|---|---|---|
| App: TanStack Query + persister | All reads | stale-while-revalidate; cache survives restarts |
| App: SQLite (`expo-sqlite`) | Downloaded acts (premium), recently-read sections, pending write queue | Cache-first reader; background sync of queued writes on reconnect |
| App: MMKV | Prefs, reader settings, quota snapshot | |
| Web: CDN/ISR | Act/section/mapping pages | Tag-based revalidation on content publish |
| Anthropic prompt caching | System prompt + act context blocks | Cuts tutor cost 50–80% |
| Upstash Redis (when added) | Rate-limit counters, hot mapping lookups | Phase 3+ |

Conflict policy for offline edits: last-write-wins on `updated_at` with the losing local copy preserved as a local-only "conflicted copy" note — user text is never silently discarded.

## 8. Search Architecture

1. **Structured query parser** (in `packages/shared`, used by both clients): `"302 ipc"`, `"bns 103"`, `"s. 420"` → direct section resolution (regex + abbreviation table).
2. **Postgres FTS** over `act_sections.fts` (weighted: marginal_note A, body B) with `pg_trgm` typo fallback — implemented as a SQL function `search_sections(q, scope)` exposed via **RPC** to both clients.
3. **Ranking**: exact section number > marginal note > body; boost priority acts.
4. **Offline search** (app): downloaded acts get a local SQLite FTS index; app merges local results when offline.
5. Upgrade path: if FTS latency/relevance fails targets at scale → Typesense sidecar behind the same RPC/API contract.

## 9. API Design

- **Data reads/writes**: supabase-js direct from clients (RLS-guarded) — both app and web. Web content pages read via RSC server client.
- **Server surfaces** (`apps/web`), only where secrets/orchestration demand:
  - `POST /api/v1/ai/tutor` — SSE streaming chat (app + web clients)
  - `POST /api/v1/webhooks/razorpay` (Phase 5)
  - `GET  /api/v1/health`
  - Server Actions for web-app and admin mutations
- **Conventions**: versioned prefix `/v1`; JSON error envelope `{ error: { code, message, details? } }` with codes from `packages/shared/error-codes`; mobile clients send `x-nexlex-client: android/<version>` for observability and forced-upgrade support; idempotency keys on payment-adjacent endpoints; every handler rate-limited; API changes must remain backward-compatible with the oldest supported app version (store review lag — expand-only within `/v1`).

## 10. AI Services Architecture

### 10.1 AI Service Layer (`apps/web/src/lib/ai/` — server-only)

```
ai/
├── provider.ts        # AIProvider interface + AnthropicProvider impl (streaming, retries, timeouts)
├── prompts/           # versioned prompt builders per feature
│   ├── tutor.v1.ts    #   exports {system, developer, buildContext, params, version}
│   └── ...
├── context.ts         # Context Builder: RAG retrieval (structured lookup → FTS → vector), token budgeter
├── memory.ts          # conversation windowing + summarization for long chats
├── guardrails.ts      # pre-flight: input classification (off-topic, advice-seeking, abuse)
├── validate.ts        # post-flight: citation validator (checks act+section against DB), schema validation
├── quota.ts           # plan-based quota check/decrement (ai_usage_daily)
└── log.ts             # usage logging (tokens, latency, prompt_version)
```

### 10.2 Prompt architecture

Every AI feature separates: **System Prompt** (identity, safety, output contract) · **Developer Prompt** (feature-specific instructions) · **Context Builder** (retrieved sections/mappings, token-budgeted) · **Memory** (windowed history + rolling summary) · **User Prompt** (sanitized) · **Guardrails** (pre-classification) · **Output Validation** (citation check + schema) — assembled server-side only. Neither client ever sees prompts or keys.

### 10.3 Grounding & citation validation flow (Tutor)

```
user msg → guardrails.classify (haiku)
        → context.retrieve: parse explicit citations → fetch those sections;
          else hybrid retrieve (FTS + pgvector) top-k within token budget
        → assemble prompt (cached system block + context + memory + user)
        → stream from claude-sonnet-5 → SSE to app/web client
        → validate.citations: extract [Act §N] refs, verify against act_sections;
          invalid → strip/flag + correction event appended to stream
        → persist ai_messages (+ citations jsonb, tokens, version) → decrement quota
```

### 10.4 Prompt versioning, testing, evaluation

- Prompts live in code (`prompts/*.vN.ts`) AND are registered in `prompt_versions`; `ai_messages.prompt_version` links every output to its prompt.
- Golden-set eval per feature (`tests/ai-evals/`): fixed question sets with expected citation sets / rubric; must pass before activating a new prompt version.
- `ai_feedback` (👍/👎) feeds weekly eval review; hallucination reports are P0 bugs.

### 10.5 Model tiering & cost control

| Task | Model |
|---|---|
| Tutor/simulator/drafting generation | claude-sonnet-5 |
| Input classification, titles, tagging | claude-haiku-4-5 |
| Answer evaluation (structured rubric) | claude-sonnet-5 |

Controls: per-plan daily quotas; hard per-user daily token cap; prompt caching; bounded max_tokens per feature; circuit breaker → friendly degradation when provider errors spike (app keeps full library function).

## 11. Security

- Transport: HTTPS everywhere; certificate pinning considered for app in Phase 8.
- Secrets: Vercel env vars only; `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` server-only; the app binary contains only the publishable anon key; CI secret scanning. Android signing keys live in EAS credentials, never in repo.
- Input: Zod validation (from `packages/shared`) at every boundary; markdown rendered through sanitizer on both clients (user notes and AI output).
- Injection: parameterized queries only; prompt-injection defenses: context clearly delimited, instructions-in-content ignored per system prompt contract, retrieved text treated as data.
- Web headers: CSP, X-Frame-Options DENY, Referrer-Policy strict-origin.
- Rate limiting (§13) + basic bot protection on auth/AI routes.
- DPDP compliance: consent record at signup, data export, cascade deletion, no PII in analytics events, PII minimization in AI logs.
- Dependency hygiene: lockfile, Renovate, `pnpm audit` in CI.

## 12. Logging, Monitoring, Error Handling

- **Errors**: Sentry — React Native SDK (app, with source maps via EAS) + Next.js SDK (web/server); release-tagged per app version.
- **Server logs**: structured JSON (`level, event, feature, durationMs`); no PII.
- **AI observability**: every call logged → admin dashboard charts (cost/day, latency P95, flag rate).
- **Client health**: app version distribution + forced-upgrade flag (`min_supported_version` served by `/api/v1/health`) so stale binaries can be gated gracefully.
- **Uptime**: external ping on `/api/v1/health` (checks DB + auth reachability).
- **Error handling standard** (rules.md §6): expected failures = typed results; unexpected = throw → boundary; user-facing messages human and actionable.

## 13. Rate Limiting

| Surface | Limit (initial) |
|---|---|
| Auth endpoints | 5/min/IP (Supabase built-in + our layer) |
| Search RPC | 30/min/user (Postgres-side guard) |
| AI tutor | plan quota/day + 10/min burst |
| General API | 60/min/user |

Implementation: sliding window; in-memory per-instance at MVP → Upstash Redis when >1 instance. 429 + `Retry-After`.

## 14. Deployment & Environments

- **Environments**: `local` (Expo dev client + supabase CLI local stack) → `staging` (EAS internal distribution + Vercel preview + Supabase branch) → `production` (Play Store + Vercel prod).
- **App pipeline**: EAS Build (AAB) → EAS Submit → Play Console tracks: internal → closed testing → production. Note: a new personal Play developer account requires a closed test with 12+ testers over 14 days before production access — plan this into Phase 3 launch runway. **EAS Update** delivers OTA JS-only fixes between store releases (within Play policy); native-module changes always go through a store build.
- **Web/CI (GitHub Actions)**: typecheck → lint → unit tests (all packages) → web build → Playwright smoke; migration dry-run against shadow DB; EAS build triggered on release tags.
- **Rollback**: Vercel instant rollback; EAS Update rollback for JS regressions; staged rollout percentages on Play for native releases; migrations backward-compatible one release (expand → migrate → contract).

## 15. Data Flow — key sequences

### 15.1 Read a section (app)
```
Tap section → TanStack cache hit? render → else supabase-js SELECT (anon/user, RLS)
→ render + persist to query cache → if act downloaded: SQLite is source, network skipped
```

### 15.2 Read a section (web, anonymous SEO path)
```
Googlebot/browser → CDN (ISR hit? serve) → RSC render → supabase (anon SELECT) → HTML
```

### 15.3 Mapping lookup (both clients)
```
Input "IPC 302" → shared parser → act_sections(IPC,"302") → law_mappings (both directions)
→ join targets → side-by-side render with change_summary
```

### 15.4 Tutor message (app)
```
App (SSE consumer) → POST /api/v1/ai/tutor (supabase JWT) → auth + quota → guardrails
→ context builder (DB retrieval) → Anthropic stream → SSE chunks → citation-validation
patch event → persist + log → app renders CitationLinks (deep links into library)
```

### 15.5 Offline note edit (app)
```
Edit → write to SQLite queue (offline) → connectivity listener → replay queue via
supabase-js upsert → updated_at conflict: last-write-wins + local "conflicted copy" kept
```

## 16. Infrastructure Decisions (ADR log)

| # | Decision | Status | Why (short) |
|---|---|---|---|
| ~~ADR-1~~ | ~~Next.js monolith over separate SPA+API~~ | ⛔ superseded by ADR-8/9 (2026-07-13) | Held only while web was the sole client |
| ADR-2 | Supabase over self-managed Postgres/Firebase | ✅ | RLS model, SQL truth, low ops; NoSQL poor fit for relational legal content |
| ~~ADR-3~~ | ~~PWA-first, native later~~ | ⛔ superseded by ADR-8 (2026-07-13) | Founder decision: Android launch is the product |
| ADR-4 | Postgres FTS before dedicated search engine | ✅ | Corpus ~50K sections; avoid infra until relevance data justifies |
| ADR-5 | Anthropic Claude primary AI provider behind `AIProvider` interface | ✅ | Legal reasoning quality; optionality preserved |
| ADR-6 | Mapping data human-curated; AI assists authoring only | ✅ | Category-defining accuracy requirement |
| ADR-7 | Prompts versioned as code + DB registry | ✅ | Reproducibility of every AI output |
| ADR-8 | **Android-first native launch, built with Expo (React Native)** | ✅ 2026-07-13 | Play Store is the dominant discovery/distribution channel for Indian students; native gives real offline (SQLite), push notifications, and low-end-device performance. Expo over Flutter: TypeScript end-to-end shares Zod schemas, types, tokens, and skills with web+server (Dart would fork the codebase; Flutter web is SEO-hostile). Expo over TWA/Capacitor wrapper: webview offline and perf are inadequate for the reading-heavy core. iOS later from the same codebase. |
| ADR-9 | **Single monorepo in `NexLex/`** (pnpm + Turborepo): `apps/mobile`, `apps/web`, `packages/*` — no sibling website folder | ✅ 2026-07-13 | Shared schemas/tokens/types with atomic cross-cutting commits; one docs set, one CI, one backend. Sibling repos would drift precisely where legal-domain correctness demands sync. |
| ADR-10 | Clients use supabase-js directly for RLS-guarded data; Next.js server hosts only secret-bearing surfaces (AI, webhooks, admin) | ✅ 2026-07-13 | Removes an entire API tier from the hot path; RLS is the authz truth anyway; smaller server = smaller attack surface and cost |
| ADR-11 | App styling via **typed theme module** (`apps/mobile/src/theme` reading `@nexlex/tokens`) + RN StyleSheet — **NativeWind dropped** | ✅ 2026-07-13 | Scaffold landed on Expo SDK 57 (RN 0.86); NativeWind compatibility with the new SDK is unverified and it adds a Babel/Metro styling runtime for ergonomics only. Direct token import gives the same single-source guarantee with zero extra dependencies; Tailwind (with the shared token preset) remains the web styling system. Revisit only if utility-class ergonomics become a measured velocity problem. |

New ADRs are appended with date + rationale; superseded ADRs are struck through, never deleted.

## 17. Future Scaling Strategy

- **10K MAU**: current architecture as-is; add Upstash rate limiting.
- **100K MAU**: content reads are client-cached + CDN (web); Redis hot cache for mapping lookups; Supabase compute upgrade.
- **1M MAU**: extract search to Typesense; AI gateway service (queueing, batching, multi-provider); read replicas; iOS app ships from same codebase; web app reaches feature parity.
- Signals to act, not dates: search P95 > 300 ms, DB CPU > 60% sustained, AI queue latency > 2 s, app-store review cycle blocking weekly iteration (→ heavier EAS Update usage).

---

*Change log*
- 2026-07-13 · v0.2.1 · Scaffold reality sync: Expo SDK 57 / RN 0.86 / React 19.2; ADR-11 (typed theme module replaces NativeWind on the app); auth session persistence via AsyncStorage (SecureStore 2KB limit).
- 2026-07-13 · v0.2.0 · **Android-first pivot**: monorepo (apps/mobile Expo + apps/web Next.js + packages), ADR-1/3 superseded, ADR-8/9/10 added; offline strategy moved to SQLite; deployment adds EAS/Play pipeline.
- 2026-07-13 · v0.1.0 · Initial architecture defined (pre-implementation). ADR-1…7 recorded.
