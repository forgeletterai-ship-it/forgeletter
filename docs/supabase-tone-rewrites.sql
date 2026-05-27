-- Adds the per-letter tone-rewrite counter that powers the "0 / 1 / 3
-- tone rewrites included" feature sold on the pricing cards.
--
-- Tone rewrites are conceptually SEPARATE from the backend quality
-- rewrites the orchestrator runs (1 / 2 / 2). Quality rewrites are
-- free, invisible, and never decrement the user's letter allowance;
-- they happen inside `generateCoverLetter()` and the customer never
-- sees them. Tone rewrites are user-triggered: the customer picks a
-- different tone from the letter view and we re-run the pipeline at
-- that tone.
--
-- Per-tier free allowance per letter:
--   • starter — 0  (every tone rewrite uses 1 letter slot)
--   • pro     — 1
--   • ultra   — 3
--
-- Once a letter's tone_rewrite_count meets the free cap, subsequent
-- rewrites consume a letter slot via try_start_letter (same atomic
-- gate /api/generate uses), and the placeholder row is marked with
-- generation_status='tone_rewrite_spend' so dashboards can attribute
-- the spend to the original letter.
--
-- Run in Supabase SQL Editor. Idempotent.

-- ============================================================
-- generated_letters: per-letter tone-rewrite counter
-- ============================================================
alter table public.generated_letters
  add column if not exists tone_rewrite_count integer not null default 0;

-- The status enum used by generation_status is the loose text field
-- we already use ("queued" / "running" / "passed" / "failed"). Add
-- "tone_rewrite_spend" as a documented value — no enum migration
-- needed because the column is plain text.

comment on column public.generated_letters.tone_rewrite_count is
  'Number of user-triggered tone rewrites performed against this letter. Free per tier (starter:0, pro:1, ultra:3); subsequent rewrites consume a letter slot via try_start_letter.';

-- ============================================================
-- Index: lookups by user + status include the new column so the
-- dashboard can show "X tone rewrites used" without an extra round-
-- trip. The existing (user_id, generation_status) index already
-- covers the read pattern; no new index needed.
-- ============================================================

-- ============================================================
-- Done. Re-run the application; the schema-capability probe will
-- pick up the new column on the next request.
-- ============================================================
