-- The First Schedule's Part II: how offences under OTHER laws are classified.
--
-- Revert strategy: drop view v_offence_classification_rules, then drop table
-- offence_classification_rules.
--
-- Part I (0021) names sections: "BNS 302 is cognizable, non-bailable, Court of
-- Session". It can do that because the BNSS's schedule classifies the BNS
-- section by section. No other Act in this corpus has such a schedule — not
-- NDPS, not POCSO, not the NI Act whose section 138 is the most litigated
-- offence in the country — and for all of them Part II is the answer.
--
-- It answers by PUNISHMENT rather than by section: three bands, death down to
-- fine only. So it is stored as three rules per schedule, not as thousands of
-- derived rows.
--
-- WHY IT IS NOT APPLIED AUTOMATICALLY. Placing a section in a band means
-- reading its punishment clause and classifying it, and punishment clauses are
-- not a closed vocabulary — provisos, alternatives, enhanced terms for repeat
-- offenders, minimum terms that differ from maximum ones. A derived answer
-- would be this project inventing law, which ADR-6/D-011 forbids. The reader
-- has the punishment in front of them; what they lack is the rule.
--
-- And the rule is residual in the statute's own terms: BNSS s. 5 (CrPC s. 5)
-- saves any special or local law that provides to the contrary, which several
-- of the Acts this rule serves do. Renderers must carry that rider.

create table public.offence_classification_rules (
  id uuid primary key default gen_random_uuid(),
  -- Whose First Schedule this band was printed in (BNSS, CrPC).
  schedule_act_id uuid not null references public.acts (id) on delete cascade,

  -- Column 1 as printed — "If punishable with death, imprisonment for life, or
  -- imprisonment for more than 7 years." This is the operative criterion, not a
  -- precis, which is why it is stored where Part I's offence column (0021) was
  -- deliberately dropped.
  punishment text not null,

  -- Columns 2, 3 and 4, Ditto resolved. Singular, not arrays as in 0021: a band
  -- takes exactly one value per column, and the parser refuses to publish
  -- anything that does not.
  cognizable text not null,
  bailable text not null,
  court text not null,

  -- Printed order, death band first. Also the upsert key.
  sort_order int not null,

  review_status text not null default 'draft'
    check (review_status in ('draft', 'reviewed', 'published')),
  provenance text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_act_id, sort_order)
);

create trigger offence_classification_rules_touch_updated_at
  before update on public.offence_classification_rules
  for each row execute function public.touch_updated_at();

alter table public.offence_classification_rules enable row level security;

create policy offence_classification_rules_read_published
  on public.offence_classification_rules for select
  to anon, authenticated
  using (review_status = 'published');

create view public.v_offence_classification_rules as
  select
    r.id,
    r.punishment,
    r.cognizable,
    r.bailable,
    r.court,
    r.sort_order,
    schedule.slug as schedule_act_slug,
    schedule.abbreviation as schedule_act_abbreviation
  from public.offence_classification_rules r
  join public.acts schedule on schedule.id = r.schedule_act_id
  where r.review_status = 'published';
