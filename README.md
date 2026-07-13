# NexLex

**The AI-powered legal ecosystem for India** — bare acts, old⇄new criminal law mapping (IPC⇄BNS · CrPC⇄BNSS · Evidence⇄BSA), AI legal tutoring, drafting, and courtroom trial simulation — built for law students, judiciary aspirants, and advocates.

> ⚖️ NexLex explains law for learning — it is not legal advice.

**This repository is the entire NexLex platform (monorepo):** the **Android app is the primary product** (launching on the Play Store), and the website lives alongside it sharing the same backend, types, and design tokens. iOS ships later from the same codebase.

## Status

**Phase 0 — Foundation.** Documentation complete (incl. the Android-first architecture pivot, ADR-8…10); monorepo scaffold is next. See [docs/phases.md](docs/phases.md) for the current phase and [docs/memory.md](docs/memory.md) for live project state.

## Repository layout

```
apps/mobile      # PRIMARY: Android app — Expo (React Native), expo-router, token theme
apps/web         # Next.js — marketing + SEO act/mapping pages + admin + API (AI, webhooks)
packages/shared  # Zod schemas, domain types, constants, section-ref parser
packages/tokens  # Design tokens (single source) → app theme module + web Tailwind preset
packages/db      # Generated Supabase types + client factories
supabase/        # SQL migrations + seed (shared backend)
docs/            # Living documentation — the source of truth
```

## Documentation (start here)

The `/docs` folder is maintained with the same rigor as code. **Read before contributing; update alongside every change.**

| Document | Purpose |
|---|---|
| [docs/prd.md](docs/prd.md) | Product requirements: vision, users, features, MVP scope, roadmap |
| [docs/architecture.md](docs/architecture.md) | System architecture, stack, database, AI pipeline, ADRs |
| [docs/design.md](docs/design.md) | Design system: tokens, typography, components, states, a11y |
| [docs/rules.md](docs/rules.md) | Engineering rulebook (binding) |
| [docs/phases.md](docs/phases.md) | Phase plan with exit criteria — the project always knows its phase |
| [docs/memory.md](docs/memory.md) | Persistent project memory: status, decisions, TODOs |

## Stack (summary)

**App**: Expo SDK 57 (React Native 0.86) · expo-router · typed token theme · expo-sqlite (offline, Phase 5) · EAS → Play Store.
**Web**: Next.js 15 (App Router, RSC/ISR) · Tailwind (shared token preset) · Vercel.
**Shared**: TypeScript strict everywhere · pnpm + Turborepo · Supabase (Postgres + RLS, Auth, Storage, pgvector) · Anthropic Claude (AI features, server-side only) · Razorpay (Phase 5).

Full rationale and ADRs in [docs/architecture.md](docs/architecture.md).

## Development

```bash
# prerequisites: Node 20+, pnpm, Supabase CLI, EAS CLI (for app builds)
pnpm install
pnpm dev            # turbo: runs app (Expo) + web (Next.js) dev servers
```

(Environment setup details land with the Phase 0 scaffold — see `.env.example` once created.)

## Definition of Done

A change is complete only when code, tests, and **all affected documents in /docs** are updated together. See [docs/rules.md](docs/rules.md) §12.
