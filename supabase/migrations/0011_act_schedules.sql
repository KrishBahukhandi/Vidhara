-- Schedules that are tables, not sectional text.
--
-- The Limitation Act's Schedule is the motivating case: 137 Articles, each a
-- row of (description, period, event the period runs from). It is the part of
-- that Act practitioners actually reach for, and it does not fit act_sections
-- — a "body" column would flatten three columns into prose and lose which
-- period belongs to which limb (D-035).
--
-- Kept separate from act_sections rather than bolted on, because the reader,
-- the citation form ("Article 137") and the rendering all differ.

create table public.act_schedules (
  id uuid primary key default gen_random_uuid(),
  act_id uuid not null references public.acts (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  title text not null,                 -- "The Schedule"
  subtitle text,                       -- "Periods of Limitation"
  authority_note text,                 -- "See sections 2(j) and 3"
  -- Column headings as printed, in order; rendered as the table header so the
  -- page reads like the statute rather than like our schema.
  column_labels text[] not null,
  sort_order int not null default 0,
  review_status text not null default 'draft'
    check (review_status in ('draft', 'reviewed', 'published')),
  provenance text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (act_id, slug)
);

create trigger act_schedules_touch_updated_at
  before update on public.act_schedules
  for each row execute function public.touch_updated_at();

create table public.act_schedule_articles (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.act_schedules (id) on delete cascade,
  number text not null,            -- as printed: "1", "137"
  sort_key numeric not null,
  division text,                   -- "First Division — Suits"
  part_number text,                -- "I"
  part_title text,                 -- "Suits Relating to Accounts"
  -- Faithful structure. Articles 114-116 carry lettered limbs with a period
  -- each, and 115 nests (i)/(ii) under a (b) that has none; flattening those
  -- into one cell produces text that reads as law but is not. Shape:
  --   [{ label?, description, period, commencement }]
  rows jsonb not null,
  -- Flattened projections of `rows`, for search and for one-line citation.
  -- Derived at publish time — never edited independently of `rows`.
  description text not null,
  period text not null,
  commencement text not null,
  fts tsvector generated always as (
    setweight(to_tsvector('english', coalesce(description, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(period, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(commencement, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, number)
);

create index act_schedule_articles_schedule_idx
  on public.act_schedule_articles (schedule_id, sort_key);
create index act_schedule_articles_fts_idx
  on public.act_schedule_articles using gin (fts);

create trigger act_schedule_articles_touch_updated_at
  before update on public.act_schedule_articles
  for each row execute function public.touch_updated_at();

-- ── RLS: published-only public reads; no client writes ──────────────────────
alter table public.act_schedules enable row level security;
alter table public.act_schedule_articles enable row level security;

create policy "schedules_read_published"
  on public.act_schedules for select
  to anon, authenticated
  using (
    review_status = 'published'
    and exists (
      select 1 from public.acts a
      where a.id = act_schedules.act_id and a.published_at is not null
    )
  );

-- Articles inherit their schedule's visibility: one gate, so a published
-- article can never outlive an unpublished schedule.
create policy "schedule_articles_read_published"
  on public.act_schedule_articles for select
  to anon, authenticated
  using (exists (
    select 1
    from public.act_schedules s
    join public.acts a on a.id = s.act_id
    where s.id = act_schedule_articles.schedule_id
      and s.review_status = 'published'
      and a.published_at is not null
  ));
