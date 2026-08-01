-- ForgeLetter database optimization pass (from the live schema audit).
--
-- Run once in the Supabase SQL Editor. Idempotent — re-running is safe.
--
-- Contents:
--   1. FIX: agent_outputs.cycle_number int → numeric. The pipeline
--      logs fractional cycle markers (0.25 = auto-clean, 98.5 = the
--      grounded fallback, 99.9 = verifier outage); against an int
--      column one such row rejected the whole batch insert and
--      production telemetry silently died (live audit: newest
--      agent_outputs row was 2026-05-29 while letters existed from
--      2026-08-01). The app now also retries with rounded cycles, but
--      this restores full-fidelity audit trails.
--   2. Performance indexes for every hot query path.
--   3. Scheduled purges via pg_cron so the retention promises in the
--      privacy policy hold without manual ops.

-- ============================================================
-- 1. Telemetry column fix
-- ============================================================
alter table public.agent_outputs
  alter column cycle_number type numeric using cycle_number::numeric;

-- ============================================================
-- 2. Performance indexes (all hot paths observed in code)
-- ============================================================

-- Quota counters + letters library: filter by user, order by recency.
create index if not exists generated_letters_user_created_idx
  on public.generated_letters (user_id, created_at desc);

-- Letters-page per-status COUNT queries.
create index if not exists generated_letters_user_status_idx
  on public.generated_letters (user_id, application_status);

-- Stalled-letter sweep + soft-delete filters.
create index if not exists generated_letters_user_genstatus_idx
  on public.generated_letters (user_id, generation_status);

-- Workspace form seed: newest briefs first.
create index if not exists application_briefs_user_updated_idx
  on public.application_briefs (user_id, updated_at desc);

-- Reset-token redemption is looked up by hash; purge scans by expiry.
create index if not exists password_reset_tokens_hash_idx
  on public.password_reset_tokens (token_hash);
create index if not exists password_reset_tokens_expiry_idx
  on public.password_reset_tokens (expires_at);

-- Account deletion removes contact messages by email.
create index if not exists contact_messages_email_idx
  on public.contact_messages (email);

-- Billing consent audit lookups.
create index if not exists consent_log_user_created_idx
  on public.consent_log (user_id, effective_at desc);

-- ============================================================
-- 3. Scheduled purges (pg_cron)
--    If this block errors with "extension pg_cron is not available",
--    enable it first: Dashboard → Database → Extensions → pg_cron.
-- ============================================================
create extension if not exists pg_cron;

-- 03:10 UTC nightly: purge >30-day-old recovery snapshots (the
-- privacy policy's 30-day recovery window).
select cron.schedule(
  'purge-recovery-snapshots',
  '10 3 * * *',
  $$select public.purge_expired_data_recovery_snapshots()$$
);

-- 03:20 UTC nightly: drop auth rate-limit rows older than 2 days
-- (the app already prunes opportunistically; this catches idle keys).
select cron.schedule(
  'purge-auth-rate-limits',
  '20 3 * * *',
  $$delete from public.auth_rate_limits where created_at < now() - interval '2 days'$$
);

-- 03:30 UTC nightly: drop reset tokens redeemed or expired >7 days ago.
select cron.schedule(
  'purge-reset-tokens',
  '30 3 * * *',
  $$delete from public.password_reset_tokens
    where (used_at is not null and used_at < now() - interval '7 days')
       or expires_at < now() - interval '7 days'$$
);
