-- ════════════════════════════════════════════════════════════════
-- Swap Test — data layer (MASTER_BUILD_SWAP_TEST.md, Phase 2)
-- Run in the Supabase SQL editor. Service-role only from the route;
-- RLS enabled with NO policies on every table (the project's
-- standard posture — anon/authenticated grants are already revoked,
-- see docs/supabase-rls-lockdown.sql).
--
-- Letter text is NEVER stored in any of these tables (Rule 1). The
-- single text-bearing table, swap_research_corpus, holds only the
-- anonymised copy created after an explicit opt-in.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS swap_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid,                              -- null for anonymous
  scan_ordinal int,                          -- 1..3 position on the ladder; null for paying
  anchor_score int, proof_score int, quadrant text,
  profile text, profile_confidence text,
  word_count int, sentence_count int, paragraph_count int,
  role_family text, had_jd boolean, mode text,
  echo numeric, affect_ratio numeric, affect_count int, cv numeric,
  label_sequence text,                       -- e.g. 'ST,TB,YC,YA,TB,YA'
  technique_hist jsonb, failure_hist jsonb,  -- {"T02":1,...} {"F01":2,...}
  opening_code text, closing_code text,      -- code on first/last live sentence
  rubric_version text, thresholds_version text,
  outcome_token uuid DEFAULT gen_random_uuid()
);

CREATE INDEX IF NOT EXISTS swap_stats_user_idx ON swap_stats (user_id, created_at);
CREATE INDEX IF NOT EXISTS swap_stats_outcome_token_idx ON swap_stats (outcome_token);

CREATE TABLE IF NOT EXISTS swap_shares (
  id uuid PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '30 days',
  payload jsonb
);

CREATE TABLE IF NOT EXISTS swap_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_id uuid REFERENCES swap_stats(id),
  created_at timestamptz DEFAULT now(),
  got_interview boolean,
  got_offer boolean,
  applied_after_scan boolean
);

CREATE TABLE IF NOT EXISTS swap_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  kind text,                                 -- 'outcome_email' | 'research_copy' | 'gold_invite'
  granted_at timestamptz DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS swap_consents_user_idx ON swap_consents (user_id, kind);

CREATE TABLE IF NOT EXISTS swap_research_corpus (   -- ONLY via explicit opt-in, post-anonymisation
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  consent_id uuid REFERENCES swap_consents(id),
  anonymised_text text,
  scores jsonb,
  role_family text
);

CREATE TABLE IF NOT EXISTS vocab_counts (           -- closed-vocabulary aggregates
  gram text,
  role_family text,
  cnt int,
  PRIMARY KEY (gram, role_family)
);
-- Convention: the reserved gram '__docs__' per role_family counts
-- corpus documents; lib/swap/idf.ts reads it as corpusSize and the
-- per-token rows as document frequencies. Raw JD text is never
-- stored (Rule 1b) — term frequencies only.

-- Outcome-email queue. Deviation from the build doc's DDL (which
-- describes but does not declare it): "queue row holds plaintext
-- email only until send". The address lives here and NOWHERE else in
-- the swap stack, and the send cron deletes the row on send.
CREATE TABLE IF NOT EXISTS swap_outcome_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  stat_id uuid REFERENCES swap_stats(id),
  consent_id uuid REFERENCES swap_consents(id),
  email text NOT NULL,
  send_after timestamptz NOT NULL DEFAULT now() + interval '30 days'
);

CREATE INDEX IF NOT EXISTS swap_outcome_queue_due_idx ON swap_outcome_queue (send_after);

-- ── RLS: enabled, no policies (service-role only) ────────────────
ALTER TABLE swap_stats            ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_shares           ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_outcomes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_consents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_research_corpus  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_counts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_outcome_queue    ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON swap_stats, swap_shares, swap_outcomes, swap_consents,
  swap_research_corpus, vocab_counts, swap_outcome_queue
  FROM anon, authenticated;

-- ── Maintenance functions (called by the crons) ──────────────────

-- Weekly k-anonymity purge: drop rare grams (cnt < 10) and anything
-- outside the closed vocabulary shape (lowercase ascii words only —
-- a unique personal token must never survive here).
CREATE OR REPLACE FUNCTION purge_swap_vocab()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE deleted int;
BEGIN
  DELETE FROM vocab_counts
  WHERE gram <> '__docs__'
    AND (cnt < 10 OR gram !~ '^[a-z][a-z ]{0,29}$');
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

-- Daily share-snapshot TTL cleanup.
CREATE OR REPLACE FUNCTION purge_expired_swap_shares()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE deleted int;
BEGIN
  DELETE FROM swap_shares WHERE expires_at < now();
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

-- ── Verification ─────────────────────────────────────────────────
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'swap_%' OR tablename = 'vocab_counts'
ORDER BY tablename;
