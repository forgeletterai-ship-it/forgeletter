-- ForgeLetter quota hardening migration.
--
-- Run this once in the Supabase SQL editor.
-- Idempotent: rerunning is safe.
--
-- Closes three soundness gaps in the letter-quota system:
--
-- 1. Anniversary-aligned period boundary
--    users.current_period_start stores the Stripe subscription's
--    period start. The webhook keeps it fresh. The quota query
--    prefers this over the calendar-month / Jan-1 fallback so a
--    user's letter window matches the period Stripe billed them
--    for.
--
-- 2. Stale "running" rows are excluded
--    The atomic-gate function only counts running rows newer than 7
--    minutes. Orphaned rows (Vercel function timeout at 5min,
--    pipeline crash before the failed update lands, etc.) stop
--    eating the user's slot 7 minutes later.
--
-- 3. Race-proof quota gate
--    try_start_letter() does the SELECT count + INSERT row in one
--    transaction, serialized per-user via a Postgres advisory lock.
--    Two concurrent requests from the same user can no longer both
--    pass the gate and exceed the limit.

------------------------------------------------------------
-- 1. users.current_period_start
------------------------------------------------------------
alter table public.users
  add column if not exists current_period_start timestamptz;

------------------------------------------------------------
-- 2. Atomic letter-slot gate
------------------------------------------------------------
create or replace function public.try_start_letter(
  p_user_id uuid,
  p_max_count int,
  p_period_start timestamptz,
  p_resume_text text,
  p_job_description text,
  p_job_title text,
  p_company_name text,
  p_tone text,
  p_tier text
)
returns table (granted boolean, used_count int, letter_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_id uuid;
begin
  -- Serialize concurrent quota gates for this user. The advisory
  -- lock is held until the end of the transaction (i.e. until this
  -- function returns), at which point Postgres releases it.
  perform pg_advisory_xact_lock(hashtext('letter_slot:' || p_user_id::text));

  -- Count rows that consume a slot for this user, in this period.
  -- Running rows older than 7 minutes are treated as orphaned
  -- (Vercel function timed out, pipeline crashed pre-status-update,
  -- etc.) and excluded so they automatically refund the slot.
  select count(*)::int into v_count
  from public.generated_letters
  where user_id = p_user_id
    and created_at >= p_period_start
    and (
      generation_status = 'passed'
      or (generation_status = 'running' and created_at > now() - interval '7 minutes')
    );

  if v_count >= p_max_count then
    return query select false, v_count, null::uuid;
    return;
  end if;

  -- Slot available. Insert the placeholder running row inside the
  -- same transaction as the count, so a second concurrent request
  -- can never beat us to the same slot.
  insert into public.generated_letters (
    user_id, resume_text, job_description, job_title, company_name,
    tone, tier, generation_status
  )
  values (
    p_user_id, p_resume_text, p_job_description, p_job_title,
    p_company_name, p_tone, p_tier, 'running'
  )
  returning id into v_id;

  return query select true, v_count + 1, v_id;
end;
$$;

-- The webhook handler and /api/generate run as the service role.
grant execute on function public.try_start_letter(
  uuid, int, timestamptz, text, text, text, text, text, text
) to service_role;
