"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { ATSScoreCard, type ATSData, type ATSVerdict } from "@/components/ATSScoreCard"
import { TemplatePickerModal } from "@/components/TemplatePickerModal"

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
  generationStatus: string
  failureReason: string | null
  createdAt: string
}

type BasePlan = "free" | "starter" | "pro" | "ultra"

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
              fontFamily: "Plus Jakarta Sans, sans-serif",
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
            <h3 style={{ marginTop: 0 }}>Delete this letter?</h3>
            <p style={{ color: "var(--muted)" }}>
              This will permanently delete the letter and its agent trace. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button className="button-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
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
