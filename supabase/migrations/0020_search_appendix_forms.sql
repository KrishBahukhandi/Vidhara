-- Full-text search over the CPC's Appendix forms.
--
-- Revert strategy: drop function public.search_appendix_forms.
--
-- D-069 published 213 forms behind a GIN index and did not query it — the exact
-- gap that entry had just closed for the Orders, left open in the same commit.
-- An advocate looking for "written statement set-off" or "decree for possession"
-- should reach the form.
--
-- Same shape as search_order_rules: index expression repeated verbatim so the
-- GIN index is used, pinned search_path, and ts_headline options copied from
-- search_sections so every surface highlights identically.
--
-- Ordered by position, not number: Appendix A's numbering restarts partway
-- through and `sort_order` is what makes a form addressable.

create or replace function public.search_appendix_forms(
  q text,
  scope_act text default null,
  max_results integer default 8
)
returns table (
  form_id uuid,
  act_abbreviation text,
  act_slug text,
  appendix_letter text,
  appendix_title text,
  form_number text,
  form_sort integer,
  title text,
  snippet text,
  rank real
)
language sql
stable
set search_path = pg_catalog, public
as $$
  select
    f.id,
    a.abbreviation,
    a.slug,
    ap.letter,
    ap.title,
    f.number,
    f.sort_order,
    f.title,
    ts_headline('english', f.body_plain, websearch_to_tsquery('english', q),
                'MaxWords=18, MinWords=6, StartSel=**, StopSel=**'),
    ts_rank(to_tsvector('english', f.title || ' ' || f.body_plain),
            websearch_to_tsquery('english', q))
  from public.act_appendix_forms f
  join public.act_appendices ap on ap.id = f.appendix_id
  join public.acts a on a.id = ap.act_id
  where to_tsvector('english', f.title || ' ' || f.body_plain)
        @@ websearch_to_tsquery('english', q)
    and ap.review_status = 'published'
    and (scope_act is null or a.slug = scope_act)
  order by ts_rank(to_tsvector('english', f.title || ' ' || f.body_plain),
                   websearch_to_tsquery('english', q)) desc,
           ap.sort_order, f.sort_order
  limit least(greatest(max_results, 1), 50);
$$;
