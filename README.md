# NexLex

**The AI-powered legal ecosystem for India** — bare acts, old⇄new criminal law mapping (IPC⇄BNS · CrPC⇄BNSS · Evidence⇄BSA), AI legal tutoring, drafting, and courtroom trial simulation — built for law students, judiciary aspirants, and advocates.

> ⚖️ NexLex explains law for learning — it is not legal advice.

## Status

**Phase 0 — Foundation.** Documentation complete; application scaffold in progress. See [docs/phases.md](docs/phases.md) for the current phase and [docs/memory.md](docs/memory.md) for live project state.

## Documentation (start here)

The `/docs` folder is the source of truth and is maintained with the same rigor as code. **Read before contributing; update alongside every change.**

| Document | Purpose |
|---|---|
| [docs/prd.md](docs/prd.md) | Product requirements: vision, users, features, MVP scope, roadmap |
| [docs/architecture.md](docs/architecture.md) | System architecture, stack, database, AI pipeline, ADRs |
| [docs/design.md](docs/design.md) | Design system: tokens, typography, components, states, a11y |
| [docs/rules.md](docs/rules.md) | Engineering rulebook (binding) |
| [docs/phases.md](docs/phases.md) | Phase plan with exit criteria — the project always knows its phase |
| [docs/memory.md](docs/memory.md) | Persistent project memory: status, decisions, TODOs |

## Stack (summary)

Next.js 15 (App Router, TypeScript strict) · Tailwind + shadcn/ui · Supabase (Postgres + RLS, Auth, Storage) · Anthropic Claude (AI features) · PWA (offline) · Vercel.

Full rationale in [docs/architecture.md](docs/architecture.md).

## Development

```bash
# prerequisites: Node 20+, pnpm, Supabase CLI
pnpm install
pnpm dev
```

(Environment setup details land with the Phase 0 scaffold — see `.env.example` once created.)

## Definition of Done

A change is complete only when code, tests, and **all affected documents in /docs** are updated together. See [docs/rules.md](docs/rules.md) §12.
