-- Data recovery snapshots migration.
--
-- Run this once in the Supabase SQL editor.
-- Idempotent: rerunning is safe.
--
-- When a user clicks "Delete workspace data" the API snapshots all
-- their content as JSON into this table BEFORE deleting from the
-- live tables. The snapshot can be restored for 30 days; after
-- that an automated cron deletes the snapshot too. Customer-facing
-- copy in Settings says "deletion is permanent" — but support /
-- ops can restore within the recovery window via a manual call.

create table if not exists public.data_recovery_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Optional ISO date past which this snapshot becomes purgeable.
  -- The cron deletes snapshots with expires_at < now().
  expires_at timestamptz not null default (now() + interval '30 days'),
  -- Brief manifest visible in support tooling without unpacking
  -- the full snapshot.
  letters_count integer not null default 0,
  briefs_count integer not null default 0,
  profile_present boolean not null default false,
  settings_present boolean not null default false,
  -- The full payload. Compressed JSONB; Supabase handles encoding.
  snapshot jsonb not null
);

alter table public.data_recovery_snapshots enable row level security;
-- No public policies. Service role only. Customers can request
-- restore via support email; the endpoint at
-- /api/account/restore-data uses the service role and checks
-- user_id ownership.

create index if not exists data_recovery_snapshots_user_idx
  on public.data_recovery_snapshots (user_id, created_at desc);

create index if not exists data_recovery_snapshots_expires_idx
  on public.data_recovery_snapshots (expires_at);

-- Convenience function for the cleanup cron. The cron job calls
-- supabase rpc('purge_expired_data_recovery_snapshots') daily.
create or replace function public.purge_expired_data_recovery_snapshots()
returns integer
language plpgsql
security definer
as $$
declare
  deleted_count integer;
begin
  delete from public.data_recovery_snapshots
   where expires_at < now()
  returning 1 into deleted_count;
  return coalesce(deleted_count, 0);
end;
$$;
