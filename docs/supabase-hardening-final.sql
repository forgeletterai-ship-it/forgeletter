-- ForgeLetter — final database hardening pass.
--
-- Run AFTER docs/supabase-rls-lockdown.sql. Idempotent.
--
-- Closes the two findings left after the RLS lockdown:
--   1. one permissive policy that allowed public reads
--   2. two SECURITY DEFINER functions with an unpinned search_path
--
-- Neither is currently exploitable (anon has no privileges on the
-- public schema after the lockdown), but both are the kind of latent
-- hole that becomes live the moment a future migration re-grants
-- something. Defence in depth means no single mistake is fatal.

-- ============================================================
-- 1. Remove the last permissive policy
--
--    "Anyone can read approved examples" on cover_letter_examples
--    allowed unauthenticated SELECT of every approved row. That table
--    holds only the curated gold-letter corpus seeded by
--    scripts/seed-gold-letters.ts — no customer data ever lands there
--    (customer winners are read from generated_letters scoped by
--    user_id) — so this was low severity, not zero. The app reads the
--    table with the service role, which ignores policies, so dropping
--    it costs nothing.
--
--    The remaining six policies all key off auth.uid(). ForgeLetter
--    issues no Supabase JWTs (sessions are NextAuth), so auth.uid()
--    is always NULL and those policies deny everyone — keep them as a
--    free extra layer.
-- ============================================================
drop policy if exists "Anyone can read approved examples"
  on public.cover_letter_examples;

-- ============================================================
-- 2. Pin search_path on SECURITY DEFINER functions
--
--    A SECURITY DEFINER function runs with its owner's privileges
--    (postgres). With a mutable search_path, anyone able to create
--    objects in an earlier schema could shadow a table or function
--    name referenced inside and have that code execute as the owner.
--    Pinning the path removes the vector entirely. This is also the
--    "Function Search Path Mutable" item in Supabase's linter.
--
--    Note the explicit trailing pg_temp. Postgres searches the temp
--    schema FIRST unless pg_temp appears in the list, so a bare
--    "set search_path = public" still leaves a temp-object shadowing
--    path open. All three definer functions are pinned the same way
--    below so there is no exception to remember.
-- ============================================================
alter function public.purge_expired_data_recovery_snapshots()
  set search_path = public, pg_temp;

alter function public.prune_stripe_processed_events()
  set search_path = public, pg_temp;

-- Was already SECURITY DEFINER with "set search_path = public";
-- re-pinned to place pg_temp last.
alter function public.try_start_letter(
  uuid, int, timestamptz, text, text, text, text, text, text
) set search_path = public, pg_temp;

-- ============================================================
-- 3. Verify
-- ============================================================

-- (a) Every SECURITY DEFINER function should now show a search_path
--     in its config. proconfig NULL on a definer function = still open.
select
  p.proname as function_name,
  p.prosecdef as security_definer,
  p.proconfig as settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by p.proname;

-- (b) No policy should be readable by anon/public with a blanket
--     TRUE condition. Anything listed here deserves a second look.
select tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public'
  and qual = 'true'
order by tablename;

-- (c) Anon and authenticated should hold NO privileges on public.
--     An empty result is the pass condition.
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name;
