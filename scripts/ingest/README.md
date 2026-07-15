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
# 1. Parse an official Gazette act PDF (word-coordinate extraction is canonical):
pdftotext -bbox act.pdf act.xhtml
pnpm --filter @nexlex/ingest ingest parse-gazette act.xhtml --meta bundles/<act>-meta.json --out bundles/<act>.json
#    (also accepts `pdftotext -layout` text — heuristic fallback, drift-prone)

# 2. Structural validation (no credentials needed; runs in CI via `pnpm test`)
pnpm --filter @nexlex/ingest ingest validate bundles/<act>.json

# 3a. Upsert to Supabase — review_status=draft by default (invisible to clients)
pnpm --filter @nexlex/ingest ingest publish bundles/<act>.json
#     after human review: make it publicly readable
pnpm --filter @nexlex/ingest ingest publish bundles/<act>.json --status published --publish-act

# 3b. Or emit reviewable SQL (chunked upserts; apply via any service-role channel)
pnpm --filter @nexlex/ingest ingest emit-sql bundles/<act>.json --out out.sql --status published --publish-act
```

### Gazette parser notes (learned on BNS/BNSS/BSA 2023 — two different PDF producers)

`gazette-bbox.ts` is the canonical, **producer-independent** path. Design (do not regress these):

- **Line grouping by baseline (yMax), not top edge (yMin).** Marginal notes and italic/emphasis
  runs are smaller type on the same printed line — they share a baseline but have a larger yMin.
  Grouping by yMin scattered them into phantom lines (this broke BNSS entirely). `gazette-common.ts`
  holds the shared section/chapter assembly state machine.
- **Note side is per page, decided by evidence.** Recto pages note right, verso left. A page is
  right-note when it has more right-note lines than left-note lines (statutory citations like
  "45 of 1860." are excluded — they appear in the right column on both sides; the digital-signature
  certificate block is excluded by stopping at the end sentinel).
- **Always extract the right column** (x ≥ ~484, past the body's right edge) regardless of page
  side — a section's note occasionally sits on the right even on a left-note page.
- **Bare-number section starts**: "262." alone on a line (long note pushed the body down) is a valid
  start; the plausibility guard (strictly increasing, ≤20 jump) rejects stray list numbers.
- Also handles: kerned headings ("CHAPTERI"), missing space after the number ("192.Whoever"),
  note overflow past the next start (period-sealing), the drop-cap enactment formula ("B E it
  enacted"), furniture/signature blocks.

`gazette-pdf.ts` (-layout text) is a heuristic fallback only — character-grid columns drift.

**Old codes (pre-2023): `gazette-inline.ts` (`--inline` flag).** IPC 1860, CrPC 1973, Evidence
Act 1872 have no marginal-note column — the title is a run-in heading:
`302. Punishment for murder.—Whoever commits murder…`. The inline parser drops footnotes and
superscript markers by font height (< 8.6pt; body is 9–10pt), strips amendment brackets
(`[34. …` for inserted sections), starts after the "…enacted as follows" formula (skipping the
ARRANGEMENT OF SECTIONS table of contents), and splits the title at the first `.—`/`.–` — with a
first-period fallback for repealed sections (`Definition of "Queen". Omitted by the A. O. 1950.`)
and a never-empty guarantee. Run with:

    pdftotext -bbox act.pdf act.xhtml
    ingest parse-gazette act.xhtml --meta bundles/<act>-meta.json --out bundles/<act>.json --inline

Source PDFs for the old codes came from the Internet Archive Wayback Machine (CDX API) because
indiacode.nic.in is unreachable from some networks; note this environment caps downloads at 1 MiB.

Bundles in `bundles/` are the **artifacts of record** for proofreading. Known residue after the
2023-codes ingestion: ~40 sections across the three acts have multi-line marginal-note TITLES with
wrap/word-order artifacts (bodies are correct). Upserts key on (act_id, number) so re-publishing
preserves section ids — bookmarks and mappings survive.

Publishing at scale (531-section BNSS) was done via a temporary secret-gated Supabase edge function
(`ingest-publish`, redeploy → POST bundles → tombstone to 410) to keep the service-role key
server-side; `emit-sql` is the reviewable-SQL alternative for smaller acts.

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
