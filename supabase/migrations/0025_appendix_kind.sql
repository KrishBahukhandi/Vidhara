-- Appendices that are prose, not forms.
--
-- Revert strategy: drop the kind column.
--
-- act_appendices (0016) was built for the CPC, whose Appendices A to H are
-- FORMS: a title and a layout, rendered with its line breaks and dotted blanks
-- intact because the layout is the template. The Constitution's three
-- appendices are not that. They are documents — an amending Act with numbered
-- sections, a Presidential Order with clauses, and a one-paragraph declaration
-- under article 370(3) — and rendered as a form each would be a wall of
-- preformatted text with its wrapping frozen.
--
-- One column, because the difference is exactly one thing: whether the body is
-- a layout to be preserved or prose to be set.
alter table public.act_appendices
  add column if not exists kind text not null default 'forms'
    check (kind in ('forms', 'prose'));
