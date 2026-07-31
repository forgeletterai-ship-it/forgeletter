"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { ATSScoreCard, type ATSData, type ATSVerdict } from "@/components/ATSScoreCard"
import { TemplatePickerModal } from "@/components/TemplatePickerModal"

type ApplicationStatus =
  | "not_submitted"
  | "submitted"
  | "interviewing"
  | "offer"
  | "rejected"
  | "ghosted"

interface Letter {
  id: string
  finalCoverLetter: string
  finalScore: number
  atsScore: number | null
  atsVerdict: string | null
  atsCoveredKeywords: string[]
  atsMissingKeywords: string[]
  hallucinationRisk: string | null
  rewriteCycles: number
  agentsRun: string[]
  jobTitle: string | null
  companyName: string | null
  tier: string
  tone: string
  toneRewriteCount: number
  generationStatus: string
  failureReason: string | null
  createdAt: string
  applicationStatus: ApplicationStatus
  submittedAt: string | null
  outcomeAt: string | null
  outcomeNotes: string
}

const TONE_OPTIONS = [
  { key: "professional", label: "Professional" },
  { key: "confident", label: "Confident" },
  { key: "warm", label: "Warm" },
  { key: "concise", label: "Concise" },
] as const

/** Free tone rewrites per letter — mirrors the API's per-tier caps. */
const TONE_REWRITE_FREE_CAP: Record<string, number> = {
  free: 0,
  starter: 0,
  pro: 1,
  ultra: 3,
}

type BasePlan = "free" | "starter" | "pro" | "ultra"

const STATUS_OPTIONS: Array<{
  key: ApplicationStatus
  label: string
  description: string
}> = [
  { key: "not_submitted", label: "Not submitted", description: "Drafted, not yet sent" },
  { key: "submitted", label: "Submitted", description: "Application sent, waiting" },
  { key: "interviewing", label: "Interviewing", description: "They reached out" },
  { key: "offer", label: "Offer", description: "You got the role" },
  { key: "rejected", label: "Rejected", description: "Declined after response" },
  { key: "ghosted", label: "Ghosted", description: "No response, given up" },
]

export function LetterDetailClient({
  letter,
  basePlan,
}: {
  letter: Letter
  basePlan: BasePlan
}) {
  const router = useRouter()
  const [text, setText] = useState(letter.finalCoverLetter)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle")
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPdfPicker, setShowPdfPicker] = useState(false)
  const [appStatus, setAppStatus] = useState<ApplicationStatus>(letter.applicationStatus)
  const [submittedAt, setSubmittedAt] = useState(letter.submittedAt)
  const [outcomeAt, setOutcomeAt] = useState(letter.outcomeAt)
  const [notes, setNotes] = useState(letter.outcomeNotes)
  const [trackStatus, setTrackStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [notesStatus, setNotesStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  // Tone rewrite — the Pro/Ultra pricing feature. The endpoint returns
  // 402 + needsLetterSlotConfirmation when the free per-letter
  // allowance is exhausted; we then ask before re-POSTing with
  // acknowledgeLetterSpend so a letter slot is never burned silently.
  const [tone, setTone] = useState(letter.tone)
  const [toneRewriteCount, setToneRewriteCount] = useState(letter.toneRewriteCount)
  const [rewritingTone, setRewritingTone] = useState<string | null>(null)
  const [toneConfirm, setToneConfirm] = useState<{ tone: string; message: string } | null>(null)
  const [toneError, setToneError] = useState("")
  const [toneNotice, setToneNotice] = useState("")
  const toneFreeCap = TONE_REWRITE_FREE_CAP[letter.tier] ?? 0

  const requestToneRewrite = useCallback(
    async (nextTone: string, acknowledgeLetterSpend: boolean) => {
      setToneError("")
      setToneNotice("")
      setToneConfirm(null)
      setRewritingTone(nextTone)
      try {
        const res = await fetch(`/api/letters/${letter.id}/rewrite-tone`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            acknowledgeLetterSpend
              ? { tone: nextTone, acknowledgeLetterSpend: true }
              : { tone: nextTone }
          ),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          needsLetterSlotConfirmation?: boolean
          finalLetter?: string
          toneRewriteCount?: number | null
          consumedLetterSlot?: boolean
        }
        if (res.status === 402 && data.needsLetterSlotConfirmation) {
          setToneConfirm({
            tone: nextTone,
            message: data.error || "This rewrite will use one of your monthly letter slots.",
          })
          return
        }
        if (!res.ok || !data.finalLetter) {
          throw new Error(data.error || "Rewrite failed — please try again.")
        }
        setText(data.finalLetter)
        setTone(nextTone)
        if (typeof data.toneRewriteCount === "number") {
          setToneRewriteCount(data.toneRewriteCount)
        }
        setToneNotice(
          data.consumedLetterSlot
            ? "Letter rewritten. One letter slot was used from your monthly allowance."
            : "Letter rewritten in the new tone — no letter slot used."
        )
        router.refresh()
      } catch (err) {
        setToneError(err instanceof Error ? err.message : "Rewrite failed — please try again.")
      } finally {
        setRewritingTone(null)
      }
    },
    [letter.id, router]
  )

  const updateApplicationStatus = useCallback(
    async (next: ApplicationStatus) => {
      if (next === appStatus) return
      const previous = {
        appStatus,
        submittedAt,
        outcomeAt,
      }
      setAppStatus(next)
      setTrackStatus("saving")
      const now = new Date().toISOString()
      if (next === "submitted") {
        setSubmittedAt(now)
        setOutcomeAt(null)
      } else if (next === "not_submitted") {
        setSubmittedAt(null)
        setOutcomeAt(null)
      } else {
        if (!submittedAt) setSubmittedAt(now)
        setOutcomeAt(now)
      }
      try {
        const res = await fetch(`/api/letters/${letter.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationStatus: next }),
        })
        if (!res.ok) throw new Error(await res.text())
        setTrackStatus("saved")
        setTimeout(() => setTrackStatus("idle"), 1800)
        router.refresh()
      } catch {
        setAppStatus(previous.appStatus)
        setSubmittedAt(previous.submittedAt)
        setOutcomeAt(previous.outcomeAt)
        setTrackStatus("error")
      }
    },
    [appStatus, letter.id, outcomeAt, router, submittedAt]
  )

  const saveNotes = useCallback(async () => {
    setNotesStatus("saving")
    try {
      const res = await fetch(`/api/letters/${letter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcomeNotes: notes }),
      })
      if (!res.ok) throw new Error(await res.text())
      setNotesStatus("saved")
      setTimeout(() => setNotesStatus("idle"), 1800)
    } catch {
      setNotesStatus("error")
    }
  }, [letter.id, notes])

  const onSave = useCallback(async () => {
    setSaveStatus("saving")
    try {
      const res = await fetch(`/api/letters/${letter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalCoverLetter: text }),
      })
      if (!res.ok) throw new Error(await res.text())
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 1800)
    } catch {
      setSaveStatus("error")
    }
  }, [letter.id, text])

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus("copied")
      setTimeout(() => setCopyStatus("idle"), 1800)
    } catch {
      // ignore
    }
  }, [text])

  const onDelete = useCallback(async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/letters/${letter.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await res.text())
      router.push("/dashboard/letters")
      router.refresh()
    } catch {
      setDeleting(false)
    }
  }, [letter.id, router])

  const atsData: ATSData | null =
    letter.atsScore != null
      ? {
          score: letter.atsScore,
          verdict: (letter.atsVerdict ?? "Good") as ATSVerdict,
          coveredKeywords: letter.atsCoveredKeywords,
          missingKeywords: letter.atsMissingKeywords,
        }
      : null

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "32px 20px 64px", display: "grid", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 16 }}>
        <div>
          <Link href="/dashboard/letters" style={{ color: "var(--muted)", fontSize: 14, textDecoration: "none" }}>
            ← All letters
          </Link>
          <h1 style={{ margin: "6px 0 0", fontSize: "clamp(22px, 3vw, 30px)", letterSpacing: "-0.02em" }}>
            {letter.jobTitle || "Untitled role"}
            {letter.companyName ? (
              <span style={{ color: "var(--muted)", fontWeight: 400 }}> at {letter.companyName}</span>
            ) : null}
          </h1>
        </div>
        <ScoreBadge score={letter.finalScore} status={letter.generationStatus} />
      </header>

      {letter.generationStatus === "failed" && (
        <div className="alert">
          {letter.failureReason ?? "Generation did not pass the quality threshold."}
        </div>
      )}

      {letter.generationStatus === "running" || letter.generationStatus === "queued" ? (
        <div className="dashboard-card">
          <p style={{ margin: 0 }}>This letter is still generating. Refresh the page in a moment.</p>
        </div>
      ) : (
        <div className="dashboard-card">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={20}
            style={{
              width: "100%",
              padding: 16,
              border: "1px solid var(--line)",
              borderRadius: 8,
              background: "var(--paper)",
              color: "var(--ink)",
              fontFamily: "inherit",
              fontSize: 14,
              lineHeight: 1.6,
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button className="button" onClick={onCopy}>
              {copyStatus === "copied" ? "Copied" : "Copy"}
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
            <button
              type="button"
              className="button-secondary"
              onClick={() => setShowPdfPicker(true)}
            >
              Download PDF
            </button>
            <Link
              className="button-secondary"
              href={`/dashboard?duplicateFrom=${encodeURIComponent(letter.id)}`}
              title="Pre-fill the workspace with this letter's role, company and tone — then paste a new job description"
            >
              Duplicate for new job
            </Link>
            <button
              className="button-ghost danger-link"
              onClick={() => setShowDeleteConfirm(true)}
              style={{ marginLeft: "auto" }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {letter.generationStatus === "passed" || letter.generationStatus === "failed" ? (
        <div className="dashboard-card" aria-label="Tone rewrite">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 17 }}>Rewrite in a different tone</h2>
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
              {toneFreeCap > 0
                ? `${Math.min(toneRewriteCount, toneFreeCap)} of ${toneFreeCap} free ${toneFreeCap === 1 ? "rewrite" : "rewrites"} used for this letter`
                : "Tone rewrites on Starter use a letter slot from your monthly allowance"}
            </span>
          </div>
          <p style={{ margin: "6px 0 12px", fontSize: 13.5, color: "var(--muted)" }}>
            The full agent pipeline re-runs with the same facts and job posting —
            only the voice changes. Your letter stays grounded in your real experience.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TONE_OPTIONS.map((option) => {
              const isCurrent = option.key === tone
              const isRunning = rewritingTone === option.key
              return (
                <button
                  key={option.key}
                  type="button"
                  className={isCurrent ? "button" : "button-secondary"}
                  disabled={isCurrent || rewritingTone != null}
                  aria-pressed={isCurrent}
                  onClick={() => void requestToneRewrite(option.key, false)}
                >
                  {isRunning
                    ? "Rewriting…"
                    : isCurrent
                      ? `${option.label} · current`
                      : option.label}
                </button>
              )
            })}
          </div>
          {rewritingTone ? (
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--muted)" }}>
              Re-running the pipeline in the new tone — typically 30–90 seconds.
              Keep this page open.
            </p>
          ) : null}
          {toneNotice ? (
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--teal, #0b6b70)", fontWeight: 600 }}>
              {toneNotice}
            </p>
          ) : null}
          {toneError ? <div className="alert" style={{ marginTop: 12 }}>{toneError}</div> : null}
          {toneConfirm ? (
            <div
              style={{
                marginTop: 12,
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid rgba(178, 58, 48, 0.25)",
                background: "rgba(178, 58, 48, 0.05)",
              }}
            >
              <p style={{ margin: "0 0 10px", fontSize: 13.5 }}>{toneConfirm.message}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="button"
                  onClick={() => void requestToneRewrite(toneConfirm.tone, true)}
                >
                  Use a letter slot &amp; rewrite
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setToneConfirm(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <section className={`letter-tracker letter-tracker--${appStatus}`} aria-label="Application outcome tracker">
        <div className="letter-tracker__header">
          <div>
            <p className="letter-tracker__kicker">Application outcome</p>
            <h2>Track where this letter landed</h2>
            <p className="letter-tracker__sub">
              Marking outcomes feeds the gold-standard examples base —
              letters that earned offers train future generations.
            </p>
          </div>
          {trackStatus !== "idle" ? (
            <span className={`letter-tracker__pill letter-tracker__pill--${trackStatus}`}>
              {trackStatus === "saving"
                ? "Saving…"
                : trackStatus === "saved"
                  ? "Saved"
                  : "Save failed — retry"}
            </span>
          ) : null}
        </div>

        <div className="letter-tracker__grid" role="radiogroup" aria-label="Application status">
          {STATUS_OPTIONS.map((option) => {
            const isActive = appStatus === option.key
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={isActive}
                className={`letter-tracker__option letter-tracker__option--${option.key}${
                  isActive ? " is-active" : ""
                }`}
                onClick={() => updateApplicationStatus(option.key)}
                disabled={trackStatus === "saving"}
              >
                <span className="letter-tracker__option-dot" aria-hidden="true" />
                <span className="letter-tracker__option-copy">
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </span>
              </button>
            )
          })}
        </div>

        {appStatus !== "not_submitted" ? (
          <div className="letter-tracker__timeline" aria-label="Timeline">
            <Timeline submittedAt={submittedAt} outcomeAt={outcomeAt} status={appStatus} />
          </div>
        ) : null}

        {appStatus !== "not_submitted" ? (
          <div className="letter-tracker__notes">
            <label htmlFor="outcome-notes">
              Notes
              <span>
                Optional — what worked, what you'd change next time. Visible
                only to you.
              </span>
            </label>
            <textarea
              id="outcome-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={() => {
                if (notes !== letter.outcomeNotes) void saveNotes()
              }}
              rows={3}
              maxLength={2000}
              placeholder="e.g. opener resonated with the founder, technical paragraph could be tighter."
            />
            <div className="letter-tracker__notes-footer">
              <span>
                {notesStatus === "saving"
                  ? "Saving…"
                  : notesStatus === "saved"
                    ? "Saved"
                    : notesStatus === "error"
                      ? "Save failed"
                      : `${notes.length}/2000`}
              </span>
              <button type="button" className="button-secondary" onClick={() => void saveNotes()}>
                Save notes
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {atsData && <ATSScoreCard atsData={atsData} tier={basePlan} />}

      <div className="dashboard-card">
        <details>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            Generation details
          </summary>
          <ul style={{ marginTop: 12, color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
            <li>Tier: {letter.tier}</li>
            <li>Quality score: {letter.finalScore}/100</li>
            {letter.atsScore != null && <li>ATS score: {letter.atsScore}/100 ({letter.atsVerdict})</li>}
            {letter.hallucinationRisk && <li>Hallucination risk: {letter.hallucinationRisk}</li>}
            <li>Rewrite cycles: {letter.rewriteCycles}</li>
            <li>Agents run: {letter.agentsRun.join(", ")}</li>
            <li>Created: {new Date(letter.createdAt).toLocaleString()}</li>
          </ul>
        </details>
      </div>

      {showPdfPicker && (
        <TemplatePickerModal
          letterId={letter.id}
          onClose={() => setShowPdfPicker(false)}
        />
      )}

      {showDeleteConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-letter-title"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !deleting) setShowDeleteConfirm(false)
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setShowDeleteConfirm(false)
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(23,18,15,0.55)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <div className="dashboard-card" style={{ maxWidth: 420, width: "100%" }}>
            <h3 id="delete-letter-title" style={{ marginTop: 0 }}>Delete this letter?</h3>
            <p style={{ color: "var(--muted)" }}>
              The letter will be removed from your library and can&apos;t be
              restored. It still counts toward this month&apos;s allowance —
              deleting a letter doesn&apos;t return the slot.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button
                className="button-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                // Focus lands inside the dialog so Escape works
                // immediately and the safe action is the default.
                autoFocus
              >
                Cancel
              </button>
              <button
                className="button"
                onClick={onDelete}
                disabled={deleting}
                style={{ background: "var(--red)", boxShadow: "none" }}
              >
                {deleting ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Timeline({
  submittedAt,
  outcomeAt,
  status,
}: {
  submittedAt: string | null
  outcomeAt: string | null
  status: ApplicationStatus
}) {
  const outcomeReached =
    status === "interviewing" ||
    status === "offer" ||
    status === "rejected" ||
    status === "ghosted"
  return (
    <ol className="letter-tracker__timeline-list">
      <li className={submittedAt ? "is-done" : ""}>
        <span className="letter-tracker__timeline-dot" aria-hidden="true" />
        <div>
          <strong>Submitted</strong>
          <span>{submittedAt ? new Date(submittedAt).toLocaleString() : "—"}</span>
        </div>
      </li>
      <li className={outcomeReached ? "is-done" : ""}>
        <span
          className={`letter-tracker__timeline-dot letter-tracker__timeline-dot--${status}`}
          aria-hidden="true"
        />
        <div>
          <strong>
            {status === "offer"
              ? "Offer received"
              : status === "interviewing"
                ? "Interview booked"
                : status === "rejected"
                  ? "Rejected"
                  : status === "ghosted"
                    ? "Ghosted"
                    : "Outcome pending"}
          </strong>
          <span>{outcomeAt ? new Date(outcomeAt).toLocaleString() : "—"}</span>
        </div>
      </li>
    </ol>
  )
}

function ScoreBadge({ score, status }: { score: number; status: string }) {
  const color =
    score >= 95 ? "var(--gold)" : score >= 85 ? "var(--teal)" : score >= 70 ? "var(--amber)" : "var(--red)"
  return (
    <div
      style={{
        padding: "8px 16px",
        borderRadius: 999,
        background: "var(--paper)",
        border: `2px solid ${color}`,
        color,
        fontWeight: 800,
        fontSize: 14,
      }}
    >
      {status === "passed" ? "✓ " : ""}Score: {score}/100
    </div>
  )
}
