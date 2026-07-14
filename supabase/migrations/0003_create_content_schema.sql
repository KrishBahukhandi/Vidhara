-- 0003_create_content_schema.sql
-- Content core (architecture.md §5.1): acts, chapters, sections, law mappings,
-- FTS search RPC, bidirectional mapping lookup view.
-- Content is public-read (published only); ALL writes happen via service role
-- (ingestion pipeline) — no client write policies on purpose.
-- Revert strategy: drop view v_mapping_lookup, function search_sections,
-- tables law_mappings, act_sections, act_chapters, acts (in that order).

create extension if not exists pg_trgm;

-- ── acts ────────────────────────────────────────────────────────────────────
create table public.acts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  short_title text,
  abbreviation text not null unique, -- canonical, matches @nexlex/shared ACT_ABBREVIATIONS
  year int not null check (year between 1600 and 2100),
  category text not null default 'general',
  status text not null default 'active' check (status in ('active', 'repealed', 'replaced')),
  replaced_by_act_id uuid references public.acts (id),
  enactment_date date,
  enforcement_date date,
  source_url text,
  version int not null default 1,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger acts_touch_updated_at
  before update on public.acts
  for each row execute function public.touch_updated_at();

-- ── chapters ────────────────────────────────────────────────────────────────
create table public.act_chapters (
  id uuid primary key default gen_random_uuid(),
  act_id uuid not null references public.acts (id) on delete cascade,
  number text not null,
  title text not null,
  part_number text,
  part_title text,
  sort_order int not null,
  unique (act_id, number)
);

-- ── sections ────────────────────────────────────────────────────────────────
create table public.act_sections (
  id uuid primary key default gen_random_uuid(),
  act_id uuid not null references public.acts (id) on delete cascade,
  chapter_id uuid references public.act_chapters (id) on delete set null,
  number text not null,          -- as printed: "302", "34A"
  sort_key numeric not null,     -- numeric ordering: 302, 34.01 for 34A
  marginal_note text not null,
  body_md text not null,
  body_plain text not null,
  fts tsvector generated always as (
    setweight(to_tsvector('english', coalesce(marginal_note, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(body_plain, '')), 'B')
  ) stored,
  is_repealed boolean not null default false,
  effective_from date,
  version int not null default 1,
  review_status text not null default 'draft' check (review_status in ('draft', 'reviewed', 'published')),
  provenance text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (act_id, number)
);

create index act_sections_fts_idx on public.act_sections using gin (fts);
create index act_sections_act_sort_idx on public.act_sections (act_id, sort_key);
create index act_sections_marginal_trgm_idx on public.act_sections using gin (marginal_note gin_trgm_ops);

create trigger act_sections_touch_updated_at
  before update on public.act_sections
  for each row execute function public.touch_updated_at();

-- ── law mappings (section → section edge table; 1→many & many→1 natural) ────
create table public.law_mappings (
  id uuid primary key default gen_random_uuid(),
  source_section_id uuid not null references public.act_sections (id) on delete cascade,
  target_section_id uuid not null references public.act_sections (id) on delete cascade,
  mapping_type text not null check (mapping_type in
    ('identical', 'renumbered', 'modified', 'expanded', 'merged', 'split', 'new', 'omitted')),
  change_summary_md text,
  review_status text not null default 'draft' check (review_status in ('draft', 'reviewed', 'published')),
  reviewed_by text,
  provenance text,
  created_at timestamptz not null default now(),
  unique (source_section_id, target_section_id),
  check (source_section_id <> target_section_id)
);

create index law_mappings_source_idx on public.law_mappings (source_section_id);
create index law_mappings_target_idx on public.law_mappings (target_section_id);

-- ── RLS: published-only public reads; no client writes ──────────────────────
alter table public.acts enable row level security;
alter table public.act_chapters enable row level security;
alter table public.act_sections enable row level security;
alter table public.law_mappings enable row level security;

create policy "acts_read_published"
  on public.acts for select
  to anon, authenticated
  using (published_at is not null);

create policy "chapters_read_published"
  on public.act_chapters for select
  to anon, authenticated
  using (exists (
    select 1 from public.acts a
    where a.id = act_chapters.act_id and a.published_at is not null
  ));

create policy "sections_read_published"
  on public.act_sections for select
  to anon, authenticated
  using (
    review_status = 'published'
    and exists (
      select 1 from public.acts a
      where a.id = act_sections.act_id and a.published_at is not null
    )
  );

create policy "mappings_read_published"
  on public.law_mappings for select
  to anon, authenticated
  using (review_status = 'published');

-- ── bidirectional mapping lookup (security_invoker → RLS applies) ───────────
create view public.v_mapping_lookup
  with (security_invoker = true)
as
select
  m.id as mapping_id,
  m.mapping_type,
  m.change_summary_md,
  s.id  as source_section_id,
  sa.abbreviation as source_act,
  sa.slug as source_act_slug,
  s.number as source_number,
  s.marginal_note as source_marginal_note,
  t.id  as target_section_id,
  ta.abbreviation as target_act,
  ta.slug as target_act_slug,
  t.number as target_number,
  t.marginal_note as target_marginal_note
from public.law_mappings m
join public.act_sections s on s.id = m.source_section_id
join public.acts sa on sa.id = s.act_id
join public.act_sections t on t.id = m.target_section_id
join public.acts ta on ta.id = t.act_id;

-- ── search RPC (architecture.md §8) — SECURITY INVOKER so RLS filters rows ──
create or replace function public.search_sections(
  q text,
  scope_act text default null,   -- act slug to restrict to, or null = all
  max_results int default 20
)
returns table (
  section_id uuid,
  act_abbreviation text,
  act_slug text,
  number text,
  marginal_note text,
  snippet text,
  rank real
)
language sql
stable
as $$
  select
    s.id,
    a.abbreviation,
    a.slug,
    s.number,
    s.marginal_note,
    ts_headline('english', s.body_plain, websearch_to_tsquery('english', q),
                'MaxWords=18, MinWords=6, StartSel=**, StopSel=**'),
    ts_rank(s.fts, websearch_to_tsquery('english', q))
  from public.act_sections s
  join public.acts a on a.id = s.act_id
  where s.fts @@ websearch_to_tsquery('english', q)
    and (scope_act is null or a.slug = scope_act)
  order by ts_rank(s.fts, websearch_to_tsquery('english', q)) desc, s.sort_key
  limit least(greatest(max_results, 1), 50);
$$;
