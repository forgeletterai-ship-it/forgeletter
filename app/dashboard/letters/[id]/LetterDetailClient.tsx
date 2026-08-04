"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
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

/** Included tone rewrites per letter — mirrors the API's per-tier caps. */
const TONE_REWRITE_FREE_CAP: Record<string, number> = {
  free: 0,
  starter: 0,
  pro: 1,
  ultra: 3,
}

type BasePlan = "free" | "starter" | "pro" | "ultra"

const STATUS_OPTIONS: Array<{ key: ApplicationStatus; label: string }> = [
  { key: "not_submitted", label: "Not submitted" },
  { key: "submitted", label: "Submitted" },
  { key: "interviewing", label: "Interviewing" },
  { key: "offer", label: "Offer" },
  { key: "rejected", label: "Rejected" },
  { key: "ghosted", label: "Ghosted" },
]

/** Read mode renders real paragraphs — the letter is the reason the
 *  page exists, so it must be readable without scrolling inside a box. */
function splitParagraphs(text: string): string[] {
  const byBlank = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  if (byBlank.length > 1) return byBlank
  return text.split(/\n/).map((p) => p.trim()).filter(Boolean)
}

function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function LetterDetailClient({
  letter,
  basePlan,
  userName = null,
  userEmail = null,
}: {
  letter: Letter
  basePlan: BasePlan
  /** Account identity — prefills the PDF contact fields. */
  userName?: string | null
  userEmail?: string | null
}) {
  const router = useRouter()
  const [text, setText] = useState(letter.finalCoverLetter)
  const [isEditing, setIsEditing] = useState(false)
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

  const paragraphs = useMemo(() => splitParagraphs(text), [text])
  const isDirty = text !== letter.finalCoverLetter
  const wordCount = useMemo(
    () => text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length,
    [text]
  )
  const isBestEffort = letter.generationStatus === "failed"
  const isPending =
    letter.generationStatus === "running" || letter.generationStatus === "queued"

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
      const previous = { appStatus, submittedAt, outcomeAt }
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
      setIsEditing(false)
      setTimeout(() => setSaveStatus("idle"), 1800)
      router.refresh()
    } catch {
      setSaveStatus("error")
    }
  }, [letter.id, router, text])

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

  const scoreTone =
    letter.finalScore >= 90 ? "high" : letter.finalScore >= 75 ? "mid" : "low"

  // Only render timeline events that are genuinely distinct. Setting
  // an outcome straight from "not submitted" stamps both fields at
  // once, which used to render two identical rows.
  const timelineEvents: Array<{ key: string; label: string; at: string }> = []
  if (submittedAt) {
    timelineEvents.push({ key: "submitted", label: "Submitted", at: submittedAt })
  }
  if (outcomeAt && appStatus !== "submitted") {
    const sameMoment =
      submittedAt != null &&
      Math.abs(new Date(outcomeAt).getTime() - new Date(submittedAt).getTime()) < 60000
    const label =
      appStatus === "offer"
        ? "Offer received"
        : appStatus === "interviewing"
          ? "Interview stage"
          : appStatus === "rejected"
            ? "Rejected"
            : "Marked ghosted"
    timelineEvents.push({
      key: "outcome",
      label: sameMoment ? `${label} (recorded together)` : label,
      at: outcomeAt,
    })
  }

  return (
    <div className="ldx">
      <header className="ldx__head">
        <div className="ldx__head-main">
          <Link className="ldx__back" href="/dashboard/letters">
            ← All letters
          </Link>
          <h1>
            {letter.jobTitle || "Untitled role"}
            {letter.companyName ? <span> at {letter.companyName}</span> : null}
          </h1>
        </div>
        <div className={`ldx__score ldx__score--${scoreTone}`}>
          <strong>{letter.finalScore}</strong>
          <span>/ 100 quality</span>
        </div>
      </header>

      {isBestEffort ? (
        <div className="ldx__notice">
          <strong>Best draft delivered.</strong>
          <span>
            This letter scored under the quality bar for your tier, so the
            agents kept the strongest version they produced across{" "}
            {letter.rewriteCycles}{" "}
            {letter.rewriteCycles === 1 ? "cycle" : "cycles"}. It&apos;s still
            grounded in your real experience — read it through, edit anything
            that feels off, or try a different tone.
          </span>
        </div>
      ) : null}

      {isPending ? (
        <div className="dashboard-card">
          <p style={{ margin: 0 }}>
            This letter is still generating. Refresh the page in a moment.
          </p>
        </div>
      ) : (
        <div className="ldx__grid">
          <main className="ldx__main">
            <section className="ldx__letter-card">
              <div className="ldx__letter-head">
                <h2>Your letter</h2>
                <span className="ldx__wordcount">{wordCount} words</span>
                {!isEditing ? (
                  <button
                    className="ldx__edit-btn"
                    type="button"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </button>
                ) : null}
              </div>

              {isEditing ? (
                <>
                  <textarea
                    className="ldx__editor"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={22}
                    aria-label="Letter text"
                  />
                  {/* Single save path: Save is primary, Cancel is the
                      quiet escape — same rule as the workspace. */}
                  <div className="ldx__editor-actions">
                    <button
                      className="button"
                      type="button"
                      onClick={onSave}
                      disabled={saveStatus === "saving" || !isDirty}
                    >
                      {saveStatus === "saving"
                        ? "Saving…"
                        : saveStatus === "saved"
                          ? "Saved"
                          : saveStatus === "error"
                            ? "Save failed — retry"
                            : "Save changes"}
                    </button>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => {
                        setText(letter.finalCoverLetter)
                        setIsEditing(false)
                        setSaveStatus("idle")
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <article className="ldx__paper">
                  {paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </article>
              )}

              {!isEditing ? (
                <div className="ldx__actions">
                  <button
                    className="button"
                    type="button"
                    onClick={() => setShowPdfPicker(true)}
                  >
                    Download PDF
                  </button>
                  <button className="button-secondary" type="button" onClick={onCopy}>
                    {copyStatus === "copied" ? "Copied" : "Copy text"}
                  </button>
                  <Link
                    className="button-secondary"
                    href={`/dashboard?duplicateFrom=${encodeURIComponent(letter.id)}`}
                    title="Pre-fill the workspace with this letter's role, company and tone — then paste a new job description"
                  >
                    Duplicate for new job
                  </Link>
                </div>
              ) : null}
            </section>

            {/* Tone rewrite sits directly under the letter: you decide
                the voice is wrong only after reading it. Compact by
                design — it's one control, not a section. */}
            {!isEditing && (letter.generationStatus === "passed" || isBestEffort) ? (
              <section className="ldx__tone" aria-label="Rewrite in a different tone">
                <div className="ldx__tone-row">
                  <span className="ldx__tone-label">
                    Tone: <strong>{tone}</strong>
                  </span>
                  <span className="ldx__tone-quota">
                    {toneFreeCap > 0
                      ? `${Math.min(toneRewriteCount, toneFreeCap)} of ${toneFreeCap} included ${toneFreeCap === 1 ? "rewrite" : "rewrites"} used`
                      : "Rewrites use a letter slot on Starter"}
                  </span>
                </div>
                <div className="ldx__tone-buttons">
                  {TONE_OPTIONS.filter((o) => o.key !== tone).map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className="ldx__tone-btn"
                      disabled={rewritingTone !== null}
                      onClick={() => void requestToneRewrite(option.key, false)}
                    >
                      {rewritingTone === option.key
                        ? "Rewriting…"
                        : `Rewrite as ${option.label}`}
                    </button>
                  ))}
                </div>
                {toneNotice ? <p className="ldx__tone-notice">{toneNotice}</p> : null}
                {toneError ? <p className="ldx__tone-error">{toneError}</p> : null}
                {toneConfirm ? (
                  <div className="ldx__tone-confirm">
                    <p>{toneConfirm.message}</p>
                    <div>
                      <button
                        className="button"
                        type="button"
                        onClick={() => void requestToneRewrite(toneConfirm.tone, true)}
                      >
                        Use a letter slot
                      </button>
                      <button
                        className="button-secondary"
                        type="button"
                        onClick={() => setToneConfirm(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
          </main>

          <aside className="ldx__rail">
            <section className="ldx__panel">
              <h2 className="ldx__panel-title">
                Application status
                {trackStatus !== "idle" ? (
                  <span className={`ldx__panel-pill ldx__panel-pill--${trackStatus}`}>
                    {trackStatus === "saving"
                      ? "Saving…"
                      : trackStatus === "saved"
                        ? "Saved"
                        : "Failed — retry"}
                  </span>
                ) : null}
              </h2>
              <label className="ldx__status-field">
                <span className="ldx__visually-hidden">Application status</span>
                <select
                  className={`ldx__status-select ldx__status-select--${appStatus}`}
                  value={appStatus}
                  disabled={trackStatus === "saving"}
                  onChange={(e) =>
                    void updateApplicationStatus(e.target.value as ApplicationStatus)
                  }
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="ldx__panel-note">
                Letters that earn offers or interviews feed the gold-standard
                examples base used by future generations.
              </p>

              {timelineEvents.length > 0 ? (
                <ul className="ldx__timeline">
                  {timelineEvents.map((event) => (
                    <li key={event.key}>
                      <span className="ldx__timeline-dot" aria-hidden="true" />
                      <span>
                        <strong>{event.label}</strong>
                        <em>{formatStamp(event.at)}</em>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {appStatus !== "not_submitted" ? (
                <div className="ldx__notes">
                  <label htmlFor="outcome-notes">
                    Notes <span>optional, visible only to you</span>
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
                    placeholder="e.g. opener resonated with the founder."
                  />
                  <div className="ldx__notes-foot">
                    <span>
                      {notesStatus === "saving"
                        ? "Saving…"
                        : notesStatus === "saved"
                          ? "Saved"
                          : notesStatus === "error"
                            ? "Save failed"
                            : `${notes.length}/2000`}
                    </span>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => void saveNotes()}
                    >
                      Save notes
                    </button>
                  </div>
                </div>
              ) : null}
            </section>

            {atsData ? <ATSScoreCard atsData={atsData} tier={basePlan} /> : null}

            <section className="ldx__panel">
              <details>
                <summary className="ldx__details-summary">Generation details</summary>
                <ul className="ldx__details-list">
                  <li>
                    <span>Tier</span>
                    <strong>{letter.tier.toUpperCase()}</strong>
                  </li>
                  <li>
                    <span>Quality score</span>
                    <strong>{letter.finalScore}/100</strong>
                  </li>
                  {letter.atsScore != null ? (
                    <li>
                      <span>ATS score</span>
                      <strong>
                        {letter.atsScore}/100 ({letter.atsVerdict})
                      </strong>
                    </li>
                  ) : null}
                  {letter.hallucinationRisk ? (
                    <li>
                      <span>Hallucination risk</span>
                      <strong>{letter.hallucinationRisk}</strong>
                    </li>
                  ) : null}
                  <li>
                    <span>Rewrite cycles</span>
                    <strong>{letter.rewriteCycles}</strong>
                  </li>
                  <li>
                    <span>Agents run</span>
                    <strong>{letter.agentsRun.length}</strong>
                  </li>
                  <li>
                    <span>Created</span>
                    <strong>{formatStamp(letter.createdAt)}</strong>
                  </li>
                  {letter.failureReason ? (
                    <li>
                      <span>Quality gate</span>
                      <strong>{letter.failureReason}</strong>
                    </li>
                  ) : null}
                </ul>
                <p className="ldx__agents">{letter.agentsRun.join(" · ")}</p>
              </details>
            </section>

            <button
              className="ldx__delete"
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete this letter
            </button>
          </aside>
        </div>
      )}

      {showPdfPicker && (
        <TemplatePickerModal
          letterId={letter.id}
          defaultName={userName ?? undefined}
          defaultEmail={userEmail ?? undefined}
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
            zIndex: 200,
            display: "grid",
            placeItems: "center",
            padding: 20,
            background: "rgba(23,18,15,0.6)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              width: "min(460px, 100%)",
              background: "var(--paper-strong)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: 24,
              boxShadow: "var(--shadow)",
            }}
          >
            <h3 id="delete-letter-title" style={{ marginTop: 0 }}>
              Delete this letter?
            </h3>
            <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
              This removes the letter from your library permanently. Your
              monthly allowance is not refunded.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                className="button-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                type="button"
              >
                Keep it
              </button>
              <button
                className="button danger-button"
                onClick={onDelete}
                disabled={deleting}
                type="button"
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
