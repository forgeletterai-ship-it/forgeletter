-- Launch-interest waitlist (pre-launch splash email box).
-- Run once in Supabase Studio -> SQL editor.
--
-- notified_at is stamped when the "we're live" email is sent, so the
-- sender is idempotent and can run repeatedly (cron + manual) without
-- double-mailing anyone.

create table if not exists launch_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now(),
  notified_at timestamptz
);

alter table launch_signups enable row level security;
-- No public policies on purpose: only the service role (API routes)
-- reads or writes this table.
