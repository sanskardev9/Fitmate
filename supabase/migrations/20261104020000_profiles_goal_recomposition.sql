-- Add the "build muscle and lose fat" (body recomposition) goal.
alter table public.profiles drop constraint if exists profiles_goal_check;
alter table public.profiles add constraint profiles_goal_check
  check (goal in ('lose_fat', 'recomposition', 'build_muscle', 'gain_strength', 'calisthenics_skills', 'maintain', 'general_fitness'));
