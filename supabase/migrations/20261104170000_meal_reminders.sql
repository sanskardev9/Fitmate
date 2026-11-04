-- Meal reminders: one per planned meal that isn't logged by its time (Zomato-style nudges).
-- today_log = what the device has logged today: {"day": "YYYY-MM-DD", "slots": ["Breakfast", ...]}.
alter table public.profiles
  add column if not exists notify_meals boolean not null default true,
  add column if not exists today_log jsonb;
