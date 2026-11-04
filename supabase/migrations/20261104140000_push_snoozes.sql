-- "Remind me in 1 hour" from a notification: the reminder job re-sends it when due.
create table if not exists public.push_snoozes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  due_at timestamptz not null,
  payload jsonb not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists push_snoozes_due on public.push_snoozes (due_at) where sent_at is null;
alter table public.push_snoozes enable row level security;
revoke all on public.push_snoozes from anon, authenticated;
