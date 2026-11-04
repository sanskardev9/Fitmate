-- Set the first time someone opens FitMate from their Home Screen, so the
-- "Add to Home Screen" suggestion stops showing in their browser too.
alter table public.profiles add column if not exists app_installed_at timestamptz;
