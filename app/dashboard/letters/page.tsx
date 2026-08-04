import Link from "next/link"
import { redirect } from "next/navigation"
import { LettersToolbar } from "@/components/LettersToolbar"
import { LetterRow } from "@/components/LetterRow"
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

const SORT_KEYS: SortKey[] = [
  "created_desc",
  "created_asc",
  "score_desc",
  "ats_desc",
  "outcome_desc",
]

/** Rows per page. Letters beyond this are reachable via pagination —
 *  the old hard .limit(100) made letter 101 invisible with no notice. */
const PAGE_SIZE = 20

interface LetterListRow {
  id: string
  job_title: string | null
  company_name: string | null
  final_score: number | null
  ats_score: number | null
  created_at: string
  application_status: ApplicationStatus | null
}

type SearchParams = {
  status?: string
  sort?: string
  q?: string
  page?: string
}

/**
 * Mid-pipeline crash recovery. The pipeline marks rows as 'running'
 * at insert and finalises them at the end. If Vercel kills the
 * function (300s max) the row stays 'running' forever. The quota
 * gate's 7-min orphan window already ignores these for letter
 * counting, but we also flip them to 'failed' here so they stop
 * showing as in-flight in any future report. Safe to run on every
 * page load; UPDATE is a no-op when no rows match.
 *
 * docs/supabase-optimizations.sql also schedules this via pg_cron;
 * this call stays as the belt-and-braces path for installs where the
 * cron job isn't enabled.
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
  const sort: SortKey = SORT_KEYS.includes(sp.sort as SortKey)
    ? (sp.sort as SortKey)
    : "created_desc"
  const rawQuery = (sp.q ?? "").trim().slice(0, 80)
  // PostgREST parses .or() — commas, parens and backslashes would
  // break out of the filter, and %/_ are LIKE wildcards. Strip them.
  const safeQuery = rawQuery.replace(/[,()\\%_*]/g, " ").trim()
  const pageParam = Number.parseInt(sp.page ?? "1", 10)
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1

  // Status tally in ONE round trip. Previously this was seven
  // parallel COUNT queries; a single column fetch is far cheaper in
  // connections and is plenty at realistic library sizes.
  const { data: statusRows } = await supabaseAdmin
    .from("generated_letters")
    .select("application_status")
    .eq("user_id", user.id)
    .not("final_cover_letter", "is", null)
    .neq("generation_status", "deleted")

  const byStatus: Record<ApplicationStatus, number> = {
    not_submitted: 0,
    submitted: 0,
    interviewing: 0,
    offer: 0,
    rejected: 0,
    ghosted: 0,
  }
  for (const row of statusRows ?? []) {
    const key = (row.application_status as ApplicationStatus) || "not_submitted"
    if (key in byStatus) byStatus[key] += 1
    else byStatus.not_submitted += 1
  }
  const totalCount = statusRows?.length ?? 0

  // List query: search + filter + sort + page window. `count: exact`
  // returns the FILTERED total so pagination knows how many pages.
  let listQuery = supabaseAdmin
    .from("generated_letters")
    .select(
      "id,job_title,company_name,final_score,ats_score,created_at,application_status",
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .not("final_cover_letter", "is", null)
    .neq("generation_status", "deleted")

  if (statusFilter) {
    listQuery = listQuery.eq("application_status", statusFilter)
  }
  if (safeQuery) {
    listQuery = listQuery.or(
      `job_title.ilike.%${safeQuery}%,company_name.ilike.%${safeQuery}%`
    )
  }
  switch (sort) {
    case "created_asc":
      listQuery = listQuery.order("created_at", { ascending: true })
      break
    case "score_desc":
      listQuery = listQuery.order("final_score", { ascending: false, nullsFirst: false })
      break
    case "ats_desc":
      listQuery = listQuery.order("ats_score", { ascending: false, nullsFirst: false })
      break
    case "outcome_desc":
      listQuery = listQuery.order("outcome_at", { ascending: false, nullsFirst: false })
      break
    default:
      listQuery = listQuery.order("created_at", { ascending: false })
  }

  const from = (page - 1) * PAGE_SIZE
  const { data: letters, count: filteredCount } = await listQuery.range(
    from,
    from + PAGE_SIZE - 1
  )
  const rows = (letters || []) as LetterListRow[]
  const matching = filteredCount ?? rows.length
  const totalPages = Math.max(1, Math.ceil(matching / PAGE_SIZE))
  const isFiltered = Boolean(statusFilter || safeQuery)

  // Crash-failed generations (no output at all — function killed,
  // pipeline died). Their quota slot was refunded automatically.
  const { data: crashRows } = await supabaseAdmin
    .from("generated_letters")
    .select("id,job_title,company_name,failure_reason,tier,created_at")
    .eq("user_id", user.id)
    .eq("generation_status", "failed")
    .is("final_cover_letter", null)
    .order("created_at", { ascending: false })
    .limit(10)
  const failedGenerations = (crashRows || []) as Array<{
    id: string
    job_title: string | null
    company_name: string | null
    failure_reason: string | null
    tier: string
    created_at: string
  }>

  const submitted =
    byStatus.submitted +
    byStatus.interviewing +
    byStatus.offer +
    byStatus.rejected +
    byStatus.ghosted
  const responded = byStatus.interviewing + byStatus.offer + byStatus.rejected
  const responseRate = submitted > 0 ? Math.round((responded / submitted) * 100) : null
  const goldStandard = byStatus.offer + byStatus.interviewing

  function pageHref(target: number) {
    const params = new URLSearchParams()
    if (statusFilter) params.set("status", statusFilter)
    if (sort !== "created_desc") params.set("sort", sort)
    if (rawQuery) params.set("q", rawQuery)
    if (target > 1) params.set("page", String(target))
    const qs = params.toString()
    return qs ? `/dashboard/letters?${qs}` : "/dashboard/letters"
  }

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
              : isFiltered
                ? `${matching} of ${totalCount} ${totalCount === 1 ? "letter" : "letters"} match.`
                : `${totalCount} cover ${totalCount === 1 ? "letter" : "letters"}. Copy, download, or update status without leaving this page.`}
          </p>
        </div>
      </header>

      {submitted > 0 ? (
        <section className="letters-strip" aria-label="Application outcomes">
          <div className="letters-strip__lead">
            <span className="letters-strip__value">
              {responseRate != null ? `${responseRate}%` : "—"}
            </span>
            <span className="letters-strip__label">response rate</span>
          </div>
          <div className="letters-strip__stats">
            <div className="letters-strip__stat">
              <strong>{submitted}</strong>
              <span>submitted</span>
            </div>
            <div className="letters-strip__stat">
              <strong>{responded}</strong>
              <span>heard back</span>
            </div>
            <div className="letters-strip__stat">
              <strong>{byStatus.interviewing}</strong>
              <span>{byStatus.interviewing === 1 ? "interview" : "interviews"}</span>
            </div>
            <div className="letters-strip__stat letters-strip__stat--offer">
              <strong>{byStatus.offer}</strong>
              <span>{byStatus.offer === 1 ? "offer" : "offers"}</span>
            </div>
          </div>
          {goldStandard > 0 ? (
            <div
              className="letters-strip__gold"
              title="Letters that earned an offer or interview feed the example-retrieval base for future generations."
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.8 14.3 9l6.2 2.3-6.2 2.4L12 20l-2.3-6.3-6.2-2.4L9.7 9 12 2.8Z" />
              </svg>
              <span>
                <strong>{goldStandard}</strong> gold-standard
              </span>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Toolbar only earns its space once the library is big enough
          to need it — below five letters you can see everything. */}
      {totalCount >= 5 ? (
        <LettersToolbar
          currentStatus={statusFilter ?? ""}
          currentSort={sort}
          currentQuery={rawQuery}
          counts={byStatus}
          total={totalCount}
        />
      ) : null}

      {failedGenerations.length > 0 ? (
        <section
          className="letters-failed"
          aria-label="Failed generations (not charged)"
        >
          <h2 className="letters-failed__title">
            {failedGenerations.length} failed{" "}
            {failedGenerations.length === 1 ? "generation" : "generations"} — not
            counted against your allowance
          </h2>
          <ul className="letters-failed__list">
            {failedGenerations.map((f) => (
              <li key={f.id} className="letters-failed__row">
                <div>
                  <strong>
                    {f.job_title || "Untitled role"}
                    {f.company_name ? ` at ${f.company_name}` : ""}
                  </strong>
                  <span className="letters-failed__meta">
                    {new Date(f.created_at).toLocaleDateString()} ·{" "}
                    {f.tier.toUpperCase()}
                  </span>
                </div>
                <p className="letters-failed__reason">
                  {f.failure_reason ||
                    "Generation did not complete. The letter slot was refunded — try again from the workspace."}
                </p>
              </li>
            ))}
          </ul>
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
          <h2>{isFiltered ? "No letters match" : "No letters yet"}</h2>
          <p>
            {isFiltered
              ? "Try a different search or clear the filters."
              : "Your generated cover letters will land here automatically. Head to the workspace to brief the agents."}
          </p>
          {isFiltered ? (
            <Link className="button-secondary" href="/dashboard/letters">
              Clear filters
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <div className="letters-table" role="table" aria-label="Your cover letters">
            <div className="letters-table__head" role="row">
              <span role="columnheader">Role</span>
              <span role="columnheader">Created</span>
              <span role="columnheader" className="letters-table__num">
                Score
              </span>
              <span role="columnheader" className="letters-table__num">
                ATS
              </span>
              <span role="columnheader">Status</span>
              <span role="columnheader" className="letters-table__actions-head">
                Actions
              </span>
            </div>
            {rows.map((row) => (
              <LetterRow
                key={row.id}
                id={row.id}
                jobTitle={row.job_title}
                companyName={row.company_name}
                finalScore={row.final_score}
                atsScore={row.ats_score}
                createdAt={row.created_at}
                status={row.application_status || "not_submitted"}
                statusLabels={STATUS_LABEL}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <nav className="letters-pager" aria-label="Pagination">
              {page > 1 ? (
                <Link className="letters-pager__btn" href={pageHref(page - 1)}>
                  ← Previous
                </Link>
              ) : (
                <span className="letters-pager__btn is-disabled">← Previous</span>
              )}
              <span className="letters-pager__status">
                Page {page} of {totalPages} · {matching}{" "}
                {matching === 1 ? "letter" : "letters"}
              </span>
              {page < totalPages ? (
                <Link className="letters-pager__btn" href={pageHref(page + 1)}>
                  Next →
                </Link>
              ) : (
                <span className="letters-pager__btn is-disabled">Next →</span>
              )}
            </nav>
          ) : null}
        </>
      )}
    </div>
  )
}
