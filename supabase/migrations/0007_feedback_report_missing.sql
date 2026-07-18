-- 0007_feedback_report_missing.sql
-- Two more feedback kinds: 'report' (wrong section/mapping text — Sev-0 intake
-- per docs/analytics-plan.md §Runbook) and 'missing' (zero-result search asks —
-- the demand signal that decides which acts to ingest next, future-ideas.md).
-- Revert: delete report/missing rows, restore the 0006 constraints.

alter table public.feedback drop constraint feedback_kind_check;
alter table public.feedback drop constraint feedback_shape;

alter table public.feedback add constraint feedback_kind_check
  check (kind in ('rating', 'suggestion', 'report', 'missing'));

alter table public.feedback add constraint feedback_shape check (
  (kind = 'rating' and score is not null)
  or (kind in ('suggestion', 'report', 'missing') and message is not null)
);
