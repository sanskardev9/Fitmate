-- Cache of YouTube recipe videos found for a dish name, so each dish is searched once
-- (YouTube API quota is small) and every user gets the same video instantly.
-- Server-only: read/written by /api/recipe-video with the secret key. No client access.

create table if not exists public.recipe_videos (
  dish_key text primary key check (char_length(dish_key) between 2 and 120),
  video_id text check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text,
  created_at timestamptz not null default now()
);

comment on table public.recipe_videos is 'YouTube video found per dish (dish_key = lower-case dish name). video_id null = searched, nothing suitable.';

alter table public.recipe_videos enable row level security;
revoke all on public.recipe_videos from anon, authenticated;
