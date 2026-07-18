-- 0006_feedback_kind.sql
-- The feedback table grows a second use: free-text improvement suggestions
-- (docs/user-feedback-plan.md). `kind` separates them from page ratings;
-- score becomes optional but stays REQUIRED for ratings via the shape check.
-- Revert: delete suggestion rows, re-add NOT NULL on score, drop kind.

alter table public.feedback add column kind text not null default 'rating'
  check (kind in ('rating', 'suggestion'));

alter table public.feedback alter column score drop not null;

alter table public.feedback add constraint feedback_shape check (
  (kind = 'rating' and score is not null)
  or (kind = 'suggestion' and message is not null)
);
