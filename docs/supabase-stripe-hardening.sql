-- Stripe webhook hardening migration.
--
-- Run this once in the Supabase SQL editor.
-- Idempotent: rerunning is safe.
--
-- Adds:
--   1. stripe_processed_events table — webhook idempotency log.
--      The webhook handler inserts event.id before processing.
--      Stripe retries the same event up to 3 days when our endpoint
--      returns 5xx; without this table every retry would re-process
--      side effects (double-credit one-time purchases, repeated
--      plan changes, etc.).
--
--   2. users.past_due_since timestamp — set by invoice.payment_failed,
--      cleared by invoice.payment_succeeded. Lets the UI show a
--      "your card was declined" banner and lets us auto-downgrade
--      after a grace period.
--
--   3. users.disputed_at timestamp — set by charge.dispute.created.
--      Flags the account for ops review so attackers can't get free
--      service by chargeback.

------------------------------------------------------------
-- 1. stripe_processed_events
------------------------------------------------------------
create table if not exists public.stripe_processed_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_processed_events enable row level security;
-- No policies on this table: only the service role (used by the
-- webhook handler) needs access. anon and authenticated see nothing.

-- Auto-prune events older than 90 days so the table stays small.
-- Stripe only retries for ~3 days; 90 days is generous.
create or replace function public.prune_stripe_processed_events()
returns void
language sql
security definer
as $$
  delete from public.stripe_processed_events
  where processed_at < now() - interval '90 days';
$$;

------------------------------------------------------------
-- 2. users.past_due_since
------------------------------------------------------------
alter table public.users
  add column if not exists past_due_since timestamptz;

------------------------------------------------------------
-- 3. users.disputed_at
------------------------------------------------------------
alter table public.users
  add column if not exists disputed_at timestamptz;
