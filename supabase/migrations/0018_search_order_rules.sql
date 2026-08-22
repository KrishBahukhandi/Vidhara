-- Full-text search over the CPC's Orders and Rules.
--
-- Revert strategy: drop function public.search_order_rules.
--
-- D-068 published 728 rules behind a GIN index that nothing queried, so
-- "rejection of plaint" still found only sections and Order VII Rule 11 — the
-- rule the whole ingest exists for — was unreachable by search. Ingesting
-- content nothing can find is most of the way to not ingesting it.
--
-- Mirrors search_sections deliberately: same headline options so snippets
-- render through the existing `**term**` highlighting, same rank ordering, and
-- the same pinned search_path that 0008 had to add after a security advisor
-- flagged the original (a role-mutable path can shadow ts_headline/ts_rank).
--
-- The WHERE clause repeats the index's expression verbatim rather than using a
-- generated column: act_order_rules has no `fts` column, and an expression that
-- differs by even a concatenation order would silently fall back to a seq scan.

create or replace function public.search_order_rules(
  q text,
  scope_act text default null,
  max_results integer default 10
)
returns table (
  rule_id uuid,
  act_abbreviation text,
  act_slug text,
  order_number text,
  order_title text,
  order_sort integer,
  rule_number text,
  marginal_note text,
  snippet text,
  rank real
)
language sql
stable
set search_path = pg_catalog, public
as $$
  select
    r.id,
    a.abbreviation,
    a.slug,
    o.number,
    o.title,
    o.sort_order,
    r.number,
    r.marginal_note,
    ts_headline('english', r.body_plain, websearch_to_tsquery('english', q),
                'MaxWords=18, MinWords=6, StartSel=**, StopSel=**'),
    ts_rank(to_tsvector('english', r.marginal_note || ' ' || r.body_plain),
            websearch_to_tsquery('english', q))
  from public.act_order_rules r
  join public.act_orders o on o.id = r.order_id
  join public.acts a on a.id = o.act_id
  where to_tsvector('english', r.marginal_note || ' ' || r.body_plain)
        @@ websearch_to_tsquery('english', q)
    and o.review_status = 'published'
    and (scope_act is null or a.slug = scope_act)
  order by ts_rank(to_tsvector('english', r.marginal_note || ' ' || r.body_plain),
                   websearch_to_tsquery('english', q)) desc,
           o.sort_order, r.sort_key
  limit least(greatest(max_results, 1), 50);
$$;
