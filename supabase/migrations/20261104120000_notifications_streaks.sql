-- Push notifications + streak summary (Duolingo-style reminders).
--
-- The app works out the streak on the device (it has the plans and logs). It reports a small
-- summary to the profile so the server knows when to send "save your streak" reminders,
-- and in which time zone the user's day ends.

alter table public.profiles
  add column if not exists timezone text check (timezone is null or char_length(timezone) <= 64),
  add column if not exists streak_current integer not null default 0 check (streak_current >= 0),
  add column if not exists streak_freezes integer not null default 0 check (streak_freezes between 0 and 2),
  add column if not exists streak_day date,           -- the local day the summary was taken
  add column if not exists streak_today text check (streak_today in ('done', 'rest', 'pending')),
  add column if not exists plan_week jsonb,           -- {"0".."6": {"workout": "Push A" | null, "meals": n}}
  add column if not exists notify_workout boolean not null default true,
  add column if not exists notify_workout_time time not null default '07:00',
  add column if not exists notify_streak boolean not null default true;

-- One row per device that allowed notifications. Only the server reads or writes it.
create table if not exists public.push_subscriptions (
  endpoint text primary key check (char_length(endpoint) <= 1000),
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

-- Every reminder sent; the primary key stops the same reminder going out twice in a day.
create table if not exists public.notification_log (
  user_id uuid references auth.users (id) on delete cascade,
  kind text not null,
  day date not null,
  title text,
  body text,
  sent integer not null default 0,
  sent_at timestamptz not null default now()
);
-- Admin messages to everyone are logged with user_id null (nulls never collide here).
create unique index if not exists notification_log_once on public.notification_log (user_id, kind, day);
create index if not exists notification_log_recent on public.notification_log (sent_at desc);
alter table public.notification_log enable row level security;
revoke all on public.notification_log from anon, authenticated;

-- Admin view: add streak summary + devices with notifications on (new columns go at the end).
create or replace view public.admin_user_activity as
with sessions as (
  select user_id, data from public.user_records
  where collection = 'workoutSessions' and not deleted and data ->> 'discardedAt' is null
),
days as (
  select user_id, (to_timestamp((data ->> 'startedAt')::bigint / 1000) at time zone 'Asia/Kolkata')::date as d
  from sessions where data ->> 'finishedAt' is not null
  union
  select user_id, (data ->> 'date')::date from public.user_records
  where collection = 'mealLogs' and not deleted and data ->> 'date' ~ '^\d{4}-\d{2}-\d{2}$'
)
select
  u.id as user_id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  p.full_name, p.gender, p.date_of_birth, p.height_cm, p.weight_kg, p.target_weight_kg, p.goal, p.goal_note,
  p.training_days_per_week, p.protein_target_g, p.calories_target, p.onboarded_at,
  (select count(*) from sessions s where s.user_id = u.id and s.data ->> 'finishedAt' is not null) as workouts,
  (select count(*) from public.user_records r where r.user_id = u.id and r.collection = 'sessionSets' and not r.deleted) as sets,
  (select count(*) from public.user_records r where r.user_id = u.id and r.collection = 'mealLogs' and not r.deleted) as meal_logs,
  (select max(r.updated_at) from public.user_records r where r.user_id = u.id) as last_sync,
  (select array_agg(distinct d order by d desc) from days where days.user_id = u.id) as active_days,
  p.streak_current, p.streak_freezes, p.streak_day, p.streak_today, p.timezone,
  (select count(*) from public.push_subscriptions ps where ps.user_id = u.id) as push_devices
from auth.users u
left join public.profiles p on p.id = u.id;

revoke all on public.admin_user_activity from anon, authenticated;
