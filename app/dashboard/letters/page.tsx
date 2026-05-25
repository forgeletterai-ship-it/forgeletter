import Link from "next/link"
import { redirect } from "next/navigation"
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

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  not_submitted: "Not submitted",
  submitted: "Submitted",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
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

export default async function LettersPage() {
  const { user } = await getCurrentAppUser()
  if (!user) redirect("/auth/login")

  // A letter is "generated" if the pipeline produced text. Quality-gate
  // verdicts ("passed" vs "failed") are scoring metadata, not delivery
  // state — both surface a final_cover_letter and both consume quota.
  // Only excludes still-running rows and catastrophic crashes (which
  // leave final_cover_letter null).
  //
  // application_status columns are tolerant — if the SQL migration in
  // docs/supabase-application-tracking.sql hasn't been applied yet,
  // Supabase returns null for the missing columns and the UI still
  // renders. The "track" affordance becomes available once columns exist.
  const { data: letters, count: totalCount } = await supabaseAdmin
    .from("generated_letters")
    .select(
      "id,job_title,company_name,final_score,ats_score,generation_status,template_chosen,tier,created_at,application_status,submitted_at,outcome_at",
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .not("final_cover_letter", "is", null)
    .order("created_at", { ascending: false })
    .limit(100)

  const rows = (letters || []) as LetterRow[]
  const generatedCount = totalCount ?? rows.length

  // Aggregate insights from the page's row set. For users with > 100
  // letters this becomes an approximation; happy to introduce a
  // dedicated count query later if anyone hits that limit.
  const insights = aggregateInsights(rows)

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
            {generatedCount === 0
              ? "Generate your first cover letter in the workspace — it'll appear here."
              : `${generatedCount} cover ${
                  generatedCount === 1 ? "letter" : "letters"
                } generated. Click any to view, edit, or download.`}
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
                {insights.submitted} submitted · {insights.responded} heard back ·
                {" "}
                {insights.interviews} {insights.interviews === 1 ? "interview" : "interviews"} ·
                {" "}
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

      {rows.length === 0 ? (
        <div className="letters-empty">
          <div className="letters-empty__icon" aria-hidden="true">
            <svg viewBox="0 0 32 32">
              <rect x="6" y="8" width="20" height="18" rx="2" />
              <path d="M6 12h20" />
              <path d="M11 17h10M11 21h6" />
            </svg>
          </div>
          <h2>No letters yet</h2>
          <p>
            Your generated cover letters will land here automatically. Head to
            the workspace to brief the agents.
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

function aggregateInsights(rows: LetterRow[]) {
  const byStatus: Record<ApplicationStatus, number> = {
    not_submitted: 0,
    submitted: 0,
    interviewing: 0,
    offer: 0,
    rejected: 0,
    ghosted: 0,
  }
  for (const r of rows) {
    const s = (r.application_status as ApplicationStatus | null) || "not_submitted"
    byStatus[s] += 1
  }
  const submitted =
    byStatus.submitted +
    byStatus.interviewing +
    byStatus.offer +
    byStatus.rejected +
    byStatus.ghosted
  const responded = byStatus.interviewing + byStatus.offer + byStatus.rejected
  const responseRate = submitted > 0 ? Math.round((responded / submitted) * 100) : null
  const tracked = submitted
  // Gold-standard = letters that empirically worked. Both offers and
  // interviews feed the example-retrieval base; offers carry more
  // weight than interviews but both are validation the letter did
  // its job (got the candidate past the screening filter at minimum).
  const goldStandard = byStatus.offer + byStatus.interviewing
  return {
    byStatus,
    submitted,
    responded,
    offers: byStatus.offer,
    interviews: byStatus.interviewing,
    goldStandard,
    responseRate,
    tracked,
  }
}
