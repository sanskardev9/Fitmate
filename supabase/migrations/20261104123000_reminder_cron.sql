-- Every 15 minutes, ask the app to send any workout / streak reminders that are due.
-- The cron secret lives in Supabase Vault (name: fitmate_cron_secret) and is set separately:
--   select vault.create_secret('<CRON_SECRET>', 'fitmate_cron_secret');
-- so it never appears in migrations or git.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'fitmate-reminders';

select cron.schedule(
  'fitmate-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://fitmateapp.vercel.app/api/push/cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'fitmate_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
