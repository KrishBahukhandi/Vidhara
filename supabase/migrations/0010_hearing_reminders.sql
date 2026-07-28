-- 0010_hearing_reminders.sql
-- Hearing reminders for the advocate case diary (D-030).
--
-- PRIVACY POSTURE — this is the ONE place case data leaves the device.
-- The diary itself is local-only (D-029) because it holds privileged client
-- matter. A reminder email can't work that way: the server has to know the
-- date. So this table is opt-in PER CASE and deliberately minimal —
--   * `label` is chosen and editable by the advocate (defaults to the cause
--     title but can be anything, e.g. "Bail matter, Sessions"),
--   * notes, case numbers and attached sections are NEVER uploaded.
-- Double opt-in: a reminder is only ever sent after the address is confirmed,
-- so nobody can subscribe someone else's inbox. Every mail carries a
-- one-click unsubscribe token.
--
-- RLS mirrors public.feedback: anon may INSERT only. No anon SELECT/UPDATE —
-- an email address plus a hearing date is exactly the kind of pairing that
-- must not be enumerable. The scheduled Edge Function reads via service role.
-- Revert: drop the table.

create table public.hearing_reminders (
  id uuid primary key default gen_random_uuid(),
  email text not null check (position('@' in email) > 1 and length(email) between 5 and 254),
  -- What the advocate wants to see in the email. Their words, not our copy of
  -- the cause title.
  label text not null check (length(btrim(label)) between 1 and 120),
  hearing_on date not null,
  -- When to send (normally the evening before; the job sends anything due).
  remind_on date not null,
  -- Double opt-in. NULL until the address is confirmed; nothing is sent before.
  confirmed_at timestamptz,
  confirm_token uuid not null default gen_random_uuid(),
  confirm_sent_at timestamptz,
  unsubscribe_token uuid not null default gen_random_uuid(),
  -- Set once the reminder mail goes out, so the job never double-sends.
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- The scheduled job's access pattern: "what is due and confirmed and unsent?"
create index hearing_reminders_due_idx
  on public.hearing_reminders (remind_on)
  where sent_at is null;

-- Confirmation/unsubscribe link lookups.
create index hearing_reminders_confirm_token_idx on public.hearing_reminders (confirm_token);
create index hearing_reminders_unsub_token_idx on public.hearing_reminders (unsubscribe_token);

alter table public.hearing_reminders enable row level security;

-- Anon can only create a reminder request. Reading, confirming, sending and
-- unsubscribing all go through the service-role Edge Function.
create policy hearing_reminders_anon_insert
  on public.hearing_reminders
  for insert
  to anon
  with check (true);
