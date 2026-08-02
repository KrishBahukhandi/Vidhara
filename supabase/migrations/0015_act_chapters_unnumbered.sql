-- Divisions the source titles but does not number.
--
-- The Contract, Civil Procedure and Arbitration Acts each open with a centred
-- "PRELIMINARY" carrying no number, and the Hindu Marriage Act is divided this
-- way throughout — PRELIMINARY, HINDU MARRIAGES, RESTITUTION OF CONJUGAL RIGHTS
-- AND JUDICIAL SEPARATION, NULLITY OF MARRIAGE AND DIVORCE, JURISDICTION AND
-- PROCEDURE, SAVINGS AND REPEALS. It prints no CHAPTER or PART anywhere, which
-- is why all 37 of its sections sat under no heading at all.
--
-- A division still needs a key, and one act can hold several of these, so
-- `number` carries the TITLE for these rows (unique per act, stable across
-- re-parses). This flag is what stops a renderer printing "Ch. PRELIMINARY":
-- with it set, the title is shown on its own.
alter table public.act_chapters
  add column unnumbered boolean not null default false;

comment on column public.act_chapters.unnumbered is
  'Source gave this division a title but no number; `number` holds the title. Render the title alone.';
