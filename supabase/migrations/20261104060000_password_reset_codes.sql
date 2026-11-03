-- One-time 6-digit codes for password reset (FitMate's own flow, emailed via Brevo).
-- Only a salted hash of the code is stored. Server-only: no client access at all.

create table if not exists public.password_reset_codes (
  email text primary key check (char_length(email) between 3 and 254),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts smallint not null default 0,
  last_sent_at timestamptz not null default now(),
  window_start timestamptz not null default now(),
  sends_in_window smallint not null default 1
);

comment on table public.password_reset_codes is 'Hashed 6-digit password reset codes. Written/read only by /api/auth/reset/* with the secret key.';

alter table public.password_reset_codes enable row level security;
revoke all on public.password_reset_codes from anon, authenticated;
