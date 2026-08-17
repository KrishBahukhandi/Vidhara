-- The Code of Civil Procedure's First Schedule: Orders and Rules.
--
-- Revert strategy: drop table act_order_rules, then act_orders.
--
-- 78% of the CPC by volume and, until now, entirely absent from the corpus —
-- the bundle's provenance recorded "Schedule I (Orders/Rules) not included"
-- since 2026-07-29 and nothing surfaced it to a reader. It is also what civil
-- practice runs on: Order VII Rule 11, Order VIII Rule 6, Order XXXIX.
--
-- Kept out of act_sections deliberately, for the reason D-036 kept the
-- Limitation Act's Schedule out: the citation form differs ("Order VII, Rule
-- 11" is not a section number), rule numbers restart inside every Order so a
-- single sort key over the act would be meaningless, and the two would collide
-- in search and in every route that assumes a section.

create table public.act_orders (
  id uuid primary key default gen_random_uuid(),
  act_id uuid not null references public.acts (id) on delete cascade,
  -- As printed, roman: "VII", "XVI-A". Not unique per act on purpose — the
  -- Commercial Courts Act 2015 substituted a parallel Order XI for suits
  -- before a Commercial Division and the source carries both. Merging them
  -- would silently mix two bodies of law that the print keeps apart.
  number text not null,
  title text not null,
  -- Distinguishes the duplicates above, and fixes reading order generally.
  sort_order int not null,
  review_status text not null default 'draft'
    check (review_status in ('draft', 'reviewed', 'published')),
  provenance text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (act_id, sort_order)
);

create index act_orders_act_number_idx on public.act_orders (act_id, number);

create trigger act_orders_touch_updated_at
  before update on public.act_orders
  for each row execute function public.touch_updated_at();

create table public.act_order_rules (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.act_orders (id) on delete cascade,
  -- As printed: "1", "10A", "58A".
  number text not null,
  -- Letters sort after their base: rule 10A follows 10, precedes 11.
  sort_key numeric not null,
  marginal_note text not null,
  body_md text not null,
  body_plain text not null,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, number)
);

create index act_order_rules_order_sort_idx on public.act_order_rules (order_id, sort_key);

-- Full-text over rules, so "rejection of plaint" reaches Order VII Rule 11.
-- Mirrors the act_sections index rather than inventing a second scheme.
create index act_order_rules_fts_idx on public.act_order_rules
  using gin (to_tsvector('english', marginal_note || ' ' || body_plain));

create trigger act_order_rules_touch_updated_at
  before update on public.act_order_rules
  for each row execute function public.touch_updated_at();

-- Same posture as every other content table: readable by anyone, writable only
-- by the service role, and only once published.
alter table public.act_orders enable row level security;
alter table public.act_order_rules enable row level security;

create policy act_orders_read_published
  on public.act_orders for select
  to anon, authenticated
  using (review_status = 'published');

create policy act_order_rules_read_published
  on public.act_order_rules for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.act_orders o
      where o.id = act_order_rules.order_id and o.review_status = 'published'
    )
  );

-- One join for the reader: rule with its Order and act, published only.
create view public.v_order_rules as
  select
    r.id,
    r.number as rule_number,
    r.sort_key,
    r.marginal_note,
    r.body_md,
    r.body_plain,
    o.id as order_id,
    o.number as order_number,
    o.title as order_title,
    o.sort_order as order_sort,
    a.slug as act_slug,
    a.abbreviation as act_abbreviation
  from public.act_order_rules r
  join public.act_orders o on o.id = r.order_id
  join public.acts a on a.id = o.act_id
  where o.review_status = 'published';
