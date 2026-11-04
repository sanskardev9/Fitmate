-- Morning plan notification (8 am local): today's first meal + workout, framed around the streak.
alter table public.profiles add column if not exists notify_morning boolean not null default true;
