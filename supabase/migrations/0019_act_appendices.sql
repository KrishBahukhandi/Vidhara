-- The Code of Civil Procedure's Appendices: the forms.
--
-- Revert strategy: drop table act_appendix_forms, then act_appendices.
--
-- 30% of the document and a different kind of content from everything else in
-- this corpus: not provisions to read but templates to copy — a plaint for
-- money lent, a decree for possession, the Statement of Truth. Their dotted
-- runs are the fill-in blanks exactly as printed and are preserved, not
-- collapsed as whitespace, because a form without its blanks is not a form.
--
-- NOTE ON SHAPE, for whoever adds the next one. This is the third
-- container-of-numbered-items in the schema (act_schedules/articles from D-036,
-- act_orders/rules from D-068, now this), and the second that is structurally
-- identical to another — an Appendix is to a Form what an Order is to a Rule.
-- They are kept apart because the citation form and the route differ ("Appendix
-- A, Form No. 1" is not "Order VII, Rule 11"), which is the same reason D-036
-- gave. If a FOURTH arrives, generalise instead of copying this again.

create table public.act_appendices (
  id uuid primary key default gen_random_uuid(),
  act_id uuid not null references public.acts (id) on delete cascade,
  -- As printed: "A" … "I".
  letter text not null,
  title text not null,
  sort_order int not null,
  review_status text not null default 'draft'
    check (review_status in ('draft', 'reviewed', 'published')),
  provenance text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (act_id, letter)
);

create trigger act_appendices_touch_updated_at
  before update on public.act_appendices
  for each row execute function public.touch_updated_at();

create table public.act_appendix_forms (
  id uuid primary key default gen_random_uuid(),
  appendix_id uuid not null references public.act_appendices (id) on delete cascade,
  -- As printed: "1", "7B". Appendix I's single unnumbered form is stored as 1.
  number text not null,
  sort_key numeric not null,
  title text not null,
  body_md text not null,
  body_plain text not null,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appendix_id, number)
);

create index act_appendix_forms_sort_idx on public.act_appendix_forms (appendix_id, sort_key);

create index act_appendix_forms_fts_idx on public.act_appendix_forms
  using gin (to_tsvector('english', title || ' ' || body_plain));

create trigger act_appendix_forms_touch_updated_at
  before update on public.act_appendix_forms
  for each row execute function public.touch_updated_at();

alter table public.act_appendices enable row level security;
alter table public.act_appendix_forms enable row level security;

create policy act_appendices_read_published
  on public.act_appendices for select
  to anon, authenticated
  using (review_status = 'published');

create policy act_appendix_forms_read_published
  on public.act_appendix_forms for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.act_appendices ap
      where ap.id = act_appendix_forms.appendix_id and ap.review_status = 'published'
    )
  );

-- Applied as a follow-up in the same session: Appendix A's numbering restarts
-- partway through (49 plaints, then defences beginning again at No. 1) and the
-- print marks those groups with no heading the parser can rely on, so a form is
-- keyed by its position and `number` is kept as printed for display.
alter table public.act_appendix_forms
  drop constraint act_appendix_forms_appendix_id_number_key;
alter table public.act_appendix_forms add column sort_order int not null default 0;
alter table public.act_appendix_forms
  add constraint act_appendix_forms_position_key unique (appendix_id, sort_order);
