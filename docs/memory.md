# NexLex — Project Memory

> **Status**: Living document — the project's persistent brain. · **Last updated**: 2026-07-13
> Read this first when resuming work after any interruption. Update it whenever anything important changes. Keep newest items at the top of each list.

---

## Current Status

- **Phase**: Phase 0 — Foundation. **Scaffold delivered and verified**; four items remain before Phase 0 exit (see TODO 1–4).
- **What runs today**: `pnpm install` → all 5 workspaces typecheck; `@nexlex/shared` 16 unit tests pass; web builds (102 kB first-load); Android JS bundle exports through Metro. App runs in "unconfigured mode" (shell + auth screens render; auth actions show a friendly error) until Supabase keys exist.
- **Stack as built**: Expo SDK 57 / RN 0.86 / React 19.2.3 (app) · Next.js 15 / Tailwind 3.4 (web) · pnpm 11 (hoisted) + Turborepo · TS 5.9 strict everywhere.
- **Next action**: TODO 1 (Supabase cloud project — needs founder cost confirmation via Supabase MCP), then live auth verification, EAS device build, Vercel deploy.

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

- None known. Serif font family referenced by `AppText serif` isn't bundled yet — silently falls back to system font until fonts land (Phase 0 TODO 4; cosmetic).

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

- 2026-07-13 — Founder: Android-first launch; folder strategy delegated → monorepo (ADR-9). "Proceed" given for Phase 0 scaffold.
- 2026-07-13 — Founding master prompt: docs-first, six living documents = definition of done, challenge weak decisions, long-term maintainability.

## Future Ideas (parking lot — not scope)

- iOS app; full web app; Hindi layer; OLED-black theme; MCQ test series; moot-court mode; state amendments; judgment summarizer; institutional licensing; study groups; WhatsApp daily-section bot; push revision nudges.

## Technical Debt

- 2026-07-13 — `lint` scripts are typecheck placeholders (no ESLint configs yet). Accepted to keep scaffold velocity; payoff: Phase 0 exit polish (TODO 4). Risk: low (strict TS catches most; conventions enforced in review).
- 2026-07-13 — No error boundaries/logger util in apps yet (screens handle their own errors). Payoff: Phase 0 exit polish.
- 2026-07-13 — `packages/db` types are hand-written placeholders until Supabase project exists.

## TODO List (near-term, actionable)

1. **Supabase cloud project** (needs founder cost confirmation via Supabase MCP) → apply migration 0001 → `gen:types` → fill `apps/mobile/.env` + `apps/web/.env.local` → verify OTP sign-in → onboarding → profile edit on device/emulator; add RLS cross-user integration test.
2. **Device build (local-first strategy, 2026-07-13)**: founder has Android Studio + physical phone → daily dev via `npx expo run:android` (unlimited local builds, hot reload). `eas init` still wanted eventually for release builds + managed Play signing credentials, but NOT a Phase 0 blocker anymore.
3. **Vercel**: connect repo, deploy apps/web (staging + production).
4. **Polish to exit Phase 0**: bundle fonts (expo-font: Source Serif 4, Inter; next/font on web), real ESLint configs (expo config + next config), error boundary + logger conventions, Maestro smoke flow.
5. Verify founder's Play developer account status (12-tester rule — launch runway).
6. Phase 1 prep: source official act texts (8 priority acts); locate authoritative IPC⇄BNS mapping source for human review.

## Priority Queue (order of execution)

TODO 1 → 2 → 3 → 4 (Phase 0 exit) → 5 in parallel → Phase 1. No out-of-phase work authorized.

## Recent Changes

- 2026-07-13 — **Browser verification pass**: web landing verified light+dark; app sign-in + tab shell verified via Expo web preview (mobile viewport). Three real bugs found and fixed: (1) unquoted "Source Serif 4" made the browser drop the `.font-serif` rule (preset now quotes font names); (2) hardcoded white-on-brand text was unreadable in dark mode → new `onBrand` token used by both apps; (3) AsyncStorage crashed expo-router's Node SSR on web → platform-conditional storage in the app's supabase client. `.claude/launch.json` added (web:3000, app-web-preview:8081).
- 2026-07-13 — **Phase 0 scaffold commit**: monorepo + both apps + packages + migration + CI, all green (typecheck ×5, tests 16/16, web build 102 kB, Metro bundle OK). ADR-11 recorded; docs v0.2.1 sync.
- 2026-07-13 — v0.2.0 docs sweep — Android-first pivot (ADR-8…10).
- 2026-07-13 — Created /docs six (v0.1.0); repo initialized (`66843f9`).

## Lessons Learned

- 2026-07-13 — Scaffold-time reality beats plan-time assumptions: Expo SDK 57 shipped a different template (src/app, native tabs, React Compiler) than the SDK 54 the plan assumed — checking the generated code before wiring styling avoided shipping an unverified NativeWind dependency (became ADR-11). Generalize: verify generated scaffolds before layering choices made on paper.
- 2026-07-13 — pnpm 11 gates dependency build scripts (`allowBuilds` in workspace yaml) — remember for future native deps.
