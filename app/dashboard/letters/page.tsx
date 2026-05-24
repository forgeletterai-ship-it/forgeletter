import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentAppUser } from "@/lib/app-data"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = "force-dynamic"

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
  const { data: letters, count: totalCount } = await supabaseAdmin
    .from("generated_letters")
    .select(
      "id,job_title,company_name,final_score,ats_score,generation_status,template_chosen,tier,created_at",
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .not("final_cover_letter", "is", null)
    .order("created_at", { ascending: false })
    .limit(100)

  const rows = (letters || []) as LetterRow[]
  const generatedCount = totalCount ?? rows.length

  return (
    <div className="letters-page">
      <Link className="letters-interlock" href="/dashboard" aria-label="Letters are generated in the workspace. Open the workspace.">
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
          <span className="letters-interlock__dot letters-interlock__dot--current" aria-hidden="true" />
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
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/dashboard/letters/${row.id}`} className="letters-row">
                <div className="letters-row__main">
                  <div className="letters-row__title">
                    {row.job_title || "Untitled role"}
                    {row.company_name ? (
                      <span> at {row.company_name}</span>
                    ) : null}
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
                <span className="letters-row__chevron" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
