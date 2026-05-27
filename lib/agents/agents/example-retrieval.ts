import type { SupabaseClient } from "@supabase/supabase-js"
import type { JobAnalysis, RetrievedExample } from "../types"

/**
 * Example Retrieval — "The Gold-Base Retriever"
 *
 * Runs on every paid tier per the blueprint. Personal-winning
 * letters from the requesting user are ALWAYS preferred when
 * available — they preserve voice and have empirically beaten
 * the screening filter once already.
 *
 * 4-STRATEGY WATERFALL (per blueprint section 4):
 *   1. Personal — user's own offer-winning letters first, then
 *      interview-winning letters. Capped so curated still appears.
 *   2. Curated — exact match (same industry × same seniority).
 *   3. Curated — same industry OR same role-family token.
 *   4. Curated — top-quality fallback regardless of match.
 *
 * Each strategy contributes until `limit` is filled or the strategy
 * runs out. Personal winners are blended in BEFORE strategy 2 with
 * a hard cap so the writer always sees at least one curated entry
 * when both pools exist.
 *
 * Never crosses user boundaries — personal letters come from the
 * caller's own user_id only. The curated table is the cross-user
 * gold standard.
 *
 * Returns [] gracefully if Supabase is unavailable, the table is
 * missing, or no rows match — Writer handles empty examples fine.
 */

interface RankedExample extends RetrievedExample {
  /** Internal — best strategy that yielded the row. */
  _strategy: 1 | 2 | 3 | 4
  /** Internal — composite ranking score (higher is better). */
  _score: number
  _seniority?: string
}

export async function runExampleRetrieval(args: {
  supabase: SupabaseClient | null
  job: JobAnalysis
  userId?: string | null
  limit?: number
}): Promise<RetrievedExample[]> {
  if (!args.supabase) return []
  const limit = args.limit ?? 3

  // ── Strategy 1 — personal winners ────────────────────────────
  const personal = args.userId
    ? await fetchUserWinnerExamples(args.supabase, args.userId, limit * 2)
    : []

  // Curated pool — we fetch a wider net once, then partition by
  // strategy 2 / 3 / 4 in memory to avoid 3 DB round-trips.
  const curatedPool = await fetchCuratedExamples(args.supabase, args.job, limit * 6)

  // Tag each curated row with the strongest strategy that applies.
  const tagged: RankedExample[] = curatedPool.map((row) => {
    const sen = row._seniority?.toLowerCase()
    const ind = row.industry.toLowerCase()
    const jobInd = (args.job.industry || "").toLowerCase()
    const exactIndustry = ind && ind === jobInd
    const exactSeniority = sen && sen === args.job.seniorityRequired
    const sameRoleFamily = jobInd
      ? shareRoleFamilyToken(row.role, args.job.jobTitle)
      : false

    let strategy: 1 | 2 | 3 | 4 = 4
    if (exactIndustry && exactSeniority) strategy = 2
    else if (exactIndustry || sameRoleFamily) strategy = 3
    return { ...row, _strategy: strategy, _score: rankScore(args.job, row) }
  })

  // Personal entries are conceptually strategy 1.
  const personalRanked: RankedExample[] = personal.map((row) => ({
    ...row,
    _strategy: 1 as const,
    _score:
      rankScore(args.job, row) +
      (row.source === "user_offer" ? 25 : row.source === "user_interview" ? 12 : 0),
  }))

  // Merge and order: strategy ascending (1 before 4), then score desc.
  const all = [...personalRanked, ...tagged].sort((a, b) => {
    if (a._strategy !== b._strategy) return a._strategy - b._strategy
    return b._score - a._score
  })

  // Enforce diversity: cap personal entries at limit-1 so the writer
  // sees at least one curated entry when both pools exist.
  const personalCap = Math.max(1, limit - 1)
  let personalTaken = 0
  const seen = new Set<string>()
  const finalList: RetrievedExample[] = []
  for (const row of all) {
    if (finalList.length >= limit) break
    if (seen.has(row.id)) continue
    const isPersonal = row.source === "user_offer" || row.source === "user_interview"
    if (isPersonal && personalTaken >= personalCap) continue
    seen.add(row.id)
    if (isPersonal) personalTaken += 1
    finalList.push(stripInternal(row))
  }

  // Backfill ignoring the cap if diversity culling left empty slots.
  if (finalList.length < limit) {
    for (const row of all) {
      if (finalList.length >= limit) break
      if (seen.has(row.id)) continue
      seen.add(row.id)
      finalList.push(stripInternal(row))
    }
  }

  return finalList
}

function stripInternal(row: RankedExample): RetrievedExample {
  // Drop the internal scoring keys before handing to the Writer.
  const { _strategy: _s, _score: _sc, _seniority: _sen, ...rest } = row
  void _s
  void _sc
  void _sen
  return rest
}

async function fetchCuratedExamples(
  supabase: SupabaseClient,
  job: JobAnalysis,
  pool: number
): Promise<Array<RetrievedExample & { _seniority?: string }>> {
  try {
    const { data, error } = await supabase
      .from("cover_letter_examples")
      .select(
        "id, industry, role, cover_letter_excerpt, why_it_works, quality_score, seniority, tags"
      )
      .eq("approved", true)
      .gte("quality_score", 90)
      .order("quality_score", { ascending: false })
      .limit(pool)

    if (error || !data) return []

    return data.map((row) => ({
      id: row.id as string,
      industry: (row.industry as string) ?? "",
      role: (row.role as string) ?? "",
      excerpt: (row.cover_letter_excerpt as string) ?? "",
      whyItWorks: (row.why_it_works as string | null) ?? null,
      qualityScore: (row.quality_score as number) ?? 0,
      source: "curated" as const,
      _seniority: row.seniority as string | undefined,
    }))
  } catch (err) {
    console.warn("[ExampleRetrieval] curated lookup failed:", err)
    return []
  }
}

async function fetchUserWinnerExamples(
  supabase: SupabaseClient,
  userId: string,
  pool: number
): Promise<RetrievedExample[]> {
  try {
    const { data, error } = await supabase
      .from("generated_letters")
      .select(
        "id, job_title, company_name, final_cover_letter, final_score, outcome_at, application_status, created_at"
      )
      .eq("user_id", userId)
      .in("application_status", ["offer", "interviewing"])
      .not("final_cover_letter", "is", null)
      .order("outcome_at", { ascending: false, nullsFirst: false })
      .limit(pool)

    if (error || !data) return []

    return data
      .filter(
        (row) =>
          typeof row.final_cover_letter === "string" &&
          row.final_cover_letter.trim().length > 100
      )
      .map((row) => {
        const status = row.application_status as "offer" | "interviewing"
        const fullLetter = (row.final_cover_letter as string).trim()
        const excerpt =
          fullLetter.length > 1200 ? `${fullLetter.slice(0, 1200)}…` : fullLetter
        const role = (row.job_title as string | null) ?? ""
        const ageDays = row.outcome_at
          ? Math.round(
              (Date.now() - new Date(row.outcome_at as string).getTime()) / 86400000
            )
          : null
        const verb = status === "offer" ? "offer-winning" : "interview-winning"
        const whyItWorks = `Your past ${verb} letter for ${
          role || "a similar role"
        }${row.company_name ? ` at ${row.company_name}` : ""}${
          ageDays != null && ageDays >= 0
            ? ` (${ageDays} ${ageDays === 1 ? "day" : "days"} ago)`
            : ""
        }.`

        return {
          id: `${status === "offer" ? "user_offer" : "user_interview"}:${row.id as string}`,
          industry: "",
          role,
          excerpt,
          whyItWorks,
          // Empirical scoring: offers at 100 (strongest signal),
          // interviews at 90 (got past screening). Rank bonus
          // controls how aggressively we surface them.
          qualityScore: status === "offer" ? 100 : 90,
          source: status === "offer" ? ("user_offer" as const) : ("user_interview" as const),
        }
      })
  } catch (err) {
    console.warn("[ExampleRetrieval] user-winner lookup failed:", err)
    return []
  }
}

function rankScore(
  job: JobAnalysis,
  row: {
    industry?: string
    role?: string
    _seniority?: string
    qualityScore?: number
  }
): number {
  let score = (row.qualityScore ?? 0) * 0.5
  if (row.industry && job.industry && row.industry.toLowerCase() === job.industry.toLowerCase()) {
    score += 30
  }
  if (row.role && job.jobTitle && shareRoleFamilyToken(row.role, job.jobTitle)) {
    score += 18
  }
  if (row._seniority && row._seniority === job.seniorityRequired) {
    score += 15
  }
  return score
}

function shareRoleFamilyToken(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  const aTokens = a.toLowerCase().split(/\s+/).filter(Boolean)
  const bTokens = b.toLowerCase().split(/\s+/).filter(Boolean)
  if (aTokens.length === 0 || bTokens.length === 0) return false
  const aHead = aTokens[0]
  const bHead = bTokens[0]
  if (aHead === bHead) return true
  return aTokens.some((t) => bTokens.includes(t) && t.length > 3)
}
