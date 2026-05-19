-- ForgeLetter AI engine tables.
-- Run this in Supabase SQL Editor once. Coexists with the existing
-- application_briefs / user_profiles / etc. defined in supabase-schema.sql.

-- ============================================================
-- generated_letters
-- One row per generation request. The result + scoring lives here.
-- ============================================================
create table if not exists public.generated_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,

  -- Inputs
  resume_text text not null,
  job_description text not null,
  job_title text,
  company_name text,
  tone text not null default 'professional',

  -- Tier snapshot at time of generation (so historical quality is auditable
  -- even if the user later upgrades or downgrades)
  tier text not null check (tier in ('free', 'starter', 'pro', 'ultra')),

  -- Pipeline state
  generation_status text not null default 'queued'
    check (generation_status in ('queued', 'running', 'passed', 'failed', 'canceled')),
  failure_reason text,
  agents_run text[] not null default '{}',
  rewrite_cycles int not null default 0,

  -- Output
  final_cover_letter text,
  final_score int,
  hallucination_risk text check (hallucination_risk in ('none', 'low', 'medium', 'high')),

  -- ATS (pro+ulta only)
  ats_score int,
  ats_verdict text,
  ats_covered_keywords text[] default '{}',
  ats_missing_keywords text[] default '{}',

  -- PDF state (set when user downloads)
  template_chosen text check (template_chosen in ('teal_sidebar', 'cream_floral')),
  photo_uploaded boolean not null default false,
  linkedin_imported boolean not null default false,

  -- Timing
  created_at timestamptz not null default now(),
  completed_at timestamptz,

  -- Diagnostics
  total_tokens_input int,
  total_tokens_output int,
  total_duration_ms int
);

create index if not exists generated_letters_user_created_idx
  on public.generated_letters(user_id, created_at desc);

create index if not exists generated_letters_status_idx
  on public.generated_letters(generation_status)
  where generation_status in ('queued', 'running');

-- ============================================================
-- agent_outputs
-- One row per agent invocation. Audit trail + debugging.
-- ============================================================
create table if not exists public.agent_outputs (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generated_letters(id) on delete cascade,
  agent_name text not null,
  cycle_number int not null default 0,
  output_json jsonb not null,
  model_used text,
  duration_ms int,
  tokens_input int,
  tokens_output int,
  fallback_triggered boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists agent_outputs_generation_idx
  on public.agent_outputs(generation_id, created_at);

-- ============================================================
-- cover_letter_examples
-- Gold-standard letters used as few-shot retrieval. Embeddings added
-- when pgvector is enabled (Week 4 of the guide, not in v1).
-- ============================================================
create table if not exists public.cover_letter_examples (
  id uuid primary key default gen_random_uuid(),
  industry text not null,
  role text not null,
  seniority text not null check (seniority in ('junior', 'mid', 'senior', 'lead')),
  tone text not null,
  cover_letter_excerpt text not null,
  why_it_works text,
  quality_score int not null check (quality_score >= 0 and quality_score <= 100),
  tags text[] not null default '{}',
  approved boolean not null default false,
  -- embedding vector(1536),  -- enable when pgvector is set up
  created_at timestamptz not null default now()
);

create index if not exists cover_letter_examples_approved_idx
  on public.cover_letter_examples(approved, quality_score desc)
  where approved = true;

-- ============================================================
-- user_feedback
-- Outcome tracking from the post-generation banner.
-- ============================================================
create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  generation_id uuid references public.generated_letters(id) on delete cascade,
  outcome text not null check (outcome in ('heard_back', 'no_response', 'interview', 'offer', 'rejected', 'dismissed')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists user_feedback_user_idx
  on public.user_feedback(user_id, created_at desc);

-- ============================================================
-- RLS
-- All server routes use the service role key which bypasses RLS,
-- but we enable RLS so future direct-from-browser reads stay safe.
-- ============================================================
alter table public.generated_letters enable row level security;
alter table public.agent_outputs enable row level security;
alter table public.cover_letter_examples enable row level security;
alter table public.user_feedback enable row level security;

drop policy if exists "Users manage own generated letters" on public.generated_letters;
create policy "Users manage own generated letters"
  on public.generated_letters
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users read own agent outputs" on public.agent_outputs;
create policy "Users read own agent outputs"
  on public.agent_outputs
  for select
  using (
    exists (
      select 1 from public.generated_letters gl
      where gl.id = agent_outputs.generation_id and gl.user_id = auth.uid()
    )
  );

drop policy if exists "Anyone can read approved examples" on public.cover_letter_examples;
create policy "Anyone can read approved examples"
  on public.cover_letter_examples
  for select
  using (approved = true);

drop policy if exists "Users manage own feedback" on public.user_feedback;
create policy "Users manage own feedback"
  on public.user_feedback
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
