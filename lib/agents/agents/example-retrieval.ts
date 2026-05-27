import type { SupabaseClient } from "@supabase/supabase-js"
import { embedText } from "./embeddings"
import type { JobAnalysis, RetrievedExample } from "../types"

/**
 * Example Retrieval — "The Gold-Base Retriever"
 *
 * Runs on every paid tier per the blueprint. Personal-winning
 * letters from the requesting user are ALWAYS preferred when
 * available — they preserve voice and have empirically beaten
 * the screening filter once already.
 *
 * RETRIEVAL ORDER:
 *
 *   0. VECTOR pass (primary). When OPENAI_API_KEY is set and the
 *      cover_letter_examples table has the `embedding` column,
 *      we embed a JD signature (role + industry + must-have skills
 *      + top responsibilities) and call match_examples() — a
 *      pgvector cosine-similarity top-K with quality floor 90.
 *      This is the "real" semantic retrieval — synonyms, role
 *      families, and adjacent industries surface naturally without
 *      hand-tuned keyword logic.
 *
 *   1. PERSONAL — the user's own offer-winning letters first, then
 *      interview-winning letters. Capped so curated still appears.
 *
 *   2. CURATED — exact match (same industry × same seniority).
 *   3. CURATED — same industry OR same role-family token.
 *   4. CURATED — top-quality fallback regardless of match.
 *
 * Strategies 1-4 are the substring/token waterfall used as a
 * fallback when vector search isn't available (no API key, RPC
 * missing, or returned 0 rows) or to back-fill when the vector
 * top-K didn't fill all `limit` slots.
 *
 * Never crosses user boundaries — personal letters come from the
 * caller's own user_id only. The curated table is the cross-user
 * gold standard.
 *
 * Returns [] gracefully if Supabase is unavailable, the table is
 * missing, or no rows match — Writer handles empty examples fine.
 */

interface RankedExample extends RetrievedExample {
  /** Internal — best strategy that yielded the row.
   *  0 = vector top-K
   *  1 = personal winner
   *  2 = exact industry × seniority
   *  3 = same industry OR same role-family token
   *  4 = top-quality fallback */
  _strategy: 0 | 1 | 2 | 3 | 4
  /** Internal — composite ranking score (higher is better). */
  _score: number
  _seniority?: string
  /** Internal — cosine similarity when strategy=0 (vector hit). */
  _similarity?: number
}

export async function runExampleRetrieval(args: {
  supabase: SupabaseClient | null
  job: JobAnalysis
  userId?: string | null
  limit?: number
}): Promise<RetrievedExample[]> {
  if (!args.supabase) return []
  const limit = args.limit ?? 3

  // ── Strategy 0 — vector top-K (semantic retrieval) ───────────
  const vectorMatches = await tryVectorRetrieval(args.supabase, args.job, limit * 2)

  // ── Strategy 1 — personal winners ────────────────────────────
  const personal = args.userId
    ? await fetchUserWinnerExamples(args.supabase, args.userId, limit * 2)
    : []

  // Curated pool — we fetch a wider net once, then partition by
  // strategy 2 / 3 / 4 in memory to avoid 3 DB round-trips. The
  // vector results join this pool as a separate strategy=0 rung.
  const curatedPool = await fetchCuratedExamples(args.supabase, args.job, limit * 6)

  // Vector hits become strategy=0 with similarity carried through as
  // the rank score (so most-similar wins within strategy 0).
  const vectorRanked: RankedExample[] = vectorMatches.map((row) => ({
    ...row,
    _strategy: 0 as const,
    // 100 baseline + similarity bonus; ensures vector results sort
    // above strategy-2 even when their substring overlap is weaker.
    _score: 100 + (row._similarity ?? 0) * 30,
  }))

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

  // Merge and order: strategy ascending (0 = vector first, then
  // personal=1, then curated rungs 2-4), tie-break by score desc.
  // Dedupe by id — a row that surfaced both via vector AND
  // substring match collapses to its strongest strategy tag.
  const seenIdToBest = new Map<string, RankedExample>()
  for (const row of [...vectorRanked, ...personalRanked, ...tagged]) {
    const prior = seenIdToBest.get(row.id)
    if (!prior || row._strategy < prior._strategy) {
      seenIdToBest.set(row.id, row)
    }
  }
  const all = Array.from(seenIdToBest.values()).sort((a, b) => {
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

/**
 * Build a compact JD signature → embed it → call the match_examples
 * RPC. Returns [] silently when:
 *   • OPENAI_API_KEY is unset (no embedding can be made)
 *   • match_examples RPC is missing (PGRST202 — pre-migration DB)
 *   • the embedding column is missing or empty
 *   • any other error — caller continues with strategies 1-4
 *
 * The signature is intentionally short (~500 tokens max) to keep the
 * embedding call cheap and deterministic-ish: role, industry,
 * seniority, must-haves, and the top responsibility lines.
 */
async function tryVectorRetrieval(
  supabase: SupabaseClient,
  job: JobAnalysis,
  topK: number
): Promise<Array<RetrievedExample & { _seniority?: string; _similarity: number }>> {
  const signature = buildJdSignature(job)
  if (!signature) return []
  const embedding = await embedText(signature)
  if (!embedding) return [] // no API key, or fetch failed

  try {
    const { data, error } = await supabase.rpc("match_examples", {
      query_embedding: embedding,
      match_count: topK,
      min_quality: 90,
    })
    if (error) {
      const code = (error as { code?: string }).code
      // PGRST202 = function missing; PGRST205 = column missing.
      // 42P01 = relation missing; 42883 = function signature mismatch.
      // Any of these → fall through silently to the substring waterfall.
      if (code && ["PGRST202", "PGRST205", "42P01", "42883"].includes(code)) {
        return []
      }
      console.warn("[ExampleRetrieval] vector RPC failed:", error)
      return []
    }
    if (!data) return []
    return (data as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id ?? ""),
      industry: String(row.industry ?? ""),
      role: String(row.role ?? ""),
      excerpt: String(row.excerpt ?? ""),
      whyItWorks: (row.why_it_works as string | null) ?? null,
      qualityScore: Number(row.quality_score ?? 0),
      source: "curated" as const,
      _seniority: row.seniority as string | undefined,
      _similarity: Number(row.similarity ?? 0),
    }))
  } catch (err) {
    console.warn("[ExampleRetrieval] vector retrieval failed:", err)
    return []
  }
}

function buildJdSignature(job: JobAnalysis): string {
  const bits: string[] = []
  if (job.jobTitle) bits.push(`Role: ${job.jobTitle}`)
  if (job.industry) bits.push(`Industry: ${job.industry}`)
  if (job.seniorityRequired) bits.push(`Seniority: ${job.seniorityRequired}`)
  if (job.mustHaveSkills?.length)
    bits.push(`Must-have skills: ${job.mustHaveSkills.slice(0, 8).join(", ")}`)
  if (job.keyResponsibilities?.length)
    bits.push(
      `Key responsibilities: ${job.keyResponsibilities.slice(0, 4).join("; ")}`
    )
  if (job.hiringManagerPriorities?.length)
    bits.push(`Priorities: ${job.hiringManagerPriorities.slice(0, 4).join(" → ")}`)
  return bits.join("\n").trim()
}

function stripInternal(row: RankedExample): RetrievedExample {
  // Drop the internal scoring keys before handing to the Writer.
  const {
    _strategy: _s,
    _score: _sc,
    _seniority: _sen,
    _similarity: _sim,
    ...rest
  } = row
  void _s
  void _sc
  void _sen
  void _sim
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
