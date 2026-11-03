-- Cloud copy of each user's local (IndexedDB) data, so the same account shows the same plans,
-- workouts and meals on every device. One row per local record; the app keeps a local copy
-- and syncs both ways (last write wins).

create table if not exists public.user_records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection text not null check (char_length(collection) between 1 and 64),
  id text not null check (char_length(id) between 1 and 128),
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, collection, id)
);

comment on table public.user_records is 'Synced copy of local FitMate records (plans, sessions, sets, meals, preferences).';

-- Pull query: "everything of mine changed since <cursor>".
create index if not exists user_records_user_updated_idx on public.user_records (user_id, updated_at);

-- Server clock decides updated_at, so pull cursors never depend on device clocks.
create or replace function public.user_records_touch()
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

drop trigger if exists user_records_touch on public.user_records;
create trigger user_records_touch
  before insert or update on public.user_records
  for each row execute function public.user_records_touch();

alter table public.user_records enable row level security;

drop policy if exists "user_records: read own" on public.user_records;
create policy "user_records: read own" on public.user_records
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_records: insert own" on public.user_records;
create policy "user_records: insert own" on public.user_records
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_records: update own" on public.user_records;
create policy "user_records: update own" on public.user_records
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Deletes are soft (deleted = true) so other devices learn about them; no delete policy.
revoke all on table public.user_records from anon, authenticated, public;
grant select, insert, update on table public.user_records to authenticated;
