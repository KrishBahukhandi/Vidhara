-- A schedule that is a NUMBERED LIST, grouped into named lists.
--
-- Revert strategy: drop table act_schedule_entries. act_schedules is shared
-- with 0011 and stays.
--
-- The Constitution's Seventh Schedule is the motivating case, and by some
-- distance the most looked-up thing in that document: three Lists — Union,
-- State, Concurrent — of the subjects Parliament and the State Legislatures
-- may legislate on. Every question about who may make a law on a given subject
-- is answered by an entry number in one of them.
--
-- WHY NOT act_schedule_articles (0011). That table was built for the Limitation
-- Act and is shaped hard around its three columns: description, period and
-- commencement are all NOT NULL, and its key is (schedule, number). This
-- schedule has ONE column of text and repeats its numbering in each List —
-- entry 1 is defence in List I, public order in List II and criminal law in
-- List III — so that key collides three ways and two of three columns would be
-- stored empty. The same reasoning D-036 used to keep the Limitation Schedule
-- out of act_sections, applied once more.
--
-- The PARENT is shared, though: an entry-shaped schedule is still an
-- act_schedules row, so one act can carry both kinds and the reader reaches
-- both at /acts/<act>/schedule/<slug>.

create table public.act_schedule_entries (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.act_schedules (id) on delete cascade,

  -- The List this entry belongs to, as printed: "I", "Union List".
  list_number text not null,
  list_title text not null,
  -- Printed order of the Lists themselves, so I precedes II precedes III.
  list_order int not null,

  -- As printed: "1", "2A", "92C".
  number text not null,
  sort_key numeric not null,
  -- The entry's text. Amendment brackets and the print's omission asterisks
  -- ("* * * * * *]") are kept as set — an omitted entry is a fact about the
  -- List, and dropping it would silently renumber nothing while making the gap
  -- unexplained.
  body text not null,

  fts tsvector generated always as (to_tsvector('english', coalesce(body, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Numbering restarts in each List, so the List is part of the key.
  unique (schedule_id, list_number, number)
);

create index act_schedule_entries_schedule_idx
  on public.act_schedule_entries (schedule_id, list_order, sort_key);
create index act_schedule_entries_fts_idx
  on public.act_schedule_entries using gin (fts);

create trigger act_schedule_entries_touch_updated_at
  before update on public.act_schedule_entries
  for each row execute function public.touch_updated_at();

alter table public.act_schedule_entries enable row level security;

-- Entries inherit their schedule's visibility, exactly as 0011's articles do:
-- one gate, so a published entry can never outlive an unpublished schedule.
create policy "schedule_entries_read_published"
  on public.act_schedule_entries for select
  to anon, authenticated
  using (exists (
    select 1
    from public.act_schedules s
    join public.acts a on a.id = s.act_id
    where s.id = act_schedule_entries.schedule_id
      and s.review_status = 'published'
      and a.published_at is not null
  ));
