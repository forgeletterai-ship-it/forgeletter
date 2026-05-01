"use client"

import { useMemo, useState } from "react"
import type { ApplicationBrief, UserProfile, UserSettings } from "@/lib/app-data"

type DashboardClientProps = {
  initialBriefs: ApplicationBrief[]
  plan: string
  profile: UserProfile
  settings: UserSettings
  setupError?: string
}

type ToneName = "Professional" | "Warm" | "Direct" | "Executive"

const tones: Array<{
  name: ToneName
  detail: string
  icon: "diamond" | "sun" | "send" | "crown"
}> = [
  {
    name: "Professional",
    detail: "Clear, polished, and suitable for most roles.",
    icon: "diamond",
  },
  {
    name: "Warm",
    detail: "Human and relational for culture-led companies.",
    icon: "sun",
  },
  {
    name: "Direct",
    detail: "Sharp, confident, and outcome-focused.",
    icon: "send",
  },
  {
    name: "Executive",
    detail: "Strategic language for senior or agency-reviewed work.",
    icon: "crown",
  },
]

const sampleLetter = `May 14, 2025

Hiring Manager
Spotify
Stockholm, Sweden

Dear Hiring Manager,

I'm excited to apply for the Senior Marketing Manager role at Spotify. With 8+ years leading growth and brand campaigns for global B2C products, I've built data-informed strategies that connect audiences to meaningful-and move metrics.

At my current company, I led cross-functional teams to launch multi-channel campaigns across email, social, and paid media that increased audience usage by 34% and drove a 35% lift in conversion. I thrive at the intersection of creativity and analytics, turning insights into stories that resonate.

I'm drawn to Spotify's mission to unlock the power of human creativity. I'd love the opportunity to help your marketing team continue building moments that millions of people connect with every day.

Thank you for your time and consideration.

Warm regards,
Alex Morgan
Alex Morgan
alex.morgan@firstdomain.com | +1 (415) 555-0123
linkedin.com/in/alexmorgan`

function Icon({ name }: { name: string }) {
  if (name === "sparkle") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.8 14.3 9l6.2 2.3-6.2 2.4L12 20l-2.3-6.3-6.2-2.4L9.7 9 12 2.8Z" />
        <path d="M19 2.8 20 5l2.2 1L20 7l-1 2.2L18 7l-2.2-1L18 5l1-2.2Z" />
      </svg>
    )
  }

  if (name === "crown") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 18.5h16v2H4v-2Z" />
        <path d="m4.6 16.5-1.1-9 5.1 4L12 3.8l3.4 7.7 5.1-4-1.1 9H4.6Z" />
      </svg>
    )
  }

  if (name === "diamond") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.7 4.4h10.6l4 5.2L12 20.2 2.7 9.6l4-5.2Z" />
        <path d="M2.9 9.6h18.2M6.9 4.6l3 5 2.1-5 2.1 5 3-5M9.9 9.6 12 20l2.1-10.4" />
      </svg>
    )
  }

  if (name === "sun") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 2.8v3M12 18.2v3M4.9 4.9 7 7M17 17l2.1 2.1M2.8 12h3M18.2 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
      </svg>
    )
  }

  if (name === "send") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3.6 11.5 16.8-8-7.8 16.9-2.4-7-6.6-1.9Z" />
        <path d="m10.2 13.4 5-5" />
      </svg>
    )
  }

  if (name === "file") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3.8h8.4L19 8.4v11.8H6V3.8Z" />
        <path d="M14.4 3.8v4.6H19M9 12h6M9 15.5h5" />
      </svg>
    )
  }

  if (name === "shield") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s7-3.6 7-10.2V5.6L12 3 5 5.6v5.2C5 17.4 12 21 12 21Z" />
        <path d="m9.5 11.8 1.8 1.8 3.5-3.8" />
      </svg>
    )
  }

  if (name === "target") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3" />
      </svg>
    )
  }

  if (name === "copy") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="8" y="8" width="11" height="13" rx="1.8" />
        <path d="M5 16V5.8C5 4.8 5.8 4 6.8 4H15" />
      </svg>
    )
  }

  if (name === "download") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v11" />
        <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
        <path d="M4.5 19.5h15" />
      </svg>
    )
  }

  if (name === "refresh") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.5 8.5A7.5 7.5 0 0 0 6 6.2L4.2 8.1" />
        <path d="M4 4.2v4.2h4.2" />
        <path d="M4.5 15.5A7.5 7.5 0 0 0 18 17.8l1.8-1.9" />
        <path d="M20 19.8v-4.2h-4.2" />
      </svg>
    )
  }

  if (name === "lock") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    )
  }

  return null
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

function makePdf(text: string) {
  const lines = text.split("\n").flatMap((line) => {
    if (line.length <= 84) {
      return [line]
    }

    const chunks: string[] = []
    let current = ""
    for (const word of line.split(" ")) {
      if (`${current} ${word}`.trim().length > 84) {
        chunks.push(current)
        current = word
      } else {
        current = `${current} ${word}`.trim()
      }
    }
    if (current) {
      chunks.push(current)
    }
    return chunks
  })

  const body = lines
    .slice(0, 46)
    .map((line, index) => `BT /F1 11 Tf 56 ${780 - index * 16} Td (${escapePdfText(line)}) Tj ET`)
    .join("\n")

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${body.length} >> stream\n${body}\nendstream endobj`,
  ]
  let pdf = "%PDF-1.4\n"
  const offsets = [0]

  for (const object of objects) {
    offsets.push(pdf.length)
    pdf += `${object}\n`
  }

  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`

  return pdf
}

export function DashboardClient({
  initialBriefs,
  profile,
  settings,
  setupError,
}: DashboardClientProps) {
  const normalizedTone = tones.some((item) => item.name === settings.default_tone)
    ? (settings.default_tone as ToneName)
    : "Professional"
  const [briefs, setBriefs] = useState(initialBriefs)
  const [role, setRole] = useState(initialBriefs[0]?.role || "Senior Marketing Manager")
  const [company, setCompany] = useState(initialBriefs[0]?.company || "Spotify")
  const [tone, setTone] = useState<ToneName>(normalizedTone)
  const [jobDescription, setJobDescription] = useState("")
  const [candidateExperience, setCandidateExperience] = useState(
    profile.key_achievements || profile.strengths || ""
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState(setupError || "")

  const displayPlan = "ULTRA"
  const generatedLetter = useMemo(() => {
    if (!role && !company) {
      return sampleLetter
    }

    return sampleLetter
      .replaceAll("Senior Marketing Manager", role || "Senior Marketing Manager")
      .replaceAll("Spotify", company || "Spotify")
  }, [company, role])

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
      setMessage("Brief saved to history.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the brief.")
    } finally {
      setSaving(false)
    }
  }

  async function copyLetter() {
    setMessage("")
    setError("")

    try {
      await navigator.clipboard.writeText(generatedLetter)
      setMessage("Cover letter copied to clipboard.")
    } catch {
      setError("Could not copy the letter. Please try again.")
    }
  }

  function downloadPdf() {
    const pdf = makePdf(generatedLetter)
    const blob = new Blob([pdf], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${company || "cover-letter"}-${role || "draft"}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function regenerate() {
    setMessage("Preview refreshed.")
  }

  return (
    <div className="cover-workspace" aria-label="Cover letter workspace">
      <section className="cover-panel cover-plan-panel">
        <div className="cover-plan-icon">
          <Icon name="crown" />
        </div>
        <div className="cover-plan-content">
          <div className="cover-section-row">
            <div>
              <h2>{displayPlan} plan</h2>
              <p>Your paid workspace is active. Generate unlimited, premium cover letters.</p>
            </div>
          </div>
          <div className="cover-plan-meter">
            <span />
          </div>
          <div className="cover-plan-meta">
            <strong>63% <span>of plan used</span></strong>
            <span>Renews Jun 15, 2025</span>
          </div>
        </div>
      </section>

      <section className="cover-panel cover-status-panel">
        <div className="cover-panel-title">
          <span className="cover-title-icon cover-title-icon--spark">
            <Icon name="sparkle" />
          </span>
          <h2>Workspace status</h2>
        </div>
        <div className="cover-status-grid">
          <div className="cover-status-item">
            <span className="cover-status-icon">
              <Icon name="file" />
            </span>
            <strong>{briefs.length}</strong>
            <span>saved briefs</span>
          </div>
          <div className="cover-status-item cover-status-item--match">
            <span className="cover-progress-ring">
              <Icon name="shield" />
            </span>
            <strong>92</strong>
            <span>ATS-ready</span>
            <small>optimal for applicant tracking</small>
          </div>
          <div className="cover-status-item">
            <span className="cover-status-icon">
              <Icon name="target" />
            </span>
            <strong>18</strong>
            <span>keywords matched</span>
            <small>matched from target job brief</small>
          </div>
        </div>
      </section>

      <section className="cover-panel cover-draft-panel">
        <div className="cover-section-row cover-section-row--compact">
          <div className="cover-panel-title">
            <span className="cover-title-icon">
              <Icon name="sparkle" />
            </span>
            <h2>Draft inputs</h2>
          </div>
        </div>
        <p className="cover-panel-copy">
          Save a structured brief now. AI generation can plug into this exact workflow later.
        </p>

        {message ? <div className="cover-success">{message}</div> : null}
        {error ? <div className="cover-error">{error}</div> : null}

        <div className="cover-form-block">
          <label>Tone preset</label>
          <div className="cover-tone-grid">
            {tones.map((item) => (
              <button
                className={`cover-tone-card${tone === item.name ? " is-active" : ""}`}
                key={item.name}
                type="button"
                onClick={() => setTone(item.name)}
              >
                <span className={`cover-tone-icon cover-tone-icon--${item.icon}`}>
                  <Icon name={item.icon} />
                </span>
                {tone === item.name ? (
                  <span className="cover-tone-check" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="m6 12.4 3.8 3.8L18.5 7.5" />
                    </svg>
                  </span>
                ) : null}
                <strong>{item.name}</strong>
                <small>{item.detail}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="cover-field-grid">
          <div className="cover-field">
            <label htmlFor="cover-role">Target role</label>
            <input
              id="cover-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="Senior Marketing Manager"
            />
          </div>
          <div className="cover-field">
            <label htmlFor="cover-company">Company</label>
            <input
              id="cover-company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Spotify"
            />
          </div>
        </div>

        <div className="cover-field">
          <label htmlFor="cover-job">Job description & requirements</label>
          <div className="cover-textarea-shell">
            <textarea
              id="cover-job"
              maxLength={2500}
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste responsibilities, requirements, company details, and keywords from the posting."
            />
            <span>{jobDescription.length}/2500</span>
          </div>
        </div>

        <div className="cover-field">
          <label htmlFor="cover-experience">Candidate experience</label>
          <div className="cover-textarea-shell">
            <textarea
              id="cover-experience"
              maxLength={2500}
              value={candidateExperience}
              onChange={(event) => setCandidateExperience(event.target.value)}
              placeholder="Add current role, measurable wins, strengths, tools, and motivation for this job."
            />
            <span>{candidateExperience.length}/2500</span>
          </div>
        </div>

        <button className="cover-save-button" type="button" onClick={saveBrief} disabled={saving}>
          <Icon name="sparkle" />
          {saving ? "Saving brief..." : "Save brief"}
        </button>

        <p className="cover-privacy">
          <Icon name="lock" />
          Your data is private and secure. We never share your information.
        </p>
      </section>

      <section className="cover-panel cover-letter-panel">
        <div className="cover-letter-head">
          <div>
            <div className="cover-panel-title">
              <span className="cover-title-icon">
                <Icon name="file" />
              </span>
              <h2>Generated cover letter</h2>
            </div>
            <p className="cover-panel-copy">AI-crafted using your brief. Review, refine, and make it yours.</p>
          </div>
          <div className="cover-letter-actions">
            <button className="cover-small-button" type="button" onClick={regenerate}>
              <Icon name="refresh" />
              Regenerate
            </button>
          </div>
        </div>

        <article className="cover-letter-paper">
          <p>May 14, 2025</p>
          <p>
            Hiring Manager<br />
            {company || "Spotify"}<br />
            Stockholm, Sweden
          </p>
          <p>Dear Hiring Manager,</p>
          <p>
            I'm excited to apply for the {role || "Senior Marketing Manager"} role at {company || "Spotify"}. With
            8+ years leading growth and brand campaigns for global B2C products, I've built data-informed
            strategies that connect audiences to meaningful-and move metrics.
          </p>
          <p>
            At my current company, I led cross-functional teams to launch multi-channel campaigns across email,
            social, and paid media that increased audience usage by 34% and drove a 35% lift in conversion. I
            thrive at the intersection of creativity and analytics, turning insights into stories that resonate.
          </p>
          <p>
            I'm drawn to {company || "Spotify"}'s mission to unlock the power of human creativity. I'd love the
            opportunity to help your marketing team continue building moments that millions of people connect
            with every day.
          </p>
          <p>Thank you for your time and consideration.</p>
          <p>Warm regards,</p>
          <div className="cover-signature">Alex Morgan</div>
          <small>
            Alex Morgan<br />
            alex.morgan@firstdomain.com&nbsp;&nbsp;|&nbsp;&nbsp;+1 (415) 555-0123<br />
            linkedin.com/in/alexmorgan
          </small>
        </article>

        <div className="cover-output-actions">
          <button className="cover-output-button" type="button" onClick={copyLetter}>
            <Icon name="copy" />
            Copy to clipboard
          </button>
          <button className="cover-output-button cover-output-button--download" type="button" onClick={downloadPdf}>
            <Icon name="download" />
            Download PDF
          </button>
        </div>
      </section>
    </div>
  )
}
