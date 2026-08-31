-- act_schedule_articles (0011) for a table of ANY width.
--
-- Revert strategy: drop the cells column, the shape check and the coalesced
-- key, restore NOT NULL on rows/description/period/commencement and the plain
-- unique (schedule_id, number), rebuild `fts` with 0011's expression, and drop
-- public.schedule_cells_text. Reversible while every stored row is
-- Limitation-shaped, which holds until the first celled schedule is published;
-- after that the celled rows are what the revert would lose.
--
-- THE MOTIVATING CASE is the annexure to Appendix I of the Constitution — the
-- First Schedule to the 2015 India–Bangladesh boundary agreement (D-091),
-- whose inventory of roughly 300 enclaves is a six-column table with named
-- headings at fixed positions: Sl. No. | Name of Chhits | Chhit No. | Lying
-- within PS Bangladesh | Lying within PS W. Bengal | Area in acres. That is
-- precisely the shape 0011 was built for, headings and all — act_schedules
-- already carries them in column_labels — except that 0011 also wrote the
-- LIMITATION ACT'S OWN THREE COLUMNS into the article table: description,
-- period and commencement, each NOT NULL, and a `rows` jsonb whose limbs carry
-- one of each. A table with six columns, or two, cannot be stored without
-- inventing values for columns it does not have.
--
-- WHY NOT act_schedule_entries (0023/0024): an entry is ONE column of text, so
-- six would have to be flattened into its body — the loss D-035 refused when it
-- kept the Limitation Schedule out of act_sections, one level down. WHY NOT SIX
-- NAMED COLUMNS OF ITS OWN: the next such table has a different six.
--
-- So an article is now one of two shapes, and the check constraint says which:
--
--   LIMBED — `rows` jsonb plus the three flattened projections derived from it.
--            The Limitation Act's 137 Articles, unchanged in every respect.
--   CELLED — `cells`, one string per heading in the schedule's column_labels,
--            in printed order. description, period and commencement are NULL
--            rather than "": a period is not blank for an enclave, it is not a
--            fact about one, and a description would have to be a lossy join of
--            six unrelated fields. NULL says "this column does not apply here",
--            which is the thing that is true.

-- array_to_string is polymorphic — for a timestamptz[] its output depends on
-- TimeZone — so it is marked STABLE and a generated column may not call it.
-- Fixed to text[] and a constant separator it is the identity on its elements
-- and cannot vary with anything, which is what makes this wrapper a narrowing
-- rather than a promise the planner should not believe.
create or replace function public.schedule_cells_text(cells text[])
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$ select coalesce(array_to_string(cells, ' '), '') $$;

alter table public.act_schedule_articles
  add column if not exists cells text[];

alter table public.act_schedule_articles
  alter column rows drop not null,
  alter column description drop not null,
  alter column period drop not null,
  alter column commencement drop not null;

-- Nullable columns alone would let a row be stored as neither shape, or as
-- both, and nothing downstream could tell which reading was meant. Exactly one.
alter table public.act_schedule_articles
  add constraint act_schedule_articles_shape check (
    (
      rows is not null
      and description is not null
      and period is not null
      and commencement is not null
      and cells is null
    )
    or (
      cells is not null
      and array_length(cells, 1) >= 2
      and rows is null
      and description is null
      and period is null
      and commencement is null
    )
  );

-- A generated column's expression cannot be altered in place, so `fts` is
-- rebuilt rather than amended; its GIN index is dropped with it and recreated.
alter table public.act_schedule_articles drop column fts;

alter table public.act_schedule_articles
  add column fts tsvector generated always as (
    setweight(to_tsvector('english', coalesce(description, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(period, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(commencement, '')), 'B') ||
    -- A celled row's cells ARE its content — the name of a chhit is what a
    -- reader searches for — so they carry the same weight a description does.
    setweight(to_tsvector('english', public.schedule_cells_text(cells)), 'A')
  ) stored;

create index act_schedule_articles_fts_idx
  on public.act_schedule_articles using gin (fts);

-- THE KEY, for a table whose numbering restarts.
--
-- 0011 keyed an article by (schedule, number), which is exactly right for 137
-- Articles numbered straight through. A table that groups its rows numbers each
-- group from 1 — the enclaves transferred one way are numbered independently of
-- those transferred the other — and the plain key collides on every row of the
-- second group. 0024 met this one table over, when a schedule with no Lists
-- stopped being unique on its entry number, and its answer holds here.
alter table public.act_schedule_articles
  drop constraint act_schedule_articles_schedule_id_number_key;

-- Postgres treats NULLs as distinct, so division has to be coalesced: an
-- ungrouped schedule still cannot publish the same row number twice.
create unique index act_schedule_articles_key
  on public.act_schedule_articles (schedule_id, coalesce(division, ''), number);
