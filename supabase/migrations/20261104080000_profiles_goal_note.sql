-- Free-text goal in the user's own words (e.g. "run a 10k", "first muscle-up"), passed to the
-- AI as-is. The structured "goal" column still drives the calorie/protein calculation.
alter table public.profiles
  add column if not exists goal_note text check (char_length(goal_note) <= 200);
