-- State amendments, recorded beside a section instead of inside it.
--
-- India Code prints these inline, right after the central section they modify.
-- Since D-032 the parser has skipped them, because a Rajasthan amendment shown
-- as the central provision is the worst defect this project can ship — about 95
-- published sections had absorbed one before that guard existed.
--
-- Skipping them silently is a smaller error, but it is still an error. An
-- advocate in Karnataka reading Registration Act s.17 sees the central text and
-- nothing to suggest their State has amended it; the page reads as though there
-- is nothing more to know. This table is the third option: the amendment is
-- kept, attributed, and shown as what it is (D-053).
--
-- Separate from act_sections on purpose, and not a column on it. The two differ
-- in what they are (national law vs one State's), in how far we vouch for them,
-- and in how they must be rendered — a body column would eventually get
-- concatenated into a section somewhere, which is the defect we started from.

create table public.act_state_amendments (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.act_sections (id) on delete cascade,
  -- State or UT this applies in. Normalised for grouping (the source spells
  -- Uttarakhand three ways); `citation` below is always the verbatim authority.
  state text not null,
  -- "[Vide Karnataka Act 28 of 1975, s. 2]" — copied exactly, so a reader can
  -- find the amending Act rather than take our word for it.
  citation text not null,
  -- The amending text as printed. NOT the amended section: India Code prints
  -- the instruction ("In section 17, after clause (b), insert…"), not a
  -- consolidated State version, and we do not synthesise one.
  amendment_text text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, citation)
);

create index act_state_amendments_section_idx
  on public.act_state_amendments (section_id, sort_order);

create trigger act_state_amendments_touch_updated_at
  before update on public.act_state_amendments
  for each row execute function public.touch_updated_at();

-- ── RLS: inherit the section's visibility exactly ───────────────────────────
-- One gate, so a State amendment can never be readable for a section that is
-- not itself published.
alter table public.act_state_amendments enable row level security;

create policy "state_amendments_read_published"
  on public.act_state_amendments for select
  to anon, authenticated
  using (exists (
    select 1
    from public.act_sections s
    join public.acts a on a.id = s.act_id
    where s.id = act_state_amendments.section_id
      and s.review_status = 'published'
      and a.published_at is not null
  ));
