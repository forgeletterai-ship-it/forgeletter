"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import type { ApplicationBrief, UserProfile, UserSettings } from "@/lib/app-data"

type DashboardClientProps = {
  initialBriefs: ApplicationBrief[]
  profile: UserProfile
  settings: UserSettings
  setupError?: string
}

const tones = [
  {
    name: "Professional",
    detail: "Clear, polished, and suitable for most roles.",
  },
  {
    name: "Warm",
    detail: "Human and relational for culture-led companies.",
  },
  {
    name: "Direct",
    detail: "Short, confident, and outcome-focused.",
  },
  {
    name: "Executive",
    detail: "Strategic language for senior or agency-reviewed work.",
  },
]

export function DashboardClient({
  initialBriefs,
  profile,
  settings,
  setupError,
}: DashboardClientProps) {
  const [briefs, setBriefs] = useState(initialBriefs)
  const [role, setRole] = useState("")
  const [company, setCompany] = useState("")
  const [tone, setTone] = useState(settings.default_tone)
  const [jobDescription, setJobDescription] = useState("")
  const [candidateExperience, setCandidateExperience] = useState(
    profile.key_achievements || profile.strengths
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState(setupError || "")

  const latestBrief = briefs[0]
  const profileStrength = useMemo(() => {
    return [
      profile.professional_headline,
      profile.target_roles,
      profile.industries,
      profile.key_achievements,
      profile.strengths,
    ].filter(Boolean).length
  }, [profile])

  async function saveBrief() {
    setSaving(true)
    setMessage("")
    setError("")

    try {
      const res = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          company,
          tone,
          job_description: jobDescription,
          candidate_experience: candidateExperience,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Could not save the brief.")
      }

      setBriefs((current) => [data.brief, ...current])
      setRole("")
      setCompany("")
      setJobDescription("")
      setCandidateExperience(profile.key_achievements || profile.strengths)
      setMessage("Brief saved to history.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the brief.")
    } finally {
      setSaving(false)
    }
  }

  async function archiveBrief(id: string) {
    setError("")
    const res = await fetch(`/api/briefs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Could not archive brief.")
      return
    }

    setBriefs((current) =>
      current.map((brief) => (brief.id === id ? data.brief : brief))
    )
  }

  return (
    <div className="dashboard-workspace">
      <section className="dashboard-card">
        <div className="card-heading-row">
          <div>
            <h3>Draft inputs</h3>
            <p>
              Save a structured brief now; AI generation can plug into this
              exact workflow later.
            </p>
          </div>
          <span className="status-pill active">{tone}</span>
        </div>

        {message ? <div className="success-alert">{message}</div> : null}
        {error ? <div className="alert">{error}</div> : null}

        <div className="form-stack" style={{ marginTop: 18 }}>
          <div>
            <div className="field-caption">
              <span>Tone preset</span>
              <span>{tone}</span>
            </div>
            <div className="tone-card-grid">
              {tones.map((item) => (
                <button
                  className={`tone-card${tone === item.name ? " active" : ""}`}
                  key={item.name}
                  type="button"
                  onClick={() => setTone(item.name)}
                >
                  <strong>{item.name}</strong>
                  <span>{item.detail}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="dashboard-form-grid">
            <div className="field">
              <label htmlFor="role">Target role</label>
              <input
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                placeholder="Senior Marketing Manager"
              />
            </div>
            <div className="field">
              <label htmlFor="company">Company</label>
              <input
                id="company"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="Spotify"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="job">Job description and requirements</label>
            <textarea
              id="job"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste responsibilities, requirements, company details, and keywords from the posting."
            />
          </div>
          <div className="field">
            <label htmlFor="background">Candidate experience</label>
            <textarea
              id="background"
              value={candidateExperience}
              onChange={(event) => setCandidateExperience(event.target.value)}
              placeholder="Add current role, measurable wins, strengths, tools, and motivation for this job."
            />
          </div>

          <button className="button-soft" type="button" onClick={saveBrief} disabled={saving}>
            {saving ? "Saving brief..." : "Save brief"}
          </button>
        </div>
      </section>

      <aside className="dashboard-card">
        <h3>Workspace status</h3>
        <div className="insight-list">
          <div>
            <strong>{briefs.length}</strong>
            <span>saved briefs</span>
          </div>
          <div>
            <strong>{profileStrength}/5</strong>
            <span>profile sections complete</span>
          </div>
          <div>
            <strong>{latestBrief ? latestBrief.status.replace("_", " ") : "empty"}</strong>
            <span>latest brief status</span>
          </div>
        </div>

        {latestBrief ? (
          <div className="partnership-note">
            <span className="section-kicker">Latest brief</span>
            <h3>{latestBrief.role || "Untitled role"}</h3>
            <p>{latestBrief.company || "No company added yet"}</p>
            <div className="dashboard-action-row">
              <Link className="button-secondary" href="/dashboard/history">
                View history
              </Link>
              <button
                className="button-soft"
                type="button"
                onClick={() => archiveBrief(latestBrief.id)}
              >
                Archive
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <h3>No briefs yet</h3>
            <p>
              Save your first job brief to start building application history.
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}
