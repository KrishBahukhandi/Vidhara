-- Parts and Chapters as two levels, not one namespace.
--
-- D-038 recorded WHICH keyword a division used; it did not let both exist.
-- `unique (act_id, number)` meant the Arbitration Act's PART I and its
-- CHAPTER I were the same row, so publishing it would have labelled Part I's
-- Chapter II sections with Part II's title. That kept ARB unpublished.
--
-- Nesting is real and repeats: ARB prints CHAPTER I inside PART I *and*
-- CHAPTER I inside PART II, so the parent Part is part of a division's
-- identity. part_number already existed for exactly this and was never
-- populated; it becomes the parent link.
--
-- '' rather than NULL for "no parent", so the uniqueness is a plain constraint
-- that upsert can target — NULLs do not compare equal, which would let
-- duplicate top-level Parts through.
alter table public.act_chapters
  drop constraint act_chapters_act_id_number_key;

update public.act_chapters set part_number = '' where part_number is null;

alter table public.act_chapters
  alter column part_number set default '',
  alter column part_number set not null;

alter table public.act_chapters
  add constraint act_chapters_division_key
    unique (act_id, kind, number, part_number);

comment on column public.act_chapters.part_number is
  'Parent Part of a nested Chapter; empty string for a top-level division. Part of the division key.';
