-- Adds vector search to ExampleRetrieval so the gold base is queried
-- semantically (industry × role × seniority similarity), not just by
-- substring tokens.
--
-- Embedding model: OpenAI text-embedding-3-small (1536 dimensions).
-- Anthropic doesn't offer an embedding API, so we use OpenAI for this
-- one path. Cost: ~$0.02 per 1M input tokens — effectively free at
-- our request volumes (a JD is ~500 tokens → $0.00001 per query).
--
-- If OPENAI_API_KEY is unset in the environment, the application
-- skips the vector pass and falls back to the existing
-- substring-based 4-strategy waterfall — no errors, no crashes.
--
-- Run in Supabase SQL Editor. Idempotent.

-- ============================================================
-- Enable pgvector
-- ============================================================
create extension if not exists vector;

-- ============================================================
-- cover_letter_examples: embedding column
-- ============================================================
alter table public.cover_letter_examples
  add column if not exists embedding vector(1536);

-- IVFFLAT index — efficient for the ~thousands-of-rows scale of the
-- curated gold base. If the table grows past ~100k rows, switch to
-- HNSW (`create index ... using hnsw (embedding vector_cosine_ops)`)
-- — for now IVFFLAT is plenty.
create index if not exists cover_letter_examples_embedding_ivfflat
  on public.cover_letter_examples
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 64);

-- ============================================================
-- match_examples RPC — cosine-similarity top-K with a quality floor.
-- Returns the same shape ExampleRetrieval already consumes.
-- ============================================================
create or replace function public.match_examples(
  query_embedding vector(1536),
  match_count int default 10,
  min_quality int default 90
)
returns table (
  id uuid,
  industry text,
  role text,
  excerpt text,
  why_it_works text,
  quality_score int,
  seniority text,
  similarity float
)
language sql
stable
parallel safe
as $$
  select
    e.id,
    e.industry,
    e.role,
    e.cover_letter_excerpt as excerpt,
    e.why_it_works,
    e.quality_score,
    e.seniority,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.cover_letter_examples e
  where e.approved = true
    and e.quality_score >= min_quality
    and e.embedding is not null
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================================
-- Backfill helper: rows without an embedding will be skipped by the
-- RPC and picked up by the substring fallback. To backfill, run the
-- script in scripts/backfill-example-embeddings.ts (or use the
-- admin tool — both call the same OpenAI endpoint).
-- ============================================================
