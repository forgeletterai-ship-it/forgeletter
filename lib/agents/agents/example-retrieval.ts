import type { SupabaseClient } from "@supabase/supabase-js"
import type { JobAnalysis, RetrievedExample } from "../types"

/**
 * Pulls top-N gold examples relevant to the role + seniority + tone.
 *
 * v1: simple SQL filter on industry/role/seniority/quality_score.
 * v2: pgvector similarity via `match_examples` RPC (Week 4 of the guide).
 *
 * Returns [] gracefully if the table doesn't exist yet (pre-migration) or
 * has no approved rows — the writer handles empty-examples fine.
 */
export async function runExampleRetrieval(args: {
  supabase: SupabaseClient | null
  job: JobAnalysis
  limit?: number
}): Promise<RetrievedExample[]> {
  if (!args.supabase) return []
  const limit = args.limit ?? 3

  try {
    const { data, error } = await args.supabase
      .from("cover_letter_examples")
      .select("id, industry, role, cover_letter_excerpt, why_it_works, quality_score, seniority, tags")
      .eq("approved", true)
      .gte("quality_score", 90)
      .order("quality_score", { ascending: false })
      .limit(limit * 4) // pull a wider pool, then rank in memory

    if (error || !data) {
      return []
    }

    const ranked = data
      .map((row) => ({
        id: row.id as string,
        industry: row.industry as string,
        role: row.role as string,
        seniority: row.seniority as string,
        excerpt: row.cover_letter_excerpt as string,
        whyItWorks: (row.why_it_works as string | null) ?? null,
        qualityScore: row.quality_score as number,
        score: rankScore(args.job, row),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return ranked.map(({ score: _score, seniority: _seniority, ...rest }) => rest)
  } catch (err) {
    console.warn("[ExampleRetrieval] returning empty:", err)
    return []
  }
}

function rankScore(
  job: JobAnalysis,
  row: { industry?: string; role?: string; seniority?: string; quality_score?: number }
): number {
  let score = (row.quality_score ?? 0) * 0.5
  if (row.industry && job.industry && row.industry.toLowerCase() === job.industry.toLowerCase()) {
    score += 30
  }
  if (row.role && job.jobTitle && row.role.toLowerCase().includes(job.jobTitle.toLowerCase().split(" ")[0])) {
    score += 20
  }
  if (row.seniority === job.seniorityRequired) {
    score += 15
  }
  return score
}
