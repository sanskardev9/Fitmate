-- FitMate user profiles: one row per auth user, filled in during onboarding.
-- Workout/diet plans and logs stay local-first in IndexedDB for now.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 80),
  sex text check (sex in ('male', 'female', 'other', 'prefer_not_to_say')),
  date_of_birth date check (date_of_birth between date '1900-01-01' and current_date),
  height_cm numeric(5, 1) check (height_cm between 50 and 260),
  weight_kg numeric(5, 1) check (weight_kg between 20 and 400),
  goal text check (goal in ('lose_fat', 'build_muscle', 'gain_strength', 'calisthenics_skills', 'maintain', 'general_fitness')),
  target_weight_kg numeric(5, 1) check (target_weight_kg between 20 and 400),
  experience text check (experience in ('beginner', 'intermediate', 'advanced')),
  training_days_per_week smallint check (training_days_per_week between 0 and 7),
  protein_target_g smallint check (protein_target_g between 0 and 500),
  calories_target integer check (calories_target between 0 and 10000),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Per-user profile and goals. Authorization data (e.g. admin role) lives in auth app_metadata, never here.';

-- Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Row Level Security: a signed-in user can read, create and edit only their own profile.
alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No delete policy: profiles go away with the auth user (on delete cascade).

-- Data API access: signed-in users only; anonymous visitors get nothing. Revoke first because
-- Supabase's default privileges grant everything (incl. TRUNCATE, which ignores RLS).
revoke all on table public.profiles from anon, authenticated, public;
grant select, insert, update on table public.profiles to authenticated;
