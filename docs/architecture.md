# NexLex — Technical Architecture

> **Status**: Living document · **Version**: 0.1.0 · **Last updated**: 2026-07-13
> Any change to system design, APIs, database, or infrastructure MUST be reflected here in the same task.

---

## 1. Architecture Principles

1. **Boring technology, few moving parts** — one web app, one database, one AI provider behind an abstraction. Optimize for a small team shipping for years.
2. **Content is relational, not blobs** — acts, sections, and mappings are first-class rows so search, linking, citation validation, and AI grounding all query the same truth.
3. **AI is grounded or it doesn't ship** — every AI feature retrieves from our own content DB and validates citations post-generation.
4. **Client is untrusted** — all authorization via Postgres RLS + server-side checks; AI keys and prompts never reach the browser.
5. **Offline-tolerant by design** — PWA shell, cache-first content reads, queued writes.
6. **Every layer replaceable** — repository pattern for data, provider interface for AI, so Supabase/Anthropic are choices, not handcuffs.

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (PWA)                             │
│  Next.js App Router · React Server Components · Service Worker  │
│  IndexedDB (offline acts/notes cache) · TanStack Query          │
└───────────────┬─────────────────────────────────────────────────┘
                │ HTTPS
┌───────────────▼─────────────────────────────────────────────────┐
│                 NEXT.JS SERVER (Vercel)                         │
│  ├── Server Components (content reads)                          │
│  ├── Server Actions (user mutations)                            │
│  ├── Route Handlers /api/v1/* (AI streaming, webhooks, search)  │
│  ├── Middleware (auth session refresh, rate-limit headers)      │
│  └── AI Service Layer (prompt assembly, guardrails, validation) │
└───────┬──────────────────────────┬──────────────────────────────┘
        │                          │
┌───────▼──────────────┐   ┌───────▼──────────────────────────────┐
│  SUPABASE            │   │  ANTHROPIC API                       │
│  ├── Postgres (+RLS) │   │  claude-sonnet-5 (tutor/sim/draft)   │
│  ├── Auth (OTP,OAuth)│   │  claude-haiku-4-5 (classify/cheap)   │
│  ├── Storage (files) │   └──────────────────────────────────────┘
│  ├── pg FTS + pgvector   ┌──────────────────────────────────────┐
│  └── Edge Functions   │  │  RAZORPAY (Phase 5) · webhooks       │
└──────────────────────┘   └──────────────────────────────────────┘
```

Supporting services: Vercel Analytics + self-hosted-friendly product analytics (PostHog), Sentry (errors), Upstash Redis (rate limiting + hot cache) — added only when the phase requires them.

## 3. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15+ (App Router), TypeScript strict** | RSC = fast content reads + SEO for acts/mapping pages (acquisition channel); one deployable |
| UI | **Tailwind CSS + shadcn/ui + Radix** | Accessible primitives, design-system friendly (see design.md) |
| State/data | **TanStack Query** (client) + Server Components (server) | Cache + offline-friendly mutations |
| Database | **Supabase Postgres** | RLS auth model, FTS, pgvector, storage, generous free tier |
| Auth | **Supabase Auth** — email OTP + Google OAuth | OTP suits Indian users (no password culture); Google covers rest |
| Search | **Postgres FTS (tsvector, pg_trgm)** now; Typesense/Meilisearch later if needed | Zero extra infra at MVP scale |
| Vector/RAG | **pgvector** embeddings of sections | Same DB = same RLS/backup story |
| AI | **Anthropic Claude** via server-side AI service layer | Best legal reasoning; streaming; prompt caching |
| Offline | **Serwist (service worker) + IndexedDB** | PWA install + offline reader |
| Payments | **Razorpay** (Phase 5) | UPI-first Indian market |
| Hosting | **Vercel** (app) + Supabase cloud (data) | Zero-ops |
| Errors/Monitoring | **Sentry** + Vercel/Supabase dashboards | |
| Analytics | **PostHog** (EU/self-host option, DPDP-friendly config) | |
| Testing | **Vitest** (unit) + **Playwright** (e2e) + **Testing Library** | |
| Lint/format | **ESLint + Prettier**, CI-enforced | |

## 4. Folder Structure

```
NexLex/
├── docs/                       # Living documentation (this folder)
├── public/                     # Static assets, PWA manifest, icons
├── scripts/                    # Content ingestion & maintenance scripts
│   └── ingest/                 #   act parsers, mapping importers
├── supabase/
│   ├── migrations/             # SQL migrations (numbered, immutable)
│   └── seed/                   # Seed data (dev fixtures)
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (marketing)/        #   landing, pricing, about (public)
│   │   ├── (app)/              #   authenticated app shell
│   │   │   ├── acts/           #   /acts, /acts/[slug], /acts/[slug]/[section]
│   │   │   ├── mapping/        #   /mapping (IPC⇄BNS etc.)
│   │   │   ├── tutor/          #   AI tutor chat
│   │   │   ├── notes/ bookmarks/ profile/ ...
│   │   ├── api/v1/             #   route handlers (ai, search, webhooks)
│   │   └── admin/              #   admin dashboard (role-gated)
│   ├── components/
│   │   ├── ui/                 #   shadcn primitives (generated)
│   │   └── <feature>/          #   feature components
│   ├── features/               # Feature modules (domain logic per feature)
│   │   └── <feature>/{actions,queries,schemas,types}.ts
│   ├── lib/
│   │   ├── supabase/           #   client/server/admin clients
│   │   ├── ai/                 #   AI service layer (see §10)
│   │   ├── search/             #   search query builders
│   │   └── utils/
│   ├── config/                 # constants, feature flags, plans/quotas
│   └── styles/
├── tests/                      # e2e (Playwright); unit tests live beside source
└── .github/workflows/          # CI
```

**Rule**: domain logic lives in `src/features/*`, never in components or route files. Route files orchestrate; features implement. (Enforced by rules.md.)

## 5. Database Design

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

- `law_mappings` is a section→section edge table; 1→many and many→1 supported naturally (multiple rows). A single composite view `v_mapping_lookup` serves bidirectional queries.
- `act_sections.embedding` powers RAG retrieval; refreshed by ingestion pipeline, never at request time.
- All user tables FK to `auth.users` via `profiles.id`; `ON DELETE CASCADE` for DPDP deletion compliance.

### 5.3 Database rules (summary; full rules in rules.md)

- Every schema change = one immutable migration in `supabase/migrations`, applied via CLI/MCP, never hand-edited in dashboard.
- RLS enabled on **every** table; content tables get `SELECT` for `anon`, write for service role only.
- No business logic in triggers except: `updated_at` touch, `profiles` auto-create on signup, quota counters.

## 6. Authentication & Authorization

- **AuthN**: Supabase Auth. Email OTP (primary), Google OAuth (secondary). Session = HTTP-only cookies via `@supabase/ssr`; middleware refreshes tokens.
- **AuthZ layers**:
  1. Postgres RLS — source of truth for data access.
  2. Server-side plan/quota checks in the AI service layer (`profiles.plan` + `ai_usage_daily`).
  3. Admin: `app_role` claim (`admin|editor`) set via custom access token hook; admin routes verify claim server-side; RLS policies check JWT claim for admin tables.
- Anonymous users: can read acts/mapping (SEO + acquisition); any save/AI action prompts sign-in.

## 7. Caching Strategy

| Layer | What | TTL/strategy |
|---|---|---|
| CDN/ISR | Act & section pages, mapping pages (public, SEO) | ISR: revalidate on content publish (tag-based) |
| TanStack Query | User data (bookmarks, notes) | stale-while-revalidate, optimistic updates |
| Service Worker | App shell, fonts, downloaded acts | Cache-first; downloads stored in IndexedDB |
| Anthropic prompt caching | System prompt + act context blocks | Reduces AI cost ~50–80% on tutor traffic |
| Upstash Redis (when added) | Rate-limit counters, hot mapping lookups | Phase 3+ |

## 8. Search Architecture

1. **Structured query parser** first: `"302 ipc"`, `"bns 103"`, `"s. 420"` → direct section resolution (regex + abbreviation table).
2. **Postgres FTS** over `act_sections.fts` (weighted: marginal_note A, body B) with `pg_trgm` fallback for typos.
3. **Ranking**: exact section number > marginal note match > body match; boost priority acts.
4. API: `GET /api/v1/search?q=&scope=all|act:<slug>` returns typed result union (section | act | mapping).
5. Upgrade path: if FTS latency/relevance fails targets at scale → Typesense sidecar, same API contract.

## 9. API Design

- **Reads** (content): React Server Components query Supabase directly — no API hop.
- **Mutations** (user data): Next.js Server Actions per feature (`src/features/*/actions.ts`), Zod-validated input, typed results `{ ok, data | error }`.
- **Route Handlers** (`/api/v1/*`) only where RSC/actions don't fit:
  - `POST /api/v1/ai/tutor` — SSE streaming chat
  - `GET  /api/v1/search`
  - `POST /api/v1/webhooks/razorpay` (Phase 5)
- **Conventions**: versioned prefix `/v1`; JSON error envelope `{ error: { code, message, details? } }`; kebab-case paths; idempotency keys on payment-adjacent endpoints; every handler rate-limited.

## 10. AI Services Architecture

### 10.1 AI Service Layer (`src/lib/ai/`)

```
ai/
├── provider.ts        # AIProvider interface + AnthropicProvider impl (streaming, retries, timeouts)
├── prompts/           # versioned prompt builders per feature
│   ├── tutor.v1.ts    #   exports {system, developer, buildContext, params, version}
│   └── ...
├── context.ts         # Context Builder: RAG retrieval (structured lookup → FTS → vector), token budgeter
├── memory.ts          # conversation windowing + summarization for long chats
├── guardrails.ts      # pre-flight: input classification (off-topic, advice-seeking, abuse)
├── validate.ts        # post-flight: citation validator (checks act+section against DB), schema validation for structured outputs
├── quota.ts           # plan-based quota check/decrement (ai_usage_daily)
└── log.ts             # usage logging (tokens, latency, prompt_version)
```

### 10.2 Prompt architecture (per master pattern)

Every AI feature separates: **System Prompt** (identity, safety, output contract) · **Developer Prompt** (feature-specific instructions) · **Context Builder** (retrieved sections/mappings, token-budgeted) · **Memory** (windowed history + rolling summary) · **User Prompt** (sanitized) · **Guardrails** (pre-classification) · **Output Validation** (citation check + schema) — assembled server-side only.

### 10.3 Grounding & citation validation flow (Tutor)

```
user msg → guardrails.classify (haiku)
        → context.retrieve: parse explicit citations → fetch those sections;
          else hybrid retrieve (FTS + pgvector) top-k within token budget
        → assemble prompt (cached system block + context + memory + user)
        → stream from claude-sonnet-5
        → validate.citations: extract [Act §N] refs, verify against act_sections;
          invalid → strip/flag + append correction notice
        → persist ai_messages (+ citations jsonb, tokens, version) → decrement quota
```

### 10.4 Prompt versioning, testing, evaluation

- Prompts live in code (`prompts/*.vN.ts`) AND are registered in `prompt_versions` table; `ai_messages.prompt_version` links every output to its prompt.
- Golden-set eval per feature (`tests/ai-evals/`): fixed question sets with expected citation sets / rubric; run before activating a new prompt version.
- `ai_feedback` (👍/👎) feeds weekly eval review; hallucination reports are P0 bugs.

### 10.5 Model tiering & cost control

| Task | Model |
|---|---|
| Tutor/simulator/drafting generation | claude-sonnet-5 |
| Input classification, titles, tagging | claude-haiku-4-5 |
| Answer evaluation (structured rubric) | claude-sonnet-5 |

Controls: per-plan daily quotas; hard per-user daily token cap; prompt caching for system+context blocks; max_tokens bounded per feature; circuit breaker → friendly degradation when provider errors spike.

## 11. Security

- Transport: HTTPS everywhere; HSTS.
- Secrets: Vercel env vars only; `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` server-only; CI secret scanning.
- Input: Zod validation at every boundary (actions, route handlers); output encoding via React; markdown rendered through sanitizer (rehype-sanitize) — user notes and AI output both.
- Injection: parameterized queries only (supabase-js/postgres); prompt-injection defenses: context clearly delimited, instructions-in-content ignored by system prompt contract, retrieved text treated as data.
- Headers: CSP (no unsafe-inline where possible), X-Frame-Options DENY, Referrer-Policy strict-origin.
- Rate limiting (see §14) + basic bot protection on auth/AI routes.
- DPDP compliance: consent record at signup, data export endpoint, cascade deletion, no PII in analytics events, PII redaction before sending user text to AI logs.
- Dependency hygiene: lockfile, Renovate/Dependabot, `npm audit` in CI.

## 12. Logging, Monitoring, Error Handling

- **Errors**: Sentry (client + server), release-tagged; error boundaries per route group with branded fallback (design.md §states).
- **Server logs**: structured JSON (`level, event, userId?, feature, durationMs`); no PII in logs; Vercel log drains later.
- **AI observability**: every call logged to `ai_messages`/usage tables → admin dashboard charts (cost/day, latency P95, flag rate).
- **Uptime**: external ping on `/api/v1/health` (checks DB + auth reachability).
- **Error handling standard** (rules.md): expected failures return typed results; unexpected throw → boundary; user-facing messages are human, actionable, never raw.

## 13. Rate Limiting

| Surface | Limit (initial) |
|---|---|
| Auth endpoints | 5/min/IP |
| Search API | 30/min/user |
| AI tutor | plan quota/day + 10/min burst |
| General actions | 60/min/user |

Implementation: sliding window; in-memory per-instance at MVP → Upstash Redis when >1 region/instance. Responses use 429 + `Retry-After`.

## 14. Deployment & Environments

- **Environments**: `local` (supabase CLI local stack) → `staging` (Vercel preview + Supabase branch) → `production`.
- **CI (GitHub Actions)**: typecheck → lint → unit tests → build → Playwright smoke (on PR); migration dry-run against shadow DB.
- **CD**: merge to `main` → Vercel production deploy; migrations applied via Supabase migration step before deploy promotion.
- **Rollback**: Vercel instant rollback; migrations must be backward-compatible one release back (expand → migrate → contract pattern).

## 15. Data Flow — key sequences

### 15.1 Read a section (anonymous, SEO path)
```
Browser → CDN (ISR hit? serve) → RSC render → supabase (anon, RLS SELECT)
       → HTML + cache tags → subsequent visits: service-worker cache
```

### 15.2 Mapping lookup
```
Input "IPC 302" → parser → act_sections(IPC, "302") → law_mappings (indexed both directions)
→ join target sections → side-by-side render with change_summary
```

### 15.3 Tutor message (authenticated)
```
Client (stream UI) → POST /api/v1/ai/tutor → auth + quota check → guardrails
→ context builder (DB retrieval) → Anthropic stream → SSE to client
→ post-stream: citation validation patch event → persist + log
```

### 15.4 Offline note edit
```
Edit → IndexedDB queue (if offline) → SW background sync on reconnect
→ server action upsert (updated_at conflict: last-write-wins + local copy preserved)
```

## 16. Infrastructure Decisions (ADR summary)

| # | Decision | Status | Why (short) |
|---|---|---|---|
| ADR-1 | Next.js monolith over separate SPA+API | ✅ | SEO for content pages, one deploy, RSC perf |
| ADR-2 | Supabase over self-managed Postgres/Firebase | ✅ | RLS model, SQL truth, low ops; Firebase's NoSQL poor fit for relational legal content |
| ADR-3 | PWA-first, native later | ✅ | One codebase to MVP; installability + offline adequate for reading/tutor |
| ADR-4 | Postgres FTS before dedicated search engine | ✅ | Corpus is small (~50K sections); avoid infra until relevance data justifies |
| ADR-5 | Anthropic Claude as primary AI provider | ✅ | Reasoning quality for law; provider interface keeps optionality |
| ADR-6 | Mapping data human-curated, AI-assisted only in authoring | ✅ | Category-defining accuracy requirement |
| ADR-7 | Prompts versioned as code + DB registry | ✅ | Reproducibility of every AI output |

New ADRs are appended here with date + rationale; superseded ADRs are struck through, never deleted.

## 17. Future Scaling Strategy

- **10K MAU**: current architecture as-is; add Upstash rate limiting.
- **100K MAU**: read-heavy content → ISR + CDN carries it; add Redis hot cache for mapping lookups; Supabase compute upgrade; move analytics to dedicated pipeline.
- **1M MAU**: extract search to Typesense; AI gateway service (queueing, batching, multi-provider); read replicas; consider extracting ingestion/admin into separate deployment; native apps consume same `/api/v1`.
- Signals to act, not dates: search P95 > 300 ms, DB CPU > 60% sustained, AI queue latency > 2 s.

---

*Change log*
- 2026-07-13 · v0.1.0 · Initial architecture defined (pre-implementation). ADR-1…7 recorded.
