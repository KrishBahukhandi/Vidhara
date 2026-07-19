-- 0008_search_sections_search_path.sql
-- Security-advisor 0011: search_sections had a role-mutable search_path. Pin it
-- (same hardening as 0002 for the trigger functions). Function is STABLE/
-- invoker-rights so risk is low, but a fixed path prevents a shadowed
-- ts_headline/ts_rank via a malicious schema. Revert: recreate without SET.

create or replace function public.search_sections(
  q text, scope_act text default null, max_results integer default 20
)
returns table (
  section_id uuid, act_abbreviation text, act_slug text, number text,
  marginal_note text, snippet text, rank real
)
language sql
stable
set search_path = pg_catalog, public
as $$
  select
    s.id,
    a.abbreviation,
    a.slug,
    s.number,
    s.marginal_note,
    ts_headline('english', s.body_plain, websearch_to_tsquery('english', q),
                'MaxWords=18, MinWords=6, StartSel=**, StopSel=**'),
    ts_rank(s.fts, websearch_to_tsquery('english', q))
  from public.act_sections s
  join public.acts a on a.id = s.act_id
  where s.fts @@ websearch_to_tsquery('english', q)
    and (scope_act is null or a.slug = scope_act)
  order by ts_rank(s.fts, websearch_to_tsquery('english', q)) desc, s.sort_key
  limit least(greatest(max_results, 1), 50);
$$;
