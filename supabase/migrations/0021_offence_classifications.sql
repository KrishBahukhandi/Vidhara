-- The First Schedule's classification of offences: cognizable, bailable, court.
--
-- Revert strategy: drop view v_offence_classifications, then drop table
-- offence_classifications.
--
-- This is the one fact a bare-act reader cannot get from the section's own
-- text, and the first thing anyone asks after "what does this section say?".
-- It decides whether the police may arrest without a warrant, whether bail is
-- a matter of right, and which court the case goes to.
--
-- NOTE THE TWO ACTS. A classification is printed in the First Schedule of the
-- PROCEDURAL code and is about a section of the SUBSTANTIVE one: the BNSS's
-- schedule classifies BNS sections, the CrPC's classifies IPC sections. Both
-- are recorded, because a reader arrives at the BNS section page and the
-- provenance belongs to the BNSS.
--
-- Kept out of act_sections for the reason D-036 kept the Limitation Act's
-- Schedule out and D-068 kept the CPC's Orders out: this is a table about a
-- section, not a section, and one row can cover a sub-section ("64(1)") that
-- act_sections has no key for.

create table public.offence_classifications (
  id uuid primary key default gen_random_uuid(),
  -- Whose First Schedule this row was printed in (BNSS, CrPC).
  schedule_act_id uuid not null references public.acts (id) on delete cascade,
  -- Whose section it classifies (BNS, IPC).
  subject_act_id uuid not null references public.acts (id) on delete cascade,
  -- As printed in column 1: "302", "115", "376AB".
  section_number text not null,
  -- The sub-section the print names where sub-sections differ: "64(1)" is rape
  -- and "64(2)" is rape by a police officer. Null when the row covers the whole
  -- section.
  subsection text,

  -- Columns 4, 5 and 6 as the print sets them, Ditto resolved. Arrays because a
  -- section can carry several rows — a graver form of the same offence with its
  -- own classification — and collapsing those to one value would state as fact
  -- something the schedule does not say.
  cognizable text[] not null default '{}',
  bailable text[] not null default '{}',
  court text[] not null default '{}',

  -- The reading, and ONLY where the print gives exactly one unconditional
  -- answer. Null where the row is conditional ("According as offence abetted
  -- is cognizable or non-cognizable") or where the section has tiers that
  -- differ — in both cases there is no single true answer and a renderer must
  -- not invent one.
  is_cognizable boolean,
  is_bailable boolean,
  -- The section is classified more than one way. Renderers show the schedule's
  -- alternatives rather than a verdict.
  has_tiers boolean not null default false,

  -- Printed order. Also the upsert key, as for act_orders: a section label is
  -- NOT unique — the BNSS prints "61(2)" over two rows with different
  -- classifications, which is exactly the case that must not be merged.
  sort_order int not null,

  review_status text not null default 'draft'
    check (review_status in ('draft', 'reviewed', 'published')),
  provenance text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_act_id, sort_order)
);

-- The lookup every section page makes.
create index offence_classifications_subject_idx
  on public.offence_classifications (subject_act_id, section_number);

create trigger offence_classifications_touch_updated_at
  before update on public.offence_classifications
  for each row execute function public.touch_updated_at();

-- Same posture as every other content table: readable by anyone once
-- published, writable only by the service role.
alter table public.offence_classifications enable row level security;

create policy offence_classifications_read_published
  on public.offence_classifications for select
  to anon, authenticated
  using (review_status = 'published');

-- One join for the reader: the classification with the act it classifies and
-- the schedule it came from, published only.
create view public.v_offence_classifications as
  select
    c.id,
    c.section_number,
    c.subsection,
    c.cognizable,
    c.bailable,
    c.court,
    c.is_cognizable,
    c.is_bailable,
    c.has_tiers,
    c.sort_order,
    subject.slug as act_slug,
    subject.abbreviation as act_abbreviation,
    schedule.slug as schedule_act_slug,
    schedule.abbreviation as schedule_act_abbreviation
  from public.offence_classifications c
  join public.acts subject on subject.id = c.subject_act_id
  join public.acts schedule on schedule.id = c.schedule_act_id
  where c.review_status = 'published';
