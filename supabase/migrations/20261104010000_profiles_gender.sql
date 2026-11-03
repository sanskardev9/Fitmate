-- Rename profiles.sex to gender and limit it to male / female.
-- Any value outside the new set becomes null so the constraint can be added safely.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'sex'
  ) then
    alter table public.profiles rename column sex to gender;
  end if;
end $$;

alter table public.profiles drop constraint if exists profiles_sex_check;
alter table public.profiles drop constraint if exists profiles_gender_check;

update public.profiles set gender = null where gender is not null and gender not in ('male', 'female');

alter table public.profiles add constraint profiles_gender_check check (gender in ('male', 'female'));
