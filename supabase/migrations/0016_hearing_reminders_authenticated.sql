-- 0016 — hearing_reminders: allow the authenticated role to insert.
--
-- Revert strategy: drop policy hearing_reminders_insert, recreate
-- hearing_reminders_anon_insert as it stood in 0010 (to anon only), and
-- revoke insert from authenticated.
--
-- Why now: web sign-in (D-065) turns on session persistence in the browser
-- client, so a signed-in reader's requests arrive as `authenticated` rather
-- than `anon`. 0010 scoped the INSERT policy to `anon` alone — correct when
-- nobody could sign in on the web, and a silent RLS denial the moment they
-- can. The failure would surface only after SMTP is configured and the
-- "Remind me" control unhides itself, which is exactly the delayed, invisible
-- breakage D-041 was written about.
--
-- The write stays INSERT-only and there is still NO select policy for either
-- role: an email paired with a hearing date must not be enumerable, and the
-- scheduled job continues to read via the service role. Signing in grants no
-- new read access here — only the ability to keep using a feature that was
-- already open to anonymous users.

drop policy if exists hearing_reminders_anon_insert on public.hearing_reminders;

create policy hearing_reminders_insert
  on public.hearing_reminders
  for insert
  to anon, authenticated
  with check (true);

grant insert on public.hearing_reminders to authenticated;
