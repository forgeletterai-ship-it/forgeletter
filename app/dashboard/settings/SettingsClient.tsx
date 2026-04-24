"use client"

import { useState } from "react"
import type { UserSettings } from "@/lib/app-data"

type SettingsClientProps = {
  initialSettings: UserSettings
  setupError?: string
}

const tones = ["Professional", "Warm", "Direct", "Executive"]

export function SettingsClient({
  initialSettings,
  setupError,
}: SettingsClientProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState(setupError || "")

  async function saveSettings() {
    setSaving(true)
    setMessage("")
    setError("")

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Could not save settings.")
      }

      setSettings(data.settings)
      setMessage("Settings saved.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.")
    } finally {
      setSaving(false)
    }
  }

  async function deleteWorkspaceData() {
    setDeleting(true)
    setMessage("")
    setError("")

    try {
      const res = await fetch("/api/account/delete-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Could not delete workspace data.")
      }

      setConfirmation("")
      setMessage("Workspace data deleted.")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete workspace data."
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {message ? <div className="success-alert">{message}</div> : null}
      {error ? <div className="alert">{error}</div> : null}

      <div className="grid-3">
        <section className="dashboard-card">
          <h3>Default tone</h3>
          <p>Choose which tone appears first in the draft workspace.</p>
          <div className="tone-list">
            {tones.map((tone) => (
              <button
                className={`tone-chip${
                  settings.default_tone === tone ? " active" : ""
                }`}
                key={tone}
                type="button"
                onClick={() =>
                  setSettings((current) => ({
                    ...current,
                    default_tone: tone,
                  }))
                }
              >
                {tone}
              </button>
            ))}
          </div>
          <button
            className="button-soft"
            type="button"
            onClick={saveSettings}
            disabled={saving}
            style={{ marginTop: 18 }}
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
        </section>

        <section className="dashboard-card">
          <h3>Email preferences</h3>
          <p>Control product and account updates.</p>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.email_updates}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  email_updates: event.target.checked,
                }))
              }
            />
            <span>Account notifications</span>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.product_updates}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  product_updates: event.target.checked,
                }))
              }
            />
            <span>Product updates</span>
          </label>
        </section>

        <section className="dashboard-card">
          <h3>Data controls</h3>
          <p>Export your workspace data or clear saved drafts and profile data.</p>
          <div className="dashboard-action-row">
            <a className="button-secondary" href="/api/account/export">
              Export JSON
            </a>
          </div>
          <div className="danger-zone">
            <label htmlFor="delete-confirm">Type DELETE to clear workspace data</label>
            <input
              id="delete-confirm"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="DELETE"
            />
            <button
              className="button-ghost danger-link"
              type="button"
              disabled={deleting || confirmation !== "DELETE"}
              onClick={deleteWorkspaceData}
            >
              {deleting ? "Deleting..." : "Delete workspace data"}
            </button>
          </div>
        </section>
      </div>
    </>
  )
}
