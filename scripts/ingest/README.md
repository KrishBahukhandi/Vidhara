# @nexlex/ingest — content ingestion pipeline

**parse → validate → review → publish** (phases.md Phase 1). Statutory text enters NexLex only
through this pipeline, with provenance recorded on every row (ADR-6: content is human-curated).

## The bundle format

An *act bundle* is a JSON file matching [`src/schema.ts`](src/schema.ts): act metadata + chapters +
sections with real statutory text. Source parsers (India Code HTML/PDF — to be written per source)
produce bundles; a human reviews the JSON against the official text; `publish` upserts it.

Placeholder bodies ("pending ingestion") and `dev-sample` provenance are **rejected** by
validation — bundles carry real, sourced text or nothing.

## Commands

```bash
# structural validation (no credentials needed; runs in CI via `pnpm test`)
pnpm --filter @nexlex/ingest ingest validate bundles/ica.json

# upsert to Supabase — lands as review_status=draft by default (invisible to clients)
pnpm --filter @nexlex/ingest ingest publish bundles/ica.json

# after human review: make sections publicly readable
pnpm --filter @nexlex/ingest ingest publish bundles/ica.json --status published --publish-act
```

## Credentials

`publish` needs env vars (e.g. in `scripts/ingest/.env`, which is gitignored — never commit):

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

The service-role key bypasses RLS. This package is the **only** sanctioned place for it outside
webhooks/admin actions (rules.md §11). Get it from Supabase dashboard → Project Settings → API.

## Visibility model

Content becomes publicly readable only when **both**: `act_sections.review_status = 'published'`
**and** the parent `acts.published_at` is set. Draft/reviewed rows are invisible to the app and
web (RLS), so you can stage and QA an entire act before flipping it live.

## Before the first real act lands

Purge the dev sample (see docs/memory.md TODO 0): the seed acts/sections/mappings carry
`dev-sample` provenance and placeholder bodies; real ingestion replaces them wholesale.
