-- Shared exercise names contributed by users when they save a plan, so the exercise search
-- grows over time. Everyone signed in can read it; only the server (secret key, via
-- /api/exercises after verifying the user) writes to it.

create table if not exists public.exercise_catalog (
  name_key text primary key check (char_length(name_key) between 2 and 80),
  name text not null check (char_length(name) between 2 and 80),
  type text not null default 'reps' check (type in ('reps', 'hold')),
  uses integer not null default 1 check (uses >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.exercise_catalog is 'Exercise names users have saved in plans (shared suggestions). name_key = lower-case name.';

-- Suggestions list: most used first.
create index if not exists exercise_catalog_uses_idx on public.exercise_catalog (uses desc);

alter table public.exercise_catalog enable row level security;

drop policy if exists "exercise_catalog: signed-in users can read" on public.exercise_catalog;
create policy "exercise_catalog: signed-in users can read"
  on public.exercise_catalog for select
  to authenticated
  using (true);

-- Read-only for app users; no insert/update/delete policies, so writes only happen server-side.
revoke all on public.exercise_catalog from anon, authenticated;
grant select on public.exercise_catalog to authenticated;
