-- ForgeLetter Row-Level Security migration.
--
-- Purpose: lock every application table so that the public anon key
-- (NEXT_PUBLIC_SUPABASE_ANON_KEY shipped to the browser) can NEVER
-- read or mutate another user's data. Only the server-side service-
-- role key bypasses RLS, and that key is held by Vercel server
-- routes — never the browser.
--
-- Run this once in the Supabase SQL editor:
--   Project → SQL → New query → paste this whole file → Run.
-- Idempotent: rerunning is safe; statements use IF NOT EXISTS or
-- equivalent DROP ... IF EXISTS patterns.
--
-- After running, validate from the Supabase dashboard:
--   Database → Tables → each table → RLS should show "Enabled".
--   Authentication → Policies → expect rows for every table below.

------------------------------------------------------------
-- Enable RLS on every application table.
------------------------------------------------------------
alter table public.users                 enable row level security;
alter table public.user_profiles         enable row level security;
alter table public.user_settings         enable row level security;
alter table public.application_briefs    enable row level security;
alter table public.generated_letters     enable row level security;
alter table public.agent_outputs         enable row level security;
alter table public.password_reset_tokens enable row level security;
alter table public.contact_messages      enable row level security;
alter table public.cover_letter_examples enable row level security;

------------------------------------------------------------
-- users — a user can only see / update their own row.
------------------------------------------------------------
drop policy if exists "users_select_self" on public.users;
create policy "users_select_self"
  on public.users for select
  using (id = auth.uid());

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

------------------------------------------------------------
-- user_profiles, user_settings — one row per user, owner-only.
------------------------------------------------------------
drop policy if exists "user_profiles_owner" on public.user_profiles;
create policy "user_profiles_owner"
  on public.user_profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_settings_owner" on public.user_settings;
create policy "user_settings_owner"
  on public.user_settings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

------------------------------------------------------------
-- application_briefs, generated_letters, agent_outputs —
-- owner-only.
------------------------------------------------------------
drop policy if exists "application_briefs_owner" on public.application_briefs;
create policy "application_briefs_owner"
  on public.application_briefs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "generated_letters_owner" on public.generated_letters;
create policy "generated_letters_owner"
  on public.generated_letters for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "agent_outputs_owner" on public.agent_outputs;
create policy "agent_outputs_owner"
  on public.agent_outputs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

------------------------------------------------------------
-- password_reset_tokens — sensitive; never readable from anon.
-- With RLS enabled and no policy, anon and authenticated roles see
-- zero rows. Service role bypasses RLS.
------------------------------------------------------------

------------------------------------------------------------
-- contact_messages — write-only from anon (form submissions),
-- never readable. Read only via service role from the admin UI.
------------------------------------------------------------
drop policy if exists "contact_messages_insert_anon" on public.contact_messages;
create policy "contact_messages_insert_anon"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

------------------------------------------------------------
-- cover_letter_examples — public read for the marketing site, no
-- writes from anon.
------------------------------------------------------------
drop policy if exists "cover_letter_examples_public_read" on public.cover_letter_examples;
create policy "cover_letter_examples_public_read"
  on public.cover_letter_examples for select
  to anon, authenticated
  using (true);
