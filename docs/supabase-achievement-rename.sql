-- Rename legacy achievement keys col0 / col1 / col2 → what / number /
-- whyItMattered inside user_profiles.experience_blocks JSONB.
--
-- Background: the structured profile stores experiences + wins as
-- JSONB on user_profiles.experience_blocks. Until 2026-05 the
-- achievement rows used positional keys (col0/col1/col2) which were
-- a smell from the time wins were 3 generic text inputs in the UI.
-- The TS type now reads BOTH shapes (lib/experience-types.ts
-- normalizeAchievement()), and writes always use the new names — so
-- this migration is optional cleanup, not a hard requirement.
--
-- Apply this once to backfill existing rows. The application
-- continues to work whether you run it or not.
--
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.

-- ============================================================
-- jsonb_rename_keys(achievement): map col0 → what etc., preserving
-- any new-shape keys that already exist.
-- ============================================================

with rewritten as (
  select
    user_id,
    coalesce(
      jsonb_agg(
        case
          when block ? 'achievements' then
            block || jsonb_build_object(
              'achievements',
              coalesce(
                (
                  select jsonb_agg(
                    -- For each achievement, copy id + new keys; only
                    -- fall back to col0/col1/col2 if the new keys
                    -- aren't set already.
                    jsonb_build_object('id', a->>'id') ||
                    jsonb_build_object(
                      'what',
                      coalesce(nullif(a->>'what', ''), a->>'col0', '')
                    ) ||
                    jsonb_build_object(
                      'number',
                      coalesce(nullif(a->>'number', ''), a->>'col1', '')
                    ) ||
                    jsonb_build_object(
                      'whyItMattered',
                      coalesce(nullif(a->>'whyItMattered', ''), a->>'col2', '')
                    )
                  )
                  from jsonb_array_elements(block->'achievements') a
                ),
                '[]'::jsonb
              )
            )
          else block
        end
      ),
      '[]'::jsonb
    ) as new_blocks
  from public.user_profiles, jsonb_array_elements(experience_blocks) block
  group by user_id
)
update public.user_profiles up
set experience_blocks = rw.new_blocks,
    updated_at = now()
from rewritten rw
where up.user_id = rw.user_id
  and up.experience_blocks <> rw.new_blocks;

-- ============================================================
-- Done. The TS app reads both shapes; this just makes the JSONB
-- cleaner. After running, every achievement uses what / number /
-- whyItMattered.
-- ============================================================
