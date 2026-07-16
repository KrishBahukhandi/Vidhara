-- 0004_mapping_omitted_new.sql
-- Mapping edges for OMITTED old-law sections (no new-law counterpart, e.g.
-- IPC 497 Adultery) and NEW new-law provisions (no old-law antecedent) need a
-- null endpoint. Revert strategy: delete null-endpoint rows, re-add NOT NULLs
-- and the original inequality check, drop the partial unique indexes,
-- recreate the inner-join view.

alter table public.law_mappings alter column source_section_id drop not null;
alter table public.law_mappings alter column target_section_id drop not null;

-- Replace the original inline inequality check with a shape check.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.law_mappings'::regclass and contype = 'c'
  loop
    execute format('alter table public.law_mappings drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.law_mappings add constraint law_mappings_shape check (
  (mapping_type not in ('omitted', 'new')
     and source_section_id is not null
     and target_section_id is not null
     and source_section_id <> target_section_id)
  or (mapping_type = 'omitted' and source_section_id is not null and target_section_id is null)
  or (mapping_type = 'new' and source_section_id is null and target_section_id is not null)
);

alter table public.law_mappings add constraint law_mappings_type check (
  mapping_type in ('identical', 'renumbered', 'modified', 'expanded', 'merged', 'split', 'new', 'omitted')
);

-- Unique(source,target) treats NULLs as distinct — partial uniques close the gap.
create unique index law_mappings_omitted_uq
  on public.law_mappings (source_section_id) where target_section_id is null;
create unique index law_mappings_new_uq
  on public.law_mappings (target_section_id) where source_section_id is null;

-- View: LEFT JOIN both sides so omitted/new rows surface with a null side.
create or replace view public.v_mapping_lookup
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
left join public.act_sections s on s.id = m.source_section_id
left join public.acts sa on sa.id = s.act_id
left join public.act_sections t on t.id = m.target_section_id
left join public.acts ta on ta.id = t.act_id;
