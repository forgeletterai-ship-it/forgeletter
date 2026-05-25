import type { SupabaseClient } from "@supabase/supabase-js"
import type { JobAnalysis, RetrievedExample } from "../types"

/**
 * Pulls top-N gold examples relevant to the role + seniority + tone.
 *
 * Two sources, ranked together:
 *   1. cover_letter_examples — editor-vetted "curated" entries
 *      (the historical source).
 *   2. generated_letters — the requesting user's own past letters
 *      with application_status in ('offer', 'interviewing'). Both
 *      are letters that worked: an offer is the strongest possible
 *      signal, but an interview booking is still validation that
 *      the letter beat the screening filter. Offers outrank
 *      interviews via a larger bonus.
 *
 * Personal-only by design — we never cross user boundaries, so this
 * works without consent flows and leaks no PII between accounts. The
 * curated table remains the cross-user gold standard.
 *
 * Returns [] gracefully if the table doesn't exist yet (pre-migration),
 * the user has no winning letters, or no rows match — the writer
 * handles empty examples fine.
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

  const [curated, userWinners] = await Promise.all([
    fetchCuratedExamples(args.supabase, args.job, limit * 4),
    args.userId
      ? fetchUserWinnerExamples(args.supabase, args.userId, limit * 2)
      : Promise.resolve<RetrievedExample[]>([]),
  ])

  // Personal winning letters get a fixed bonus on top of their match
  // score so a moderately-similar past winner still outranks a
  // distantly-similar curated example. Offers carry a larger bonus
  // than interviews because an offer is the strongest signal — but
  // both indicate the letter worked, so interviews get half the lift.
  const all = [...userWinners, ...curated]
  const ranked = all
    .map((example) => ({
      example,
      score:
        rankScore(args.job, example) +
        (example.source === "user_offer"
          ? 25
          : example.source === "user_interview"
            ? 12
            : 0),
    }))
    .sort((a, b) => b.score - a.score)

  // Enforce diversity: never let the personal pool monopolise all
  // slots — keep at least one curated entry when both pools exist.
  // The cap is shared across both personal sources.
  const finalList: RetrievedExample[] = []
  const personalCap = Math.max(1, limit - 1)
  let personalTaken = 0
  for (const { example } of ranked) {
    if (finalList.length >= limit) break
    const isPersonal =
      example.source === "user_offer" || example.source === "user_interview"
    if (isPersonal) {
      if (personalTaken >= personalCap) continue
      personalTaken += 1
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
        // Excerpts mirror the curated table — keep them focused so
        // the writer's prompt stays under token budget.
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
          // Treat winning letters as empirically scored: offers at
          // 100 (strongest signal), interviews at 90 (got past
          // screening but not the final yes). The rank-bonus
          // mediates how aggressively we surface them.
          qualityScore: status === "offer" ? 100 : 90,
          source: status === "offer" ? ("user_offer" as const) : ("user_interview" as const),
          _seniority: undefined,
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
