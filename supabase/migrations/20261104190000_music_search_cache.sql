-- Cached YouTube music searches (quick picks and user searches), so the free daily quota lasts.
create table if not exists public.yt_search_cache (
  query_key text primary key check (char_length(query_key) <= 120),
  results jsonb not null,
  fetched_at timestamptz not null default now()
);
create index if not exists yt_search_cache_fetched on public.yt_search_cache (fetched_at desc);
alter table public.yt_search_cache enable row level security;
revoke all on public.yt_search_cache from anon, authenticated;
