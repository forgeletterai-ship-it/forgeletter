"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"

/**
 * One row in the letters table, with the two most common actions —
 * copy and download — inline. Previously both required opening the
 * detail page first, so the everyday journey was three steps; here
 * it's one.
 *
 * Layout note: the title carries a stretched-link ::after so the
 * whole row is clickable while the DOM keeps a single anchor (nested
 * interactive elements inside an <a> would be invalid and unusable
 * with a keyboard). Action controls sit above it on the z-axis.
 */

type ApplicationStatus =
  | "not_submitted"
  | "submitted"
  | "interviewing"
  | "offer"
  | "rejected"
  | "ghosted"

type Props = {
  id: string
  jobTitle: string | null
  companyName: string | null
  finalScore: number | null
  atsScore: number | null
  createdAt: string
  status: ApplicationStatus
  statusLabels: Record<ApplicationStatus, string>
}

const STATUS_ORDER: ApplicationStatus[] = [
  "not_submitted",
  "submitted",
  "interviewing",
  "offer",
  "rejected",
  "ghosted",
]

function formatDate(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days < 1) {
    const hours = Math.floor(diffMs / 3600000)
    if (hours < 1) return "just now"
    return `${hours}h ago`
  }
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v10" />
      <path d="m8 11 4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  )
}

export function LetterRow({
  id,
  jobTitle,
  companyName,
  finalScore,
  atsScore,
  createdAt,
  status,
  statusLabels,
}: Props) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState<ApplicationStatus>(status)
  const [copyState, setCopyState] = useState<"idle" | "working" | "done" | "error">("idle")
  const [pdfState, setPdfState] = useState<"idle" | "working" | "error">("idle")
  const [savingStatus, setSavingStatus] = useState(false)

  const onCopy = useCallback(async () => {
    if (copyState === "working") return
    setCopyState("working")
    try {
      const res = await fetch(`/api/letters/${id}`)
      if (!res.ok) throw new Error("fetch failed")
      const data = (await res.json()) as { letter?: { final_cover_letter?: string } }
      const text = data.letter?.final_cover_letter
      if (!text) throw new Error("no letter")
      await navigator.clipboard.writeText(text)
      setCopyState("done")
      setTimeout(() => setCopyState("idle"), 1800)
    } catch {
      setCopyState("error")
      setTimeout(() => setCopyState("idle"), 2400)
    }
  }, [copyState, id])

  const onDownload = useCallback(async () => {
    if (pdfState === "working") return
    setPdfState("working")
    try {
      // No body: the API falls back to the template the customer
      // picked last time, else the default.
      const res = await fetch(`/api/letters/${id}/pdf`, { method: "POST" })
      if (!res.ok) throw new Error("pdf failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download =
        res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ||
        "cover-letter.pdf"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setPdfState("idle")
    } catch {
      setPdfState("error")
      setTimeout(() => setPdfState("idle"), 2400)
    }
  }, [id, pdfState])

  const onStatusChange = useCallback(
    async (next: ApplicationStatus) => {
      const previous = currentStatus
      setCurrentStatus(next)
      setSavingStatus(true)
      try {
        const res = await fetch(`/api/letters/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationStatus: next }),
        })
        if (!res.ok) throw new Error("patch failed")
        // Refresh so the outcome strip and filter counts stay true.
        router.refresh()
      } catch {
        setCurrentStatus(previous)
      } finally {
        setSavingStatus(false)
      }
    },
    [currentStatus, id, router]
  )

  return (
    <div className={`lrow lrow--${currentStatus}`} role="row">
      <div className="lrow__title" role="cell">
        <Link className="lrow__link" href={`/dashboard/letters/${id}`}>
          {jobTitle || "Untitled role"}
        </Link>
        {companyName ? <span className="lrow__company">{companyName}</span> : null}
      </div>

      <span className="lrow__date" role="cell">
        {formatDate(createdAt)}
      </span>

      <span className="lrow__num lrow__num--score" role="cell">
        {finalScore != null ? finalScore : <i aria-hidden="true">—</i>}
      </span>

      <span className="lrow__num lrow__num--ats" role="cell">
        {atsScore != null ? atsScore : <i aria-hidden="true">—</i>}
      </span>

      <span className="lrow__status" role="cell">
        <select
          className={`lrow__select lrow__select--${currentStatus}`}
          value={currentStatus}
          disabled={savingStatus}
          aria-label={`Application status for ${jobTitle || "this letter"}`}
          onChange={(event) => onStatusChange(event.target.value as ApplicationStatus)}
        >
          {STATUS_ORDER.map((key) => (
            <option key={key} value={key}>
              {statusLabels[key]}
            </option>
          ))}
        </select>
      </span>

      <span className="lrow__actions" role="cell">
        <button
          className="lrow__action"
          type="button"
          onClick={onCopy}
          disabled={copyState === "working"}
          title="Copy letter text"
          aria-label={`Copy letter for ${jobTitle || "this role"}`}
        >
          <CopyIcon />
          <span className="lrow__action-text">
            {copyState === "done"
              ? "Copied"
              : copyState === "error"
                ? "Failed"
                : copyState === "working"
                  ? "..."
                  : "Copy"}
          </span>
        </button>
        <button
          className="lrow__action"
          type="button"
          onClick={onDownload}
          disabled={pdfState === "working"}
          title="Download PDF"
          aria-label={`Download PDF for ${jobTitle || "this role"}`}
        >
          <DownloadIcon />
          <span className="lrow__action-text">
            {pdfState === "working" ? "..." : pdfState === "error" ? "Failed" : "PDF"}
          </span>
        </button>
      </span>
    </div>
  )
}
