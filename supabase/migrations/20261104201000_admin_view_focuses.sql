-- Admin view: add the "also want to" focuses (new column at the end).
create or replace view public.admin_user_activity as
WITH sessions AS (
         SELECT user_records.user_id,
            user_records.data
           FROM user_records
          WHERE user_records.collection = 'workoutSessions'::text AND NOT user_records.deleted AND (user_records.data ->> 'discardedAt'::text) IS NULL
        ), days AS (
         SELECT sessions.user_id,
            (to_timestamp((((sessions.data ->> 'startedAt'::text)::bigint) / 1000)::double precision) AT TIME ZONE 'Asia/Kolkata'::text)::date AS d
           FROM sessions
          WHERE (sessions.data ->> 'finishedAt'::text) IS NOT NULL
        UNION
         SELECT user_records.user_id,
            (user_records.data ->> 'date'::text)::date AS date
           FROM user_records
          WHERE user_records.collection = 'mealLogs'::text AND NOT user_records.deleted AND (user_records.data ->> 'date'::text) ~ '^\d{4}-\d{2}-\d{2}$'::text
        )
 SELECT u.id AS user_id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    p.full_name,
    p.gender,
    p.date_of_birth,
    p.height_cm,
    p.weight_kg,
    p.target_weight_kg,
    p.goal,
    p.goal_note,
    p.training_days_per_week,
    p.protein_target_g,
    p.calories_target,
    p.onboarded_at,
    ( SELECT count(*) AS count
           FROM sessions s
          WHERE s.user_id = u.id AND (s.data ->> 'finishedAt'::text) IS NOT NULL) AS workouts,
    ( SELECT count(*) AS count
           FROM user_records r
          WHERE r.user_id = u.id AND r.collection = 'sessionSets'::text AND NOT r.deleted) AS sets,
    ( SELECT count(*) AS count
           FROM user_records r
          WHERE r.user_id = u.id AND r.collection = 'mealLogs'::text AND NOT r.deleted) AS meal_logs,
    ( SELECT max(r.updated_at) AS max
           FROM user_records r
          WHERE r.user_id = u.id) AS last_sync,
    ( SELECT array_agg(DISTINCT days.d ORDER BY days.d DESC) AS array_agg
           FROM days
          WHERE days.user_id = u.id) AS active_days,
    p.streak_current,
    p.streak_freezes,
    p.streak_day,
    p.streak_today,
    p.timezone,
    ( SELECT count(*) AS count
           FROM push_subscriptions ps
          WHERE ps.user_id = u.id) AS push_devices,
    p.focuses
   FROM auth.users u
     LEFT JOIN profiles p ON p.id = u.id;

revoke all on public.admin_user_activity from anon, authenticated;
