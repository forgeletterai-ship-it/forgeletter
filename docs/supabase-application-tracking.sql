-- Application tracking migration.
--
-- Run this once in the Supabase SQL editor.
-- Idempotent: rerunning is safe.
--
-- Adds per-letter outcome tracking so a sent letter can be marked
-- "submitted → interviewing → offer / rejected / ghosted". The
-- offer/interview verdicts are also the input signal we use to
-- promote winning letters into the example-retrieval gold-standard
-- base over time.

------------------------------------------------------------
-- generated_letters.application_status
--   not_submitted | submitted | interviewing | offer
--   | rejected    | ghosted
--
-- Default 'not_submitted' so existing rows backfill cleanly.
------------------------------------------------------------
alter table public.generated_letters
  add column if not exists application_status text not null default 'not_submitted';

-- Hard-enforce the enumerated set. Constraint is added separately so
-- the migration is idempotent (drop-then-add pattern).
alter table public.generated_letters
  drop constraint if exists generated_letters_application_status_check;
alter table public.generated_letters
  add constraint generated_letters_application_status_check
  check (application_status in (
    'not_submitted',
    'submitted',
    'interviewing',
    'offer',
    'rejected',
    'ghosted'
  ));

------------------------------------------------------------
-- Timestamps + free-form notes
--   submitted_at — when the user marked it as submitted
--   outcome_at   — when the user marked the verdict (interview/offer/etc.)
--   outcome_notes — free text, optional, max 2000 chars enforced in the API
------------------------------------------------------------
alter table public.generated_letters
  add column if not exists submitted_at timestamptz;

alter table public.generated_letters
  add column if not exists outcome_at timestamptz;

alter table public.generated_letters
  add column if not exists outcome_notes text;

------------------------------------------------------------
-- Index for the insights aggregation on /dashboard/letters.
-- Partial index keeps it tiny since most rows will be 'not_submitted'.
------------------------------------------------------------
create index if not exists generated_letters_user_outcome_idx
  on public.generated_letters (user_id, application_status)
  where application_status <> 'not_submitted';
