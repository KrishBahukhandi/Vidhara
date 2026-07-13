# NexLex — Engineering Rulebook

> **Status**: Living document · **Version**: 0.2.0 · **Last updated**: 2026-07-13
> These rules are binding for all code written in this repository — by humans or AI. Violations found in review block merge. Rule changes require an entry in memory.md (Design/Architecture Decisions).

---

## 1. Coding Standards

- **TypeScript strict mode** everywhere; `noUncheckedIndexedAccess: true`. `any` is forbidden (use `unknown` + narrowing); `as` casts require a comment justifying why narrowing is impossible.
- ESLint + Prettier are law; CI fails on warnings. No `eslint-disable` without a justification comment.
- Functions do one thing; > ~40 lines is a smell, split it. Max nesting depth 3 — use early returns.
- No dead code, no commented-out code in commits. Delete it; git remembers.
- Prefer pure functions in `features/*`; side effects live at the edges (actions, route handlers).
- Comments explain **constraints and why**, never what the next line does.

## 2. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files (non-component) | kebab-case | `citation-validator.ts` |
| React components + files | PascalCase | `SectionReader.tsx` |
| Variables/functions | camelCase, verb-first for functions | `resolveSectionRef()` |
| Types/interfaces | PascalCase, no `I` prefix | `ActSection`, `MappingResult` |
| Constants | SCREAMING_SNAKE | `MAX_FREE_BOOKMARKS` |
| DB tables/columns | snake_case, plural tables | `act_sections.marginal_note` |
| Booleans | `is/has/can/should` prefix | `isRepealed` |
| Server actions | verb + noun | `createBookmark`, `evaluateAnswer` |
| Env vars | `NEXT_PUBLIC_` only if truly client-safe | `ANTHROPIC_API_KEY` (server-only) |
| Branches | `feat/`, `fix/`, `chore/`, `docs/` + kebab slug | `feat/mapping-comparator` |

Domain vocabulary is fixed: use `act`, `section`, `chapter`, `mapping`, `marginal_note` consistently — never synonyms (`statute`, `provision`) in identifiers.

## 3. Folder Conventions

- Structure defined in architecture.md §4 is canonical (monorepo: `apps/mobile`, `apps/web`, `packages/*`). New top-level folders and new workspace packages require an ADR.
- Validation schemas, domain types, constants, and the section-ref parser live **only** in `packages/shared` — apps import, never duplicate. Design token values live only in `packages/tokens`.
- Feature modules own their domain: `features/<feature>/{queries,mutations,schemas-reexport,types}`. Components never import supabase clients directly — they call feature queries/actions.
- `components/ui/` is only shadcn primitives + tokens-level atoms; feature components live in `components/<feature>/`.
- No barrel files (`index.ts` re-exports) except in `components/ui/icons`.
- Path aliases: `@/` = `src/`. No `../../..` imports.

## 4. Commit Standards

- **Conventional Commits**: `type(scope): summary` — types: `feat|fix|docs|refactor|test|chore|perf|ci`. Scope = feature or doc name (`feat(mapping): side-by-side comparator`).
- Imperative mood, ≤ 72-char subject, body explains *why* when non-obvious.
- One logical change per commit; docs updates that belong to a code change go **in the same commit**.
- Never commit: secrets, `.env*` (except `.env.example`), generated files, `node_modules`.
- Migrations and their revert plan noted in the commit body.

## 5. API Standards

- All external surface under `/api/v1/`; breaking changes require `/v2`, never mutate `/v1` semantics.
- Server actions and route handlers: **validate input with Zod at entry, always** — even "internal" ones.
- Response contract: success `{ ok: true, data }`; failure `{ ok: false, error: { code, message } }` (actions) or JSON error envelope + correct HTTP status (handlers). Error `code` values come from a central enum (`src/config/error-codes.ts`).
- Route handlers must set: rate limiting, auth check (or explicit `// public:` comment), and cache headers deliberately.
- No handler both reads request body and streams response without a documented reason.
- Idempotency: any endpoint with money or external side effects accepts an idempotency key.

## 6. Error Handling Standards

- Expected/domain failures (not found, quota exceeded, validation) → typed error results; **never throw for control flow**.
- Unexpected failures → throw; caught by route/segment error boundaries; reported to Sentry with context (feature, userId hash — no PII).
- Every `catch` either handles meaningfully or rethrows — no swallowing (`catch {}` is forbidden).
- User-facing error copy follows design.md §11: what happened, what to do, retry path.
- AI provider errors: retry ×2 with backoff for 5xx/timeouts, then degrade per feature (tutor: "try again" with preserved input; never lose user text).

## 7. Validation Standards

- Zod schemas are the single source of truth per feature (`features/*/schemas.ts`); infer TS types from schemas (`z.infer`), never duplicate by hand.
- Validate at every trust boundary: client form → action input → DB constraint. DB has real constraints (NOT NULL, CHECK, FK) — the schema is not just app-level.
- Content ingestion: dedicated validation pass (section numbering continuity, empty-body detection, orphan chapters) before publish.

## 8. Testing Standards

- Test pyramid: many unit (Vitest, colocated `*.test.ts`, all workspaces), some integration (feature logic against local Supabase), few end-to-end (Playwright for web, Maestro for app — critical journeys only).
- **Required per feature before "done"**: happy path, validation failure, authz failure (RLS: user A cannot read user B), edge cases listed in the phase checklist.
- AI features additionally require: golden-set eval run (architecture.md §10.4), citation-validator unit tests, guardrail bypass attempts (prompt-injection fixtures).
- Coverage is a signal, not a goal — but `features/*` logic ≥ 80% lines.
- No test hits the real Anthropic API in CI — provider is mocked via the `AIProvider` interface; evals run manually/scheduled with budget caps.
- Every bug fix ships with a regression test reproducing the bug.

## 9. Accessibility Rules

- Interactive = focusable = labeled. `eslint-plugin-jsx-a11y` on error level.
- Keyboard path tested for every new flow (tab order, escape closes overlays, focus trap in modals, focus restored on close).
- Color contrast AA verified for any new token pair before merge.
- `aria-live` for async results (search, AI streaming); loading skeletons have `aria-busy`.

## 10. Performance Rules

- **App**: cold start < 2 s on mid-range Android; AAB ≤ 40 MB; list screens use FlashList (never plain map-rendered lists); Hermes enabled; no synchronous storage on the render path; new native modules require justification (each one costs binary size + build complexity).
- **Web**: first-load JS ≤ 180 KB gzip per route (CI-enforced); content pages stay RSC-heavy (target ≤ 100 KB client JS); images via `next/image`.
- Fonts bundled/self-hosted variable subsets on both platforms.
- No client-side data waterfalls: parallel queries; RSC fetch on web.
- DB: every query used in a list view must have a supporting index; `EXPLAIN` any query touching `act_sections` beyond PK.
- Memoization only after measurement; premature `useMemo` is noise.

## 11. Security Rules

- RLS on **every** table, default-deny; new table PR must show its policies in the migration.
- Service-role client (`lib/supabase/admin.ts`) usable only in: ingestion scripts, webhooks, admin actions — imports elsewhere fail lint (custom rule/import boundary).
- All secrets server-side; adding a `NEXT_PUBLIC_` env var requires review comment confirming it is not sensitive.
- Sanitize all rendered markdown (user notes AND AI output) — rehype-sanitize allowlist.
- Auth checks in server code even where RLS also protects (defense in depth for actions doing multi-step logic).
- Never log: tokens, OTPs, full prompts containing user personal text (log message IDs instead).
- Prompt-injection: retrieved content and user text are always interpolated as clearly-delimited data blocks, never concatenated into instruction position.

## 12. Documentation Rules

- The `/docs` six (prd, architecture, design, rules, phases, memory) are **part of the definition of done** — a task is incomplete until affected docs are updated in the same commit.
- Each doc carries version + last-updated header and a change log footer.
- New architectural decision → ADR row in architecture.md §16. Superseded ADRs struck through, not deleted.
- Public functions in `lib/` and `features/` get JSDoc when behavior isn't obvious from types.
- No stale TODOs in code — TODOs live in memory.md's TODO list with context.

## 13. Database & Migration Rules

- Schema changes only via numbered SQL migrations in `supabase/migrations/`; migrations are immutable once merged — fix-forward only.
- Every migration: reversible strategy noted; backward-compatible one release (expand→migrate→contract for renames/drops).
- Naming: `NNNN_verb_object.sql` (`0003_add_law_mappings.sql`).
- No destructive migration (DROP/TRUNCATE on non-empty prod table) without a dated backup verification note in the PR.
- Seed data ≠ migrations: fixtures live in `supabase/seed/`.
- Content updates (act text corrections) are **data operations with provenance** (errata log), not migrations.

## 14. State Management Rules

- Server state = TanStack Query (or RSC); client state = component state; global client state only for: theme, reader prefs, command palette — via zustand slice ≤ 100 lines. Redux is banned.
- No server data duplicated into global stores. Query keys centralized per feature (`features/*/queries.ts`).
- Optimistic updates required for: bookmarks, notes save, feedback buttons; with rollback on failure.

## 15. Logging Rules

- Structured JSON server logs: `{ level, event, feature, durationMs, ...safeContext }`. Event names: `feature.action.outcome` (`tutor.message.completed`).
- Log levels: `debug` (local only), `info` (state changes), `warn` (degraded), `error` (failures). No `console.log` in committed code — lint-enforced; use the logger.
- Client: only errors + explicit analytics events; never ambient user behavior without consent flag.

## 16. Prompt Engineering Rules

- Prompts live in `src/lib/ai/prompts/<feature>.v<N>.ts` — versioned files, never edited in place after activation; changes = new version file + `prompt_versions` row.
- Structure per architecture.md §10.2 (system / developer / context / memory / user separation) is mandatory — no ad-hoc string concatenation of prompts outside the prompt builder.
- System prompts must include: role definition, jurisdiction lock (India), citation format contract, refusal policy (personal legal advice), uncertainty policy ("say when unsure"), output schema when structured.
- Context blocks are token-budgeted (per-feature max) and delimited with explicit markers; retrieval results include section IDs so outputs can cite verifiably.
- Every prompt version activated must have passed its golden-set eval; results linked in PR.

## 17. AI Safety Rules

- **No unvalidated legal citations reach the user**: post-generation citation validator is non-optional in every AI pipeline.
- Refusal behaviors (personal legal advice, ongoing-case strategy for laypersons, unethical requests) are tested with fixture prompts per release.
- Every AI surface carries the standing disclaimer (design.md §12) and 👍/👎 + "report" affordances.
- User content sent to the AI provider is minimized (only what the feature needs); no training opt-in assumptions; provider data-retention settings documented in memory.md when configured.
- Quotas and spend caps are enforced server-side before the provider call, never client-side only.
- Hallucination reports are triaged as P0 bugs (prd.md §17).

## 18. Refactoring Rules

- Refactors ship separately from behavior changes (distinct commits at minimum, distinct PRs preferred).
- No refactor without test coverage of the affected path first.
- Boy-scout rule applies within the files you touch; drive-by rewrites of unrelated modules are not allowed.

## 19. Dependency Rules

- Adding a dependency requires justification in the PR: what it does, why not stdlib/existing dep, weight, maintenance health (recent releases, downloads).
- Forbidden without explicit ADR: CSS-in-JS runtimes, moment.js (use date-fns), lodash full build, ORMs on top of supabase-js, any package requiring `--legacy-peer-deps`.
- Pin via lockfile; Renovate auto-PRs; majors reviewed manually.

## 20. Code Deletion Rules

- Deleting a feature = delete code + tests + docs references + DB deprecation plan (column/table marked, dropped one release later).
- Feature-flagged code dead > 2 releases must be removed.
- Never keep "just in case" branches of logic; git history is the archive.

## 21. Architecture Modification Rules

- Any change to: system topology, data flow, auth model, AI pipeline structure, or a §16 ADR → requires a new ADR entry + architecture.md update **before** implementation.
- Challenge-first: proposals must state the problem, ≥ 2 options considered, and why the chosen one wins on long-term maintainability.

---

*Change log*
- 2026-07-13 · v0.2.0 · Monorepo/Android-first updates: shared-package ownership rules (§3), app performance budgets + FlashList/Hermes rules (§10), Maestro added to test pyramid (§8).
- 2026-07-13 · v0.1.0 · Initial rulebook established.
