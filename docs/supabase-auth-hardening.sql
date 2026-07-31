-- ForgeLetter auth hardening migration.
--
-- Run in the Supabase SQL Editor. Idempotent — re-running is safe.
--
-- Adds:
--   1. auth_rate_limits — sliding-window attempt log for login,
--      signup, and password-reset endpoints. Keys are salted SHA-256
--      hashes of IP / email (no raw PII stored). Rows self-prune via
--      opportunistic deletes in lib/rate-limit.ts; the table stays
--      tiny. Without this table the app fails OPEN (no rate limiting,
--      one warning logged) — apply before launch.
--   2. users.password_changed_at — session-revocation anchor. Sessions
--      are stamped with this value at sign-in; when a password reset
--      updates it, every previously-issued session stops validating on
--      its next request. Without the column, revocation is skipped
--      (old behavior) — apply before launch.

-- ============================================================
-- 1. Rate-limit attempt log
-- ============================================================
create table if not exists public.auth_rate_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  created_at timestamptz not null default now()
);

create index if not exists auth_rate_limits_key_created_idx
  on public.auth_rate_limits (key, created_at desc);

-- Service-role only; deny-all for anon/authenticated.
alter table public.auth_rate_limits enable row level security;

-- ============================================================
-- 2. Session revocation anchor
-- ============================================================
alter table public.users
  add column if not exists password_changed_at timestamptz;
