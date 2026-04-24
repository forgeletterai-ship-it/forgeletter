-- LetterForge production tables.
-- Run this in Supabase SQL Editor once per project.

create table if not exists public.user_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  professional_headline text not null default '',
  target_roles text not null default '',
  industries text not null default '',
  key_achievements text not null default '',
  strengths text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.application_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default '',
  company text not null default '',
  tone text not null default 'Professional',
  job_description text not null default '',
  candidate_experience text not null default '',
  generated_letter text,
  status text not null default 'draft'
    check (status in ('draft', 'brief_ready', 'generated', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists application_briefs_user_updated_idx
  on public.application_briefs(user_id, updated_at desc);

create table if not exists public.user_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  default_tone text not null default 'Professional',
  email_updates boolean not null default true,
  product_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  name text not null default '',
  email text not null default '',
  topic text not null default 'support',
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_hash_idx
  on public.password_reset_tokens(token_hash);

alter table public.user_profiles enable row level security;
alter table public.application_briefs enable row level security;
alter table public.user_settings enable row level security;
alter table public.contact_messages enable row level security;
alter table public.password_reset_tokens enable row level security;

-- The app writes through server routes with SUPABASE_SERVICE_ROLE_KEY.
-- These policies also allow future direct Supabase client reads/writes
-- if you migrate dashboard screens to Supabase auth sessions later.
drop policy if exists "Users manage own profile" on public.user_profiles;
create policy "Users manage own profile"
  on public.user_profiles
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own briefs" on public.application_briefs;
create policy "Users manage own briefs"
  on public.application_briefs
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own settings" on public.user_settings;
create policy "Users manage own settings"
  on public.user_settings
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
