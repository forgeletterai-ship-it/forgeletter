import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentAppUser } from "@/lib/app-data"
import {
  getBillingPeriod,
  getCurrentPlanPeriodStart,
  getPlanUsageDetails,
} from "@/lib/plans"
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

function statusBadge(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case "passed":
      return { label: "Ready", color: "var(--green)", bg: "rgba(40,120,94,0.10)" }
    case "running":
    case "queued":
      return { label: "In progress", color: "var(--gold)", bg: "rgba(199,154,54,0.10)" }
    case "failed":
      return { label: "Failed", color: "var(--red)", bg: "rgba(164,60,60,0.10)" }
    default:
      return { label: status, color: "var(--muted)", bg: "var(--paper)" }
  }
}

export default async function LettersPage() {
  const { user } = await getCurrentAppUser()
  if (!user) redirect("/auth/login")

  const period = getBillingPeriod(user.plan)
  const periodStart = getCurrentPlanPeriodStart(period).toISOString()

  const [{ data: letters }, { count: monthCount }] = await Promise.all([
    supabaseAdmin
      .from("generated_letters")
      .select(
        "id,job_title,company_name,final_score,ats_score,generation_status,template_chosen,tier,created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("generated_letters")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", periodStart)
      .in("generation_status", ["queued", "running", "passed"]),
  ])

  const rows = (letters || []) as LetterRow[]
  const usage = getPlanUsageDetails(user.plan, monthCount || 0)

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 64px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-0.02em" }}>
            My letters
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
            Every letter you've generated. Click any one to view, edit, or download.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>This {usage.periodNoun}</div>
            <div style={{ fontWeight: 700 }}>
              {monthCount || 0} / {usage.limit}
            </div>
          </div>
          <Link className="button" href="/dashboard/generate">
            New letter →
          </Link>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="dashboard-card" style={{ textAlign: "center", padding: 48 }}>
          <h2 style={{ margin: 0 }}>Ready to write your first letter?</h2>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>
            Paste a job description and your resume — we'll handle the rest.
          </p>
          <Link className="button" href="/dashboard/generate" style={{ marginTop: 16 }}>
            Start generating →
          </Link>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
          {rows.map((row) => {
            const status = statusBadge(row.generation_status)
            return (
              <li key={row.id}>
                <Link
                  href={`/dashboard/letters/${row.id}`}
                  className="dashboard-card"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    alignItems: "center",
                    gap: 16,
                    textDecoration: "none",
                    color: "var(--ink)",
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                      {row.job_title || "Untitled role"}
                      {row.company_name ? (
                        <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                          {" "}
                          at {row.company_name}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", color: "var(--muted)", fontSize: 13 }}>
                      <span>{formatRelative(row.created_at)}</span>
                      <span>·</span>
                      <span>{row.tier.toUpperCase()}</span>
                      {row.final_score != null && (
                        <>
                          <span>·</span>
                          <span>Score {row.final_score}</span>
                        </>
                      )}
                      {row.ats_score != null && (
                        <>
                          <span>·</span>
                          <span>ATS {row.ats_score}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 999,
                      color: status.color,
                      background: status.bg,
                      border: `1px solid ${status.color}`,
                      fontWeight: 700,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {status.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
