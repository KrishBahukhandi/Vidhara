-- 0005_feedback.sql
-- V0.2 feedback widget (docs/release-plan.md §V0.2): anonymous product
-- feedback, INSERT-only for anon/authenticated. No SELECT policy — reads go
-- through the dashboard/service role. Revert: drop table public.feedback.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  score smallint not null check (score between 1 and 5),
  message text check (char_length(message) <= 2000),
  -- page the widget was on ("/acts/ipc/420") and surface ("web" | "android")
  path text check (char_length(path) <= 200),
  platform text not null default 'web' check (platform in ('web', 'android'))
);

alter table public.feedback enable row level security;

create policy feedback_insert_anon
  on public.feedback for insert
  to anon, authenticated
  with check (true);

-- Belt & braces: only INSERT is granted; RLS has no SELECT/UPDATE/DELETE
-- policies either.
revoke all on public.feedback from anon, authenticated;
grant insert on public.feedback to anon, authenticated;
