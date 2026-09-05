-- ForgeLetter — Row Level Security lockdown.
--
-- WHY THIS IS SAFE TO RUN AS-IS
-- ForgeLetter does not use Supabase Auth (sessions come from NextAuth)
-- and every database call in the app goes through the SERVICE ROLE key
-- from server-side code only. Verified across the codebase: all 24
-- Supabase imports are `supabaseAdmin`; the anon client is never used.
--
-- The service role bypasses RLS entirely, so enabling RLS with NO
-- policies changes nothing for the app while completely closing the
-- anon/public REST surface that Supabase flagged:
--
--   "Table publicly accessible — anyone with your project URL can
--    read, edit, and delete all data in this table."
--
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- IF YOU LATER ADD SUPABASE AUTH: you will need per-table policies
-- and to re-grant privileges to `authenticated` — see step 3's note.

-- ============================================================
-- 1. Enable RLS on every table in the public schema
--    A loop rather than a hand-written list, so any table added
--    since (or missed) is covered automatically.
-- ============================================================
do $$
declare
  t record;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'alter table public.%I enable row level security',
      t.tablename
    );
    raise notice 'RLS enabled: %', t.tablename;
  end loop;
end $$;

-- ============================================================
-- 2. Revoke the anon/authenticated grants (defence in depth)
--    RLS alone already returns zero rows for these roles. Removing
--    the table grants means the REST API rejects the request before
--    it ever reaches a policy check.
-- ============================================================
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from authenticated;
revoke all on all functions in schema public from authenticated;

-- Future tables created in this schema should not grant them either.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

alter default privileges in schema public revoke all on tables from authenticated;
alter default privileges in schema public revoke all on sequences from authenticated;
alter default privileges in schema public revoke all on functions from authenticated;

-- ============================================================
-- 3. Verify — every row should read rls_enabled = true
-- ============================================================
select
  tablename,
  rowsecurity as rls_enabled,
  (
    select count(*)
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = t.tablename
  ) as policy_count
from pg_tables t
where schemaname = 'public'
order by tablename;

-- policy_count of 0 is CORRECT here: with RLS on and no policies,
-- anon and authenticated can see and change nothing, while the
-- service role the app uses is unaffected.
