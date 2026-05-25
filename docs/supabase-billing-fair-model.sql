-- Fair-letter-cap billing model migration.
--
-- Run this once in the Supabase SQL editor.
-- Idempotent: rerunning is safe.
--
-- Adds the columns + tables needed by the new plan-switch model:
--
--   1. users.accrued_cap_this_period — letters the user earned at
--      previous plans during the current period, frozen in. Reset
--      to 0 on every renewal.
--
--   2. users.current_segment_started_at — when the user's current
--      plan stretch began. Reset to period_start on every renewal.
--
--   3. users.scheduled_plan_change — JSONB { toPlan, effectiveAt }
--      that records a deferred downgrade scheduled via Stripe
--      subscription_schedules. UI reads this to render the
--      "Your plan will change on X" banner.
--
--   4. consent_log table — audit trail of every plan-change
--      consent click. Satisfies GDPR Article 7 (proof of consent)
--      and the EU Consumer Rights Directive proof requirements
--      (waiver of 14-day right of withdrawal on upgrades).
--
-- All additive. No destructive operations on existing data.

------------------------------------------------------------
-- 1. users.accrued_cap_this_period
------------------------------------------------------------
alter table public.users
  add column if not exists accrued_cap_this_period numeric not null default 0;

------------------------------------------------------------
-- 2. users.current_segment_started_at
------------------------------------------------------------
alter table public.users
  add column if not exists current_segment_started_at timestamptz;

-- Backfill: existing users have not yet experienced a plan change,
-- so their current segment effectively started at current_period_start.
-- Coalesce with created_at as the absolute fallback.
update public.users
   set current_segment_started_at = coalesce(current_period_start, created_at, now())
 where current_segment_started_at is null;

------------------------------------------------------------
-- 3. users.scheduled_plan_change
------------------------------------------------------------
alter table public.users
  add column if not exists scheduled_plan_change jsonb;

------------------------------------------------------------
-- 4. consent_log table — every plan-change consent click
------------------------------------------------------------
create table if not exists public.consent_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  action text not null check (action in (
    'signup',
    'upgrade_confirm',
    'downgrade_confirm',
    'cancel_scheduled_change',
    'cancel_subscription'
  )),
  from_plan text,
  to_plan text,
  effective_at timestamptz,
  charge_eur numeric,
  letters_remaining_after numeric,
  consent_text_version text not null,
  ip_hash text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.consent_log enable row level security;

-- Service role only; no anon/authenticated reads. Customers can
-- request their consent history via the GDPR /api/account/export
-- endpoint which uses the service role and filters by user_id.
-- No public policies = no public access.

create index if not exists consent_log_user_idx
  on public.consent_log (user_id, created_at desc);

create index if not exists consent_log_action_idx
  on public.consent_log (action, created_at desc);

------------------------------------------------------------
-- 5. Make sure the existing try_start_letter function can still
--    be called even though it doesn't know about the fair-cap
--    columns. The application layer now computes the fair cap
--    in TypeScript and passes it as p_max_count, so the function
--    body needs no change.
------------------------------------------------------------
-- (no-op section — kept for documentation only)
