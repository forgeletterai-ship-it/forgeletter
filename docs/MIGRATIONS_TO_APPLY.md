# Pending Supabase migrations — apply before merging the engine PR

This branch's engine work introduces three columns + one extension +
one RPC. None of the application code requires them to run — every
agent and route is gated by a schema-capability probe that falls back
when a column is missing — but the engine only runs at full quality
once everything below is in place.

Apply in this order via the **Supabase SQL Editor** for the
production project. Each script is **idempotent** — re-running is
safe.

## 1. `docs/supabase-experience-blocks.sql`

Adds:

- `user_profiles.experience_blocks` (JSONB)
- `user_profiles.qualifications` (text)
- `user_profiles.notes` (text)
- `user_profiles.portfolio_link` (text) — NEW in this branch
- `application_briefs.selected_experience_ids` (text[])
- `generated_letters.selected_experience_ids` (text[])

Status: shipped previously; this branch only ADDS `portfolio_link` to
the same migration file, so re-running is safe.

## 2. `docs/supabase-tone-rewrites.sql`

Adds:

- `generated_letters.tone_rewrite_count` (integer, default 0)

Without this column, the tone-rewrite endpoint degrades to
"best-effort allow" — rewrites work but the free 0 / 1 / 3 cap can
not be enforced. This is a **billing hole**. Apply this BEFORE
opening tone rewrites to customers.

## 3. `docs/supabase-achievement-rename.sql`

Backfills legacy `col0 / col1 / col2` achievement keys inside
`user_profiles.experience_blocks` to `what / number / whyItMattered`.
**Optional** — the TS layer reads both shapes via
`normalizeAchievement()` in `lib/experience-types.ts`. Running this
just makes the JSONB consistent for new debugging / SQL exports.

## 4. `docs/supabase-vector-search.sql`

Adds:

- `vector` extension (pgvector) — Supabase has this prebuilt; the
  CREATE EXTENSION is a no-op if it's already there
- `cover_letter_examples.embedding` (vector(1536))
- IVFFLAT index on the embedding column
- `match_examples(query_embedding, match_count, min_quality)` RPC

Without this, ExampleRetrieval falls back to the 4-strategy
substring waterfall (still functional — substring matching is what
shipped before this branch). With it, retrieval is semantic and the
gold base is queried by meaning rather than tokens.

You also need to set the `OPENAI_API_KEY` env var on Vercel so the
embedding helper can call `text-embedding-3-small`. If the key is
missing the engine logs a warning and falls back to substring — no
crashes.

## 5. Verify

After applying, the next request hitting `/api/generate` will
re-probe the schema and surface the new capabilities. A quick way to
verify:

```bash
curl -s https://<your-host>/api/account/usage \
  -H "Cookie: ..."  | jq '.capabilities'
```

Should show all `*ExperienceBlocks`, `*SelectedExperienceIds`, and
the new `tonerewrites` capability flags as `true`.

## What is NOT in this list

The agent runtime itself doesn't need any migration to function —
all 12 agents, the orchestrator, runAgent() wrapper, coverage check,
hallucination auto-cleaner, and tone-rewrite endpoint compile and
ship against the schema we already have in production. The
migrations above are quality / cost upgrades, not blockers.
