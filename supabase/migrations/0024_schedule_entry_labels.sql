-- Make act_schedule_entries (0023) serve every shape the Constitution's twelve
-- Schedules take, not only the Seventh's three Lists.
--
-- Revert strategy: drop the label column, restore NOT NULL on list_number and
-- list_title, and restore the plain unique constraint.
--
-- 0023 was written for the Seventh, where every entry is a bare numbered
-- subject inside a named List. Surveying the other eleven, three things vary:
--
--   * MOST HAVE NO LISTS. The Eighth (languages), Ninth (Acts immune from
--     challenge), Eleventh (Panchayat functions) and Twelfth (municipal
--     functions) are one flat run of numbered entries. list_number and
--     list_title become nullable rather than being filled with a sentinel.
--
--   * MANY ENTRIES HAVE A LABEL as well as a body, and it is a different thing
--     in each schedule: the marginal note of a paragraph in the Fifth, Sixth
--     and Tenth ("1. Interpretation.—In this Schedule…"), the State whose
--     territories are being described in the First, the office whose oath is
--     being set out in the Third. One nullable column carries all of them,
--     because in every case it is what the reader scans for and the body is
--     what they read once they have found it.
--
--   * A PART IS A LIST BY ANOTHER NAME. The Second and Fifth Schedules group
--     their paragraphs into Parts A to E; the First into "I. THE STATES" and
--     "II. THE UNION TERRITORIES". Those reuse list_number/list_title rather
--     than earning columns of their own — the grouping does the same work for
--     the reader as List I does in the Seventh.

alter table public.act_schedule_entries
  add column if not exists label text;

alter table public.act_schedule_entries
  alter column list_number drop not null,
  alter column list_title drop not null;

-- Postgres treats NULLs as distinct, so the plain constraint stops enforcing
-- anything the moment a schedule has no Lists. Coalesced, an unlisted schedule
-- still cannot publish the same entry number twice.
alter table public.act_schedule_entries
  drop constraint act_schedule_entries_schedule_id_list_number_number_key;

create unique index act_schedule_entries_key
  on public.act_schedule_entries (schedule_id, coalesce(list_number, ''), number);
