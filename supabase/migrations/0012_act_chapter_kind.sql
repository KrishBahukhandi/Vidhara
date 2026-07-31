-- Acts divide themselves differently, and cite themselves accordingly.
--
-- The Constitution has Parts — "Part II — Citizenship", arts. 5-11 — as do the
-- CPC and the Limitation Act. The IPC, CrPC and the 2023 codes have Chapters.
-- Both were folded into act_chapters with no record of which keyword the
-- source printed, so every division rendered as "Ch. II". For a Part that is a
-- miscitation, and this product is read by people who cite for a living.
--
-- Default 'chapter' is correct for every act ingested before this column
-- existed except those re-published alongside it (D-038).
alter table public.act_chapters
  add column kind text not null default 'chapter'
    check (kind in ('chapter', 'part'));

comment on column public.act_chapters.kind is
  'Whether the source printed CHAPTER or PART for this division. Drives the citation label in the UI.';
