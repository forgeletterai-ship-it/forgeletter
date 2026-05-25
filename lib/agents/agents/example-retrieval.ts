import type { SupabaseClient } from "@supabase/supabase-js"
import type { JobAnalysis, RetrievedExample } from "../types"

/**
 * Pulls top-N gold examples relevant to the role + seniority + tone.
 *
 * Two sources, ranked together:
 *   1. cover_letter_examples — editor-vetted "curated" entries
 *      (the historical source).
 *   2. generated_letters — the requesting user's own past letters
 *      with application_status = 'offer'. These are letters the
 *      user has personally proven out: they wrote them, sent them,
 *      and got the role. Conditioning future generations on these
 *      makes voice, opener cadence, and closing CTAs converge on
 *      what has worked for this specific user.
 *
 * Personal-only by design — we never cross user boundaries, so this
 * works without consent flows and leaks no PII between accounts. The
 * curated table remains the cross-user gold standard.
 *
 * Returns [] gracefully if the table doesn't exist yet (pre-migration),
 * the user has no offers, or no rows match — the writer handles empty
 * examples fine.
 */
export async function runExampleRetrieval(args: {
  supabase: SupabaseClient | null
  job: JobAnalysis
  /** Reserve at least one slot for the user's own offer-winning
   *  letters if any match. When omitted, behaves like v1 (curated
   *  table only). */
  userId?: string | null
  limit?: number
}): Promise<RetrievedExample[]> {
  if (!args.supabase) return []
  const limit = args.limit ?? 3

  const [curated, userOffers] = await Promise.all([
    fetchCuratedExamples(args.supabase, args.job, limit * 4),
    args.userId
      ? fetchUserOfferExamples(args.supabase, args.userId, args.job, limit * 2)
      : Promise.resolve<RetrievedExample[]>([]),
  ])

  // Personal offer letters get a fixed bonus on top of their match
  // score so a moderately-similar past winner still outranks a
  // distantly-similar curated example. The bonus is bounded so a
  // wildly off-role personal letter does not push out a much better
  // curated match.
  const all = [...userOffers, ...curated]
  const ranked = all
    .map((example) => ({
      example,
      score:
        rankScore(args.job, example) +
        (example.source === "user_offer" ? 25 : 0),
    }))
    .sort((a, b) => b.score - a.score)

  // Enforce diversity: never let the personal pool monopolise all
  // slots — keep at least one curated entry when both pools exist.
  const finalList: RetrievedExample[] = []
  const userOfferCap = Math.max(1, limit - 1)
  let userOfferTaken = 0
  for (const { example } of ranked) {
    if (finalList.length >= limit) break
    if (example.source === "user_offer") {
      if (userOfferTaken >= userOfferCap) continue
      userOfferTaken += 1
    }
    finalList.push(example)
  }

  // If diversity culling left us under-filled (e.g. all curated rows
  // were skipped because the cap blocked them), back-fill from the
  // remainder ignoring the cap.
  if (finalList.length < limit) {
    for (const { example } of ranked) {
      if (finalList.length >= limit) break
      if (!finalList.find((e) => e.id === example.id)) {
        finalList.push(example)
      }
    }
  }

  return finalList
}

async function fetchCuratedExamples(
  supabase: SupabaseClient,
  job: JobAnalysis,
  pool: number
): Promise<RetrievedExample[]> {
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

async function fetchUserOfferExamples(
  supabase: SupabaseClient,
  userId: string,
  job: JobAnalysis,
  pool: number
): Promise<RetrievedExample[]> {
  try {
    const { data, error } = await supabase
      .from("generated_letters")
      .select(
        "id, job_title, company_name, final_cover_letter, final_score, outcome_at, created_at"
      )
      .eq("user_id", userId)
      .eq("application_status", "offer")
      .not("final_cover_letter", "is", null)
      .order("outcome_at", { ascending: false, nullsFirst: false })
      .limit(pool)

    if (error || !data) return []

    return data
      .filter((row) => typeof row.final_cover_letter === "string" && row.final_cover_letter.trim().length > 100)
      .map((row) => {
        const fullLetter = (row.final_cover_letter as string).trim()
        // Excerpts mirror the curated table — keep them focused so
        // the writer's prompt stays under token budget.
        const excerpt =
          fullLetter.length > 1200 ? `${fullLetter.slice(0, 1200)}…` : fullLetter
        const role = (row.job_title as string | null) ?? ""
        const ageDays = row.outcome_at
          ? Math.round((Date.now() - new Date(row.outcome_at as string).getTime()) / 86400000)
          : null
        const whyItWorks = `Your past offer-winning letter for ${
          role || "a similar role"
        }${row.company_name ? ` at ${row.company_name}` : ""}${
          ageDays != null && ageDays >= 0 ? ` (${ageDays} ${ageDays === 1 ? "day" : "days"} ago)` : ""
        }.`

        return {
          id: `user_offer:${row.id as string}`,
          industry: "",
          role,
          excerpt,
          whyItWorks,
          // Treat user-offer examples as quality_score 100 — they are
          // empirically proven, not just AI-scored. The rank-bonus
          // still mediates how aggressively we surface them.
          qualityScore: 100,
          source: "user_offer" as const,
          _seniority: undefined,
        }
      })
  } catch (err) {
    console.warn("[ExampleRetrieval] user-offer lookup failed:", err)
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
  if (row.role && job.jobTitle) {
    const rowFirstTerm = row.role.toLowerCase().split(/\s+/)[0]
    const jobFirstTerm = job.jobTitle.toLowerCase().split(/\s+/)[0]
    if (rowFirstTerm && jobFirstTerm) {
      if (row.role.toLowerCase().includes(jobFirstTerm)) {
        score += 20
      } else if (job.jobTitle.toLowerCase().includes(rowFirstTerm)) {
        score += 12
      }
    }
  }
  if (row._seniority && row._seniority === job.seniorityRequired) {
    score += 15
  }
  return score
}
