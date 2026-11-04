-- Delivery tracking for notifications: every step a push reaches, so we can see where it stops.
--   server:  sent | failed | removed (device gone)
--   device:  received | shown | show_failed | clicked
--   setup:   subscribed | subscribe_failed | permission_denied
create table if not exists public.push_events (
  id bigint generated always as identity primary key,
  push_id uuid,                 -- one id per notification per device, shared by all its steps
  user_id uuid references auth.users (id) on delete cascade,
  device text,                  -- short label from the endpoint + browser
  stage text not null check (char_length(stage) <= 32),
  detail text check (detail is null or char_length(detail) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists push_events_recent on public.push_events (created_at desc);
create index if not exists push_events_push on public.push_events (push_id);
alter table public.push_events enable row level security;
revoke all on public.push_events from anon, authenticated;
