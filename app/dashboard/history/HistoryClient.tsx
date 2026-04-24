"use client"

import Link from "next/link"
import { useState } from "react"
import type { ApplicationBrief } from "@/lib/app-data"

type HistoryClientProps = {
  initialBriefs: ApplicationBrief[]
  setupError?: string
}

function statusLabel(status: ApplicationBrief["status"]) {
  return status.replace("_", " ")
}

export function HistoryClient({ initialBriefs, setupError }: HistoryClientProps) {
  const [briefs, setBriefs] = useState(initialBriefs)
  const [error, setError] = useState(setupError || "")
  const [message, setMessage] = useState("")

  async function updateStatus(id: string, status: ApplicationBrief["status"]) {
    setError("")
    setMessage("")
    const res = await fetch(`/api/briefs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Could not update brief.")
      return
    }

    setBriefs((current) =>
      current.map((brief) => (brief.id === id ? data.brief : brief))
    )
    setMessage("Brief updated.")
  }

  async function deleteBrief(id: string) {
    setError("")
    setMessage("")
    const res = await fetch(`/api/briefs/${id}`, { method: "DELETE" })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Could not delete brief.")
      return
    }

    setBriefs((current) => current.filter((brief) => brief.id !== id))
    setMessage("Brief deleted.")
  }

  if (!briefs.length) {
    return (
      <section className="dashboard-card empty-state">
        {error ? <div className="alert">{error}</div> : null}
        <h3>No saved briefs yet</h3>
        <p>
          Save a brief from the workspace and it will appear here with status,
          role, company, and last update.
        </p>
        <Link className="button" href="/dashboard">
          Create first brief
        </Link>
      </section>
    )
  }

  return (
    <section className="dashboard-card">
      {message ? <div className="success-alert">{message}</div> : null}
      {error ? <div className="alert">{error}</div> : null}
      <div className="table-list">
        {briefs.map((brief) => (
          <div className="table-row history-row" key={brief.id}>
            <div>
              <strong>{brief.role || "Untitled role"}</strong>
              <span>{brief.company || "No company added"}</span>
            </div>
            <span className="status-pill">{statusLabel(brief.status)}</span>
            <span>{new Date(brief.updated_at).toLocaleDateString()}</span>
            <div className="dashboard-action-row">
              <button
                className="button-soft"
                type="button"
                onClick={() => updateStatus(brief.id, "brief_ready")}
              >
                Mark ready
              </button>
              <button
                className="button-secondary"
                type="button"
                onClick={() => updateStatus(brief.id, "archived")}
              >
                Archive
              </button>
              <button
                className="button-ghost danger-link"
                type="button"
                onClick={() => deleteBrief(brief.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
