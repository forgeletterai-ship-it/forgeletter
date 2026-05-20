"use client"

import Link from "next/link"
import { useCallback, useMemo, useRef, useState } from "react"
import { ATSScoreCard, type ATSData } from "@/components/ATSScoreCard"

type Tone = "professional" | "confident" | "warm" | "concise"
type Step = 1 | 2 | 3
type Phase = "form" | "running" | "done" | "error"
type BasePlan = "free" | "starter" | "pro" | "ultra"

const TONES: Array<{ key: Tone; title: string; description: string }> = [
  { key: "professional", title: "Professional", description: "Formal, precise, structured." },
  { key: "confident", title: "Confident", description: "Direct and evidence-led. Opens with achievement." },
  { key: "warm", title: "Warm", description: "Human and personable — never casual." },
  { key: "concise", title: "Concise", description: "Tight, weighty, every sentence earns its place." },
]

const AGENT_LABELS: Record<string, string> = {
  InputCleaner: "Cleaning inputs",
  ResumeAnalyst: "Analysing resume",
  JobAnalyst: "Analysing job description",
  MatchAnalyst: "Building match strategy",
  ExampleRetrieval: "Finding gold examples",
  Writer: "Writing your letter",
  ATSAgent: "Scoring against ATS keywords",
  HMCritic: "Hiring manager critique",
  FinalEditor: "Polishing prose",
  HallucinationDetector: "Verifying every claim",
  QualityGate: "Final quality check",
  RewriteAgent: "Rewriting with feedback",
  Complete: "Done",
}

type AgentStatus = "pending" | "running" | "done" | "failed"

interface AgentRow {
  key: string
  label: string
  status: AgentStatus
  message?: string
}

interface CompleteEvent {
  generationId: string
  status: "passed" | "failed"
  finalLetter: string
  finalScore: number
  atsScore?: number
  atsVerdict?: string
  atsCoveredKeywords?: string[]
  atsMissingKeywords?: string[]
  hallucinationRisk?: string
  rewriteCycles: number
  agentsRun: string[]
  failureReason?: string
}

interface Props {
  planLabel: string
  basePlan: BasePlan
  lettersUsed: number
  lettersLimit: number
  periodNoun: string
  defaultName: string
}

export function GenerateClient(props: Props) {
  const [step, setStep] = useState<Step>(1)
  const [phase, setPhase] = useState<Phase>("form")
  const [jobTitle, setJobTitle] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [resumeText, setResumeText] = useState("")
  const [tone, setTone] = useState<Tone>("professional")
  const [agentRows, setAgentRows] = useState<AgentRow[]>([])
  const [percent, setPercent] = useState(0)
  const [result, setResult] = useState<CompleteEvent | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [editedLetter, setEditedLetter] = useState("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle")
  const abortRef = useRef<AbortController | null>(null)

  const lettersLeft = Math.max(0, props.lettersLimit - props.lettersUsed)
  const limitReached = lettersLeft === 0

  const canNext1 = jobDescription.trim().length >= 200
  const canNext2 = resumeText.trim().length >= 200

  const updateAgent = useCallback(
    (key: string, patch: Partial<AgentRow>) => {
      setAgentRows((prev) => {
        const idx = prev.findIndex((r) => r.key === key)
        const label = AGENT_LABELS[key] ?? key
        if (idx === -1) {
          return [...prev, { key, label, status: "pending", ...patch }]
        }
        const copy = [...prev]
        copy[idx] = { ...copy[idx], ...patch }
        return copy
      })
    },
    []
  )

  const startGeneration = useCallback(async () => {
    setPhase("running")
    setPercent(0)
    setAgentRows([])
    setResult(null)
    setErrorMsg(null)
    setEditedLetter("")

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resumeText.trim(),
          jobDescription: jobDescription.trim(),
          jobTitle: jobTitle.trim() || undefined,
          companyName: companyName.trim() || undefined,
          tone,
        }),
        signal: controller.signal,
      })

      if (!response.body) {
        throw new Error("No response stream")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE frames are separated by \n\n. Process complete frames.
        let separatorIdx
        while ((separatorIdx = buffer.indexOf("\n\n")) !== -1) {
          const rawFrame = buffer.slice(0, separatorIdx)
          buffer = buffer.slice(separatorIdx + 2)
          const dataLine = rawFrame
            .split("\n")
            .find((l) => l.startsWith("data:"))
          if (!dataLine) continue
          const payload = JSON.parse(dataLine.slice(5).trim()) as Record<string, unknown>
          handleEvent(payload)
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setPhase("error")
    }
  }, [resumeText, jobDescription, jobTitle, companyName, tone])

  function handleEvent(event: Record<string, unknown>) {
    const type = event.type as string

    if (type === "init") {
      // generationId issued — we don't need to navigate; it's bound to the row
      return
    }

    if (type === "progress") {
      const agent = String(event.agent ?? "")
      const status = String(event.status ?? "") as AgentStatus
      const pct = Number(event.percent ?? 0)
      setPercent(pct)
      updateAgent(agent, {
        status,
        message: event.message ? String(event.message) : undefined,
      })
      return
    }

    if (type === "complete") {
      const data = event as unknown as CompleteEvent
      setResult(data)
      setEditedLetter(data.finalLetter)
      setPercent(100)
      setPhase("done")
      return
    }

    if (type === "error") {
      setErrorMsg(String(event.message ?? "Generation failed."))
      setPhase("error")
      return
    }
  }

  const onCopy = useCallback(async () => {
    if (!editedLetter) return
    try {
      await navigator.clipboard.writeText(editedLetter)
      setCopyStatus("copied")
      setTimeout(() => setCopyStatus("idle"), 1800)
    } catch {
      // ignore
    }
  }, [editedLetter])

  const onSave = useCallback(async () => {
    if (!result) return
    setSaveStatus("saving")
    try {
      const res = await fetch(`/api/letters/${result.generationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalCoverLetter: editedLetter }),
      })
      if (!res.ok) throw new Error(await res.text())
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 1800)
    } catch {
      setSaveStatus("error")
    }
  }, [editedLetter, result])

  const atsData: ATSData | null = useMemo(() => {
    if (!result) return null
    if (result.atsScore == null) return null
    return {
      score: result.atsScore,
      verdict: (result.atsVerdict ?? "Good") as ATSData["verdict"],
      coveredKeywords: result.atsCoveredKeywords ?? [],
      missingKeywords: result.atsMissingKeywords ?? [],
    }
  }, [result])

  // ------------------- Render ------------------------

  if (limitReached && phase === "form") {
    return (
      <div style={pageWrap}>
        <div className="dashboard-card" style={{ textAlign: "center" }}>
          <h2 style={{ marginTop: 0 }}>You've used all your letters this {props.periodNoun}.</h2>
          <p style={{ color: "var(--muted)" }}>
            {props.planLabel} plan includes {props.lettersLimit} letters per {props.periodNoun}.
            Upgrade for more, or wait until your allowance resets.
          </p>
          <Link className="button" href="/dashboard/billing" style={{ marginTop: 16 }}>
            See plans →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={pageWrap}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-0.02em" }}>
            New cover letter
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
            12-agent pipeline. Quality-gated. Tier: <strong>{props.planLabel}</strong>.
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>This {props.periodNoun}</div>
          <div style={{ fontWeight: 700 }}>
            {props.lettersUsed} / {props.lettersLimit} used
          </div>
        </div>
      </header>

      {phase === "form" && (
        <div className="dashboard-card">
          <StepIndicator step={step} />

          {step === 1 && (
            <section>
              <h2 style={sectionTitle}>Tell us about the role</h2>
              <p style={sectionSub}>
                The more specific the JD, the more specific your letter. Paste the full posting.
              </p>
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
                <Field label="Job title" hint="e.g. Senior Product Designer">
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Optional, but recommended"
                  />
                </Field>
                <Field label="Company name" hint="e.g. Stripe">
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Optional, but recommended"
                  />
                </Field>
              </div>
              <Field
                label="Job description"
                hint={`${jobDescription.length} / 200 minimum`}
              >
                <textarea
                  rows={10}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here. Include required + nice-to-have skills."
                />
              </Field>
              <div style={navRow}>
                <span />
                <button
                  className="button"
                  disabled={!canNext1}
                  onClick={() => setStep(2)}
                  style={!canNext1 ? disabledBtn : undefined}
                >
                  Next →
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2 style={sectionTitle}>Your experience</h2>
              <p style={sectionSub}>
                Paste your resume — the more specific your achievements (numbers, scale, results), the stronger the letter.
              </p>
              <Field label="Resume text" hint={`${resumeText.length} / 200 minimum`}>
                <textarea
                  rows={14}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your full resume here — work history, achievements, skills, education."
                />
              </Field>
              <div style={navRow}>
                <button className="button-secondary" onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button
                  className="button"
                  disabled={!canNext2}
                  onClick={() => setStep(3)}
                  style={!canNext2 ? disabledBtn : undefined}
                >
                  Next →
                </button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2 style={sectionTitle}>Tone</h2>
              <p style={sectionSub}>How should the letter read?</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginTop: 16 }}>
                {TONES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTone(t.key)}
                    style={toneCard(tone === t.key)}
                  >
                    <strong style={{ fontSize: 15 }}>{t.title}</strong>
                    <span style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                      {t.description}
                    </span>
                  </button>
                ))}
              </div>
              <div style={navRow}>
                <button className="button-secondary" onClick={() => setStep(2)}>
                  ← Back
                </button>
                <button className="button" onClick={startGeneration}>
                  Generate my letter →
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {phase === "running" && (
        <div className="dashboard-card">
          <h2 style={{ marginTop: 0 }}>Writing your letter…</h2>
          <p style={{ color: "var(--muted)" }}>
            This typically takes 30 to 90 seconds. Don't close the tab.
          </p>
          <ProgressBar percent={percent} />
          <ul style={agentList}>
            {agentRows.map((row) => (
              <li key={row.key} style={agentRowStyle(row.status)}>
                <span style={statusDot(row.status)} />
                <span style={{ flex: 1 }}>{row.label}</span>
                {row.message ? (
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>{row.message}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {phase === "done" && result && (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="dashboard-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0 }}>Your letter</h2>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>
                  Edit freely. Save your changes before downloading.
                </p>
              </div>
              <ScoreBadge score={result.finalScore} status={result.status} />
            </div>
            {result.status === "failed" && (
              <div className="alert" style={{ marginTop: 12 }}>
                {result.failureReason ?? "Quality below threshold."} You can still copy and edit the letter below.
              </div>
            )}
            <textarea
              value={editedLetter}
              onChange={(e) => setEditedLetter(e.target.value)}
              rows={18}
              style={{
                width: "100%",
                marginTop: 16,
                padding: 16,
                border: "1px solid var(--line)",
                borderRadius: 8,
                background: "var(--paper)",
                color: "var(--ink)",
                fontFamily: "Plus Jakarta Sans, sans-serif",
                fontSize: 14,
                lineHeight: 1.6,
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button className="button" onClick={onCopy}>
                {copyStatus === "copied" ? "Copied" : "Copy to clipboard"}
              </button>
              <button
                className="button-secondary"
                onClick={onSave}
                disabled={saveStatus === "saving"}
              >
                {saveStatus === "saving"
                  ? "Saving…"
                  : saveStatus === "saved"
                    ? "Saved"
                    : saveStatus === "error"
                      ? "Save failed"
                      : "Save changes"}
              </button>
              <a
                className="button-secondary"
                href={`/api/letters/${result.generationId}/pdf`}
                onClick={(e) => {
                  if (saveStatus === "saving") {
                    e.preventDefault()
                  }
                }}
              >
                Download PDF
              </a>
              <Link className="button-ghost" href="/dashboard/letters">
                All my letters
              </Link>
            </div>
          </div>

          {atsData && <ATSScoreCard atsData={atsData} tier={props.basePlan} />}

          <div className="dashboard-card">
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                What agents ran
              </summary>
              <ul style={{ marginTop: 12, color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
                {result.agentsRun.map((a) => (
                  <li key={a}>{AGENT_LABELS[a] ?? a}</li>
                ))}
                {result.rewriteCycles > 0 && (
                  <li>Rewrite cycles: {result.rewriteCycles}</li>
                )}
                {result.hallucinationRisk && (
                  <li>Hallucination risk: {result.hallucinationRisk}</li>
                )}
              </ul>
            </details>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="dashboard-card">
          <div className="alert" style={{ marginBottom: 12 }}>{errorMsg ?? "Something went wrong."}</div>
          <button
            className="button"
            onClick={() => {
              setPhase("form")
              setErrorMsg(null)
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

// ---------- subcomponents ----------

function StepIndicator({ step }: { step: Step }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 4,
            background: n <= step ? "var(--gold)" : "var(--line)",
          }}
        />
      ))}
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="field" style={{ marginTop: 16 }}>
      <label style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "var(--muted-strong)", marginBottom: 6 }}>
        <span>{label}</span>
        {hint ? <span style={{ fontWeight: 400, color: "var(--muted)" }}>{hint}</span> : null}
      </label>
      {children}
    </div>
  )
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      style={{
        height: 8,
        background: "var(--line)",
        borderRadius: 4,
        overflow: "hidden",
        marginTop: 16,
      }}
    >
      <div
        style={{
          width: `${Math.max(2, Math.min(100, percent))}%`,
          height: "100%",
          background: "linear-gradient(90deg, var(--gold), var(--amber))",
          transition: "width 350ms ease",
        }}
      />
    </div>
  )
}

function ScoreBadge({ score, status }: { score: number; status: "passed" | "failed" }) {
  const color =
    score >= 95 ? "var(--gold)" : score >= 85 ? "var(--teal)" : score >= 70 ? "var(--amber)" : "var(--red)"
  return (
    <div
      style={{
        padding: "10px 18px",
        borderRadius: 999,
        background: "var(--paper)",
        border: `2px solid ${color}`,
        color,
        fontWeight: 800,
        fontSize: 16,
      }}
    >
      Score: {score}/100 {status === "passed" ? "✓" : ""}
    </div>
  )
}

// ---------- styles ----------

const pageWrap: React.CSSProperties = {
  maxWidth: 920,
  margin: "0 auto",
  padding: "32px 20px 64px",
}

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  letterSpacing: "-0.01em",
}

const sectionSub: React.CSSProperties = {
  margin: "4px 0 0",
  color: "var(--muted)",
  fontSize: 14,
}

const navRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 24,
  gap: 12,
}

const disabledBtn: React.CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
}

const toneCard = (selected: boolean): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  textAlign: "left",
  padding: "16px 18px",
  borderRadius: 10,
  border: selected ? "2px solid var(--gold)" : "1px solid var(--line)",
  background: selected ? "var(--gold-soft)" : "var(--paper)",
  cursor: "pointer",
  color: "var(--ink)",
  transition: "all 0.15s",
})

const agentList: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: "20px 0 0",
  display: "flex",
  flexDirection: "column",
  gap: 8,
}

const agentRowStyle = (status: AgentStatus): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  borderRadius: 8,
  background:
    status === "running"
      ? "var(--gold-soft)"
      : status === "done"
        ? "var(--paper)"
        : status === "failed"
          ? "rgba(164, 60, 60, 0.06)"
          : "var(--paper)",
  border: "1px solid var(--line)",
  color: status === "pending" ? "var(--muted)" : "var(--ink)",
  fontSize: 14,
})

const statusDot = (status: AgentStatus): React.CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: 999,
  background:
    status === "done"
      ? "var(--green)"
      : status === "running"
        ? "var(--gold)"
        : status === "failed"
          ? "var(--red)"
          : "var(--line-strong)",
  flexShrink: 0,
  boxShadow: status === "running" ? "0 0 0 4px rgba(199,154,54,0.18)" : undefined,
  animation: status === "running" ? "fl-pulse 1.2s ease-in-out infinite" : undefined,
})
