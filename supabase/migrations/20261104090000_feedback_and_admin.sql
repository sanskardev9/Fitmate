-- Feedback & ratings from users, an admin-only activity view, and a public reviews view.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rating smallint check (rating between 1 and 5),
  kind text not null default 'review' check (kind in ('review', 'idea', 'bug', 'other')),
  message text check (char_length(message) <= 2000),
  allow_public boolean not null default false,  -- user said it may be shown on the website
  is_public boolean not null default false,     -- admin approved it for the website
  status text not null default 'new' check (status in ('new', 'read', 'done')),
  created_at timestamptz not null default now(),
  check (rating is not null or char_length(coalesce(message, '')) > 0)
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

drop policy if exists "feedback: insert own" on public.feedback;
create policy "feedback: insert own" on public.feedback for insert to authenticated
  with check ((select auth.uid()) = user_id and is_public = false and status = 'new');

drop policy if exists "feedback: read own" on public.feedback;
create policy "feedback: read own" on public.feedback for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.feedback from anon, authenticated;
grant select, insert on public.feedback to authenticated;

-- Approved reviews for the website: first name, rating and message only.
create or replace view public.public_reviews as
  select f.id, split_part(coalesce(p.full_name, 'FitMate user'), ' ', 1) as name, f.rating, f.message, f.created_at
  from public.feedback f
  left join public.profiles p on p.id = f.user_id
  where f.is_public and f.allow_public and f.rating is not null and char_length(coalesce(f.message, '')) > 0;

revoke all on public.public_reviews from anon, authenticated;
grant select on public.public_reviews to anon, authenticated;

-- Per-user activity for the admin panel (server-only: no anon/authenticated access).
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
  (select array_agg(distinct d order by d desc) from days where days.user_id = u.id) as active_days
from auth.users u
left join public.profiles p on p.id = u.id;

revoke all on public.admin_user_activity from anon, authenticated;
