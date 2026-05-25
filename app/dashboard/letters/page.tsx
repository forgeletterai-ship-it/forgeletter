import Link from "next/link"
import { redirect } from "next/navigation"
import { LettersFilterBar } from "@/components/LettersFilterBar"
import { getCurrentAppUser } from "@/lib/app-data"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = "force-dynamic"

type ApplicationStatus =
  | "not_submitted"
  | "submitted"
  | "interviewing"
  | "offer"
  | "rejected"
  | "ghosted"

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  not_submitted: "Not submitted",
  submitted: "Submitted",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
}

const ALL_STATUSES: ApplicationStatus[] = [
  "not_submitted",
  "submitted",
  "interviewing",
  "offer",
  "rejected",
  "ghosted",
]

type SortKey =
  | "created_desc"
  | "created_asc"
  | "score_desc"
  | "ats_desc"
  | "outcome_desc"

interface LetterRow {
  id: string
  job_title: string | null
  company_name: string | null
  final_score: number | null
  ats_score: number | null
  generation_status: string
  template_chosen: string | null
  tier: string
  created_at: string
  application_status: ApplicationStatus | null
  submitted_at: string | null
  outcome_at: string | null
}

function formatRelative(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString()
}

type SearchParams = {
  status?: string
  sort?: string
}

/**
 * Mid-pipeline crash recovery. The pipeline marks rows as 'running'
 * at insert and finalises them at the end. If Vercel kills the
 * function (300s max) the row stays 'running' forever. The quota
 * gate's 7-min orphan window already ignores these for letter
 * counting, but we also flip them to 'failed' here so they stop
 * showing as in-flight in any future report. Safe to run on every
 * page load; UPDATE is a no-op when no rows match.
 */
async function finalizeStalledLetters(userId: string): Promise<number> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  try {
    const { data } = await supabaseAdmin
      .from("generated_letters")
      .update({
        generation_status: "failed",
        failure_reason:
          "Pipeline timed out — function exceeded the runtime limit. Try again.",
        completed_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .in("generation_status", ["running", "queued"])
      .lt("created_at", tenMinutesAgo)
      .select("id")
    return data?.length ?? 0
  } catch {
    return 0
  }
}

export default async function LettersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { user } = await getCurrentAppUser()
  if (!user) redirect("/auth/login")

  // Lazy crash recovery: any letter stuck in 'running' for >10 min
  // gets finalised to 'failed' so the books stay clean.
  await finalizeStalledLetters(user.id)

  const sp = await searchParams
  const statusFilter = ALL_STATUSES.includes(sp.status as ApplicationStatus)
    ? (sp.status as ApplicationStatus)
    : null
  const sort: SortKey = ([
    "created_desc",
    "created_asc",
    "score_desc",
    "ats_desc",
    "outcome_desc",
  ] as const).includes(sp.sort as SortKey)
    ? (sp.sort as SortKey)
    : "created_desc"

  // Aggregate counts — one COUNT query per status, in parallel. Far
  // more accurate than computing from the first 100 rows; cheap
  // because each is a single index lookup on (user_id, application_status).
  const baseFilter = supabaseAdmin
    .from("generated_letters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("final_cover_letter", "is", null)

  const countQueries = await Promise.all([
    // Total
    baseFilter,
    // Per-status counts
    ...ALL_STATUSES.map((s) =>
      supabaseAdmin
        .from("generated_letters")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("final_cover_letter", "is", null)
        .eq("application_status", s)
    ),
  ])

  const totalCount = countQueries[0]?.count ?? 0
  const byStatus: Record<ApplicationStatus, number> = {
    not_submitted: 0,
    submitted: 0,
    interviewing: 0,
    offer: 0,
    rejected: 0,
    ghosted: 0,
  }
  ALL_STATUSES.forEach((s, i) => {
    byStatus[s] = countQueries[i + 1]?.count ?? 0
  })
  // Letters without application_status column (pre-migration) count
  // as "not_submitted" for display. Derive that bucket by subtraction
  // so totals always reconcile.
  const buckedSum = ALL_STATUSES.reduce((sum, s) => sum + byStatus[s], 0)
  if (buckedSum < totalCount) {
    byStatus.not_submitted += totalCount - buckedSum
  }

  // Build the list query with the chosen filter + sort.
  let listQuery = supabaseAdmin
    .from("generated_letters")
    .select(
      "id,job_title,company_name,final_score,ats_score,generation_status,template_chosen,tier,created_at,application_status,submitted_at,outcome_at"
    )
    .eq("user_id", user.id)
    .not("final_cover_letter", "is", null)
  if (statusFilter) {
    listQuery = listQuery.eq("application_status", statusFilter)
  }
  switch (sort) {
    case "created_asc":
      listQuery = listQuery.order("created_at", { ascending: true })
      break
    case "score_desc":
      listQuery = listQuery.order("final_score", {
        ascending: false,
        nullsFirst: false,
      })
      break
    case "ats_desc":
      listQuery = listQuery.order("ats_score", {
        ascending: false,
        nullsFirst: false,
      })
      break
    case "outcome_desc":
      listQuery = listQuery.order("outcome_at", {
        ascending: false,
        nullsFirst: false,
      })
      break
    default:
      listQuery = listQuery.order("created_at", { ascending: false })
  }
  const { data: letters } = await listQuery.limit(100)
  const rows = (letters || []) as LetterRow[]

  // Insights aggregator now reads the accurate per-status counts.
  const insights = (() => {
    const submitted =
      byStatus.submitted +
      byStatus.interviewing +
      byStatus.offer +
      byStatus.rejected +
      byStatus.ghosted
    const responded = byStatus.interviewing + byStatus.offer + byStatus.rejected
    const responseRate = submitted > 0 ? Math.round((responded / submitted) * 100) : null
    const goldStandard = byStatus.offer + byStatus.interviewing
    return {
      byStatus,
      submitted,
      responded,
      offers: byStatus.offer,
      interviews: byStatus.interviewing,
      goldStandard,
      responseRate,
      tracked: submitted,
    }
  })()

  return (
    <div className="letters-page">
      <Link
        className="letters-interlock"
        href="/dashboard"
        aria-label="Letters are generated in the workspace. Open the workspace."
      >
        <span className="letters-interlock__node">
          <span className="letters-interlock__dot" aria-hidden="true" />
          Workspace
        </span>
        <span className="letters-interlock__wire" aria-hidden="true">
          <svg viewBox="0 0 24 8" preserveAspectRatio="none">
            <path d="M0 4h24" />
            <path d="m20 1 4 3-4 3" />
          </svg>
        </span>
        <span className="letters-interlock__node letters-interlock__node--current">
          <span
            className="letters-interlock__dot letters-interlock__dot--current"
            aria-hidden="true"
          />
          My letters
        </span>
      </Link>

      <header className="letters-header">
        <div>
          <h1>My letters</h1>
          <p>
            {totalCount === 0
              ? "Generate your first cover letter in the workspace — it'll appear here."
              : `${totalCount} cover ${
                  totalCount === 1 ? "letter" : "letters"
                } generated${statusFilter ? ` · ${rows.length} shown` : ""}. Click any to view, edit, or download.`}
          </p>
        </div>
      </header>

      {insights.tracked > 0 ? (
        <section className="letters-insights" aria-label="Application outcomes">
          <div className="letters-insights__head">
            <div>
              <p className="letters-insights__kicker">Outcomes</p>
              <h2>
                {insights.responseRate != null
                  ? `${insights.responseRate}% response rate`
                  : "Tracking outcomes"}
              </h2>
              <p className="letters-insights__sub">
                {insights.submitted} submitted · {insights.responded} heard back ·{" "}
                {insights.interviews} {insights.interviews === 1 ? "interview" : "interviews"} ·{" "}
                {insights.offers} {insights.offers === 1 ? "offer" : "offers"}
              </p>
            </div>
            {insights.goldStandard > 0 ? (
              <div
                className="letters-insights__gold"
                aria-label="Gold-standard letters — letters that earned an offer or interview, used to train future generations"
                title="Both offer-winning and interview-winning letters feed the example-retrieval base. Offers carry more weight than interviews."
              >
                <span className="letters-insights__gold-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 2.8 14.3 9l6.2 2.3-6.2 2.4L12 20l-2.3-6.3-6.2-2.4L9.7 9 12 2.8Z" />
                  </svg>
                </span>
                <div>
                  <strong>{insights.goldStandard}</strong>
                  <span>
                    gold-standard {insights.goldStandard === 1 ? "letter" : "letters"}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
          <div className="letters-insights__bar" aria-hidden="true">
            {(["offer", "interviewing", "rejected", "ghosted", "submitted"] as const).map(
              (key) => {
                const value = insights.byStatus[key]
                if (!value) return null
                return (
                  <span
                    key={key}
                    className={`letters-insights__seg letters-insights__seg--${key}`}
                    style={{ flexGrow: value }}
                  />
                )
              }
            )}
          </div>
          <div className="letters-insights__legend">
            {(["offer", "interviewing", "submitted", "rejected", "ghosted"] as const).map(
              (key) => {
                const value = insights.byStatus[key]
                if (!value) return null
                return (
                  <span key={key} className="letters-insights__legend-item">
                    <span
                      className={`letters-insights__legend-dot letters-insights__legend-dot--${key}`}
                      aria-hidden="true"
                    />
                    {STATUS_LABEL[key]}
                    <strong>{value}</strong>
                  </span>
                )
              }
            )}
          </div>
        </section>
      ) : null}

      {totalCount > 0 ? (
        <LettersFilterBar
          currentStatus={statusFilter ?? ""}
          currentSort={sort}
          counts={byStatus}
          total={totalCount}
        />
      ) : null}

      {rows.length === 0 ? (
        <div className="letters-empty">
          <div className="letters-empty__icon" aria-hidden="true">
            <svg viewBox="0 0 32 32">
              <rect x="6" y="8" width="20" height="18" rx="2" />
              <path d="M6 12h20" />
              <path d="M11 17h10M11 21h6" />
            </svg>
          </div>
          <h2>{statusFilter ? "No letters in this filter" : "No letters yet"}</h2>
          <p>
            {statusFilter
              ? "Try clearing the filter, or generate one in the workspace."
              : "Your generated cover letters will land here automatically. Head to the workspace to brief the agents."}
          </p>
        </div>
      ) : (
        <ul className="letters-list">
          {rows.map((row) => {
            const status: ApplicationStatus = row.application_status || "not_submitted"
            return (
              <li key={row.id}>
                <Link
                  href={`/dashboard/letters/${row.id}`}
                  className={`letters-row letters-row--${status}`}
                >
                  <div className="letters-row__main">
                    <div className="letters-row__title">
                      {row.job_title || "Untitled role"}
                      {row.company_name ? <span> at {row.company_name}</span> : null}
                    </div>
                    <div className="letters-row__meta">
                      <span>{formatRelative(row.created_at)}</span>
                      <span>·</span>
                      <span>{row.tier.toUpperCase()}</span>
                      {row.final_score != null ? (
                        <>
                          <span>·</span>
                          <span>Score {row.final_score}</span>
                        </>
                      ) : null}
                      {row.ats_score != null ? (
                        <>
                          <span>·</span>
                          <span>ATS {row.ats_score}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="letters-row__right">
                    <span className={`letters-row__status letters-row__status--${status}`}>
                      <span className="letters-row__status-dot" aria-hidden="true" />
                      {STATUS_LABEL[status]}
                    </span>
                    <span className="letters-row__chevron" aria-hidden="true">→</span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
