-- 0009_ai_explanations.sql
-- AI "Explain this section" (decision D-004, ADR-5). Two server-only tables,
-- written exclusively by the explain-section Edge Function (service role);
-- RLS enabled with NO anon policies so nothing is reachable from clients.
--
-- ai_explanations = the CACHE that makes this free at scale: a section's text
--   never changes, so it's explained once and served to everyone after. Keyed
--   by section; re-generation (model change) upserts.
-- ai_usage = a per-day generation counter (a global soft cap that protects the
--   free-tier quota from runaway/scripted generation). Cache hits don't count.
-- Revert: drop both tables.

create table public.ai_explanations (
  section_id uuid primary key references public.act_sections(id) on delete cascade,
  model text not null,
  explanation text not null,
  created_at timestamptz not null default now()
);
alter table public.ai_explanations enable row level security;
-- No policies: only the service-role Edge Function reads/writes this.

create table public.ai_usage (
  day date primary key,
  count integer not null default 0
);
alter table public.ai_usage enable row level security;
-- No policies: server-only.
