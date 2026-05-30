-- Adds structured persistence for the profile's "Experience & wins" step.
--
-- Before this migration the structured employer / internship / university
-- blocks lived only in React state on the profile page and serialised to
-- plain text in user_profiles.key_achievements on save (lossy). After this,
-- the structured data is persisted as JSONB on user_profiles, and briefs +
-- generated letters can record which experience entries the user opted to
-- include for that specific generation.
--
-- Run in Supabase SQL Editor. Idempotent.

-- ============================================================
-- user_profiles: structured experience blocks + sibling text fields
-- ============================================================
alter table public.user_profiles
  add column if not exists experience_blocks jsonb not null default '[]'::jsonb;

alter table public.user_profiles
  add column if not exists qualifications text not null default '';

-- Named tools & software (products: dbt, Looker, SQL, …), persisted
-- separately from `strengths` (skills/competencies) so the ATS surface
-- and the hallucination verifier treat tools as explicit grounded facts.
alter table public.user_profiles
  add column if not exists tools text not null default '';

alter table public.user_profiles
  add column if not exists notes text not null default '';

alter table public.user_profiles
  add column if not exists portfolio_link text not null default '';

-- ============================================================
-- application_briefs: which experience block ids the user selected
-- when saving this brief (empty array = use defaults at generate time)
-- ============================================================
alter table public.application_briefs
  add column if not exists selected_experience_ids text[] not null default '{}';

-- ============================================================
-- generated_letters: same column on the generation row so the trace is
-- complete (which experiences were actually fed to the agent pipeline)
-- ============================================================
alter table public.generated_letters
  add column if not exists selected_experience_ids text[] not null default '{}';
