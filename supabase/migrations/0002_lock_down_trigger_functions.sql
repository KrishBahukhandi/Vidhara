-- 0002_lock_down_trigger_functions.sql
-- Security-advisor fix: SECURITY DEFINER trigger functions are exposed by
-- PostgREST as /rpc/ endpoints executable by anon/authenticated by default.
-- They are trigger-only — nothing outside the database may call them.
-- Revert strategy: grant execute back to public (not that you'd want to).

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
