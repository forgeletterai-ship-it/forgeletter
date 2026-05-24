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

  const { data: letters, count: totalCount } = await supabaseAdmin
    .from("generated_letters")
    .select(
      "id,job_title,company_name,final_score,ats_score,template_chosen,tier,created_at",
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .eq("generation_status", "passed")
    .order("created_at", { ascending: false })
    .limit(100)

  const rows = (letters || []) as LetterRow[]
  const generatedCount = totalCount ?? rows.length

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 64px" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-0.02em" }}>
            My letters
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
            {generatedCount === 0
              ? "Your generated cover letters will appear here."
              : `${generatedCount} generated ${
                  generatedCount === 1 ? "letter" : "letters"
                }. Click any one to view, edit, or download.`}
          </p>
        </div>
        <Link className="button" href="/dashboard">
          ← Back to workspace
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="dashboard-card" style={{ textAlign: "center", padding: 48 }}>
          <h2 style={{ margin: 0 }}>No letters yet</h2>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>
            Head to the workspace to generate your first cover letter.
          </p>
          <Link className="button" href="/dashboard" style={{ marginTop: 16 }}>
            Open workspace →
          </Link>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
          {rows.map((row) => (
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
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      color: "var(--muted)",
                      fontSize: 13,
                    }}
                  >
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
                    color: "var(--green)",
                    background: "rgba(40,120,94,0.10)",
                    border: "1px solid var(--green)",
                    fontWeight: 700,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  Ready
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
