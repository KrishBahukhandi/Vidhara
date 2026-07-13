-- 0001_create_profiles.sql
-- Profiles: one row per auth user, auto-created on signup.
-- Revert strategy: drop trigger on_auth_user_created, function public.handle_new_user,
-- table public.profiles, types public.user_role, public.plan_tier.

create type public.user_role as enum ('student', 'aspirant', 'advocate', 'professor', 'other');
create type public.plan_tier as enum ('free', 'plus', 'pro');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 60),
  role public.user_role,
  exam_targets text[] not null default '{}' check (array_length(exam_targets, 1) is null or array_length(exam_targets, 1) <= 10),
  avatar_url text,
  plan public.plan_tier not null default 'free',
  plan_expires_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'User profile, 1:1 with auth.users; created by signup trigger.';

-- updated_at touch trigger (shared convention; reused by later tables)
create function public.touch_updated_at()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Auto-create a profile row on signup (rules.md §5.3: one of the few allowed triggers)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security: owner-only (default-deny; no anon access)
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No INSERT/DELETE policies on purpose: rows are created by the signup trigger
-- (security definer) and removed via auth.users cascade (DPDP deletion).
