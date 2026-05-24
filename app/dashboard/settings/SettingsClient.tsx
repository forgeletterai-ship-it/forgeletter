"use client"

import { useState } from "react"
import type { UserSettings } from "@/lib/app-data"

type SettingsClientProps = {
  initialSettings: UserSettings
  setupError?: string
}

type SettingsIcon = "tone" | "mail" | "data" | "save" | "trash"

const tones = ["Professional", "Warm", "Direct"]

function normalizeSettings(settings: UserSettings): UserSettings {
  return {
    ...settings,
    default_tone: tones.includes(settings.default_tone)
      ? settings.default_tone
      : "Professional",
  }
}

function SettingsIcon({ type }: { type: SettingsIcon }) {
  if (type === "mail") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6.5h16v11H4z" />
        <path d="m4.7 7.2 7.3 5.6 7.3-5.6" />
      </svg>
    )
  }

  if (type === "data") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <ellipse cx="12" cy="6" rx="6.5" ry="3" />
        <path d="M5.5 6v6c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3V6" />
        <path d="M5.5 12v5c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3v-5" />
      </svg>
    )
  }

  if (type === "save") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 4h12l2 2v14H5z" />
        <path d="M8 4v6h8V4" />
        <path d="M8 20v-6h8v6" />
      </svg>
    )
  }

  if (type === "trash") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16" />
        <path d="M9 7V4h6v3" />
        <path d="M7 7l1 13h8l1-13" />
        <path d="M10 11v5M14 11v5" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12h4" />
      <path d="M16 12h4" />
      <path d="M8 7v10" />
      <path d="M16 6v12" />
      <path d="M12 4v16" />
      <path d="M9.5 9.5h5" />
      <path d="M9.5 14.5h5" />
    </svg>
  )
}

export function SettingsClient({
  initialSettings,
  setupError,
}: SettingsClientProps) {
  const [settings, setSettings] = useState(normalizeSettings(initialSettings))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState(setupError || "")

  async function saveSettings(nextSettings = settings, notice = "Settings saved.") {
    setSaving(true)
    setMessage("")
    setError("")

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Could not save settings.")
      }

      const saved = normalizeSettings(data.settings)
      setSettings(saved)
      setMessage(notice)
      setTimeout(() => setMessage(""), 2400)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.")
    } finally {
      setSaving(false)
    }
  }

  async function updateEmailPreference(field: "email_updates" | "product_updates", value: boolean) {
    const nextSettings = { ...settings, [field]: value }
    setSettings(nextSettings)
    await saveSettings(
      nextSettings,
      field === "product_updates"
        ? "Product update emails saved."
        : "Account notification emails saved."
    )
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
      setTimeout(() => setMessage(""), 2400)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete workspace data."
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="settings-luxury" aria-labelledby="settings-title">
      <div className="settings-luxury__hero">
        <div className="settings-luxury__kicker">
          <SettingsIcon type="tone" />
          <span>Settings</span>
        </div>
        <h1 id="settings-title">
          Account <span>preferences.</span>
        </h1>
        <p>Manage tone defaults, notifications, and workspace data.</p>
      </div>

      {message ? <div className="success-alert">{message}</div> : null}
      {error ? <div className="alert">{error}</div> : null}

      <div className="settings-luxury__spark" aria-hidden="true">✧</div>

      <div className="settings-luxury__grid">
        <section className="settings-card">
          <div className="settings-card__icon">
            <SettingsIcon type="tone" />
          </div>
          <h2>Default tone</h2>
          <div className="settings-card__rule" />
          <p>Choose which tone appears first in the draft workspace.</p>
          <div className="settings-tone-list">
            {tones.map((tone) => (
              <button
                className={`settings-tone-chip${
                  settings.default_tone === tone ? " is-active" : ""
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
                {settings.default_tone === tone ? <span>✓</span> : null}
                {tone}
              </button>
            ))}
          </div>
          <div className="settings-card__divider" />
          <button
            className="settings-save-button"
            type="button"
            onClick={() => saveSettings()}
            disabled={saving}
          >
            <SettingsIcon type="save" />
            {saving ? "Saving settings..." : "Save settings"}
          </button>
        </section>

        <section className="settings-card">
          <div className="settings-card__icon">
            <SettingsIcon type="mail" />
          </div>
          <h2>Email preferences</h2>
          <div className="settings-card__rule" />
          <p>Control product and account updates.</p>
          <div className="settings-toggle-list">
            <label className="settings-toggle-row">
              <input
                type="checkbox"
                checked={settings.email_updates}
                onChange={(event) =>
                  updateEmailPreference("email_updates", event.target.checked)
                }
                disabled={saving}
              />
              <span aria-hidden="true" />
              <strong>Account notifications</strong>
            </label>
            <label className="settings-toggle-row">
              <input
                type="checkbox"
                checked={settings.product_updates}
                onChange={(event) =>
                  updateEmailPreference("product_updates", event.target.checked)
                }
                disabled={saving}
              />
              <span aria-hidden="true" />
              <strong>Product updates via email</strong>
            </label>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card__icon">
            <SettingsIcon type="data" />
          </div>
          <h2>Data controls</h2>
          <div className="settings-card__rule" />
          <p>
            Exercise your GDPR / CCPA rights at any time. Download a full
            machine-readable copy of your workspace, or clear your saved
            content when you need a fresh start.
          </p>
          <div className="settings-card__divider" />
          <div className="settings-data-actions">
            <a
              className="settings-export-button"
              href="/api/account/export"
              download
            >
              <SettingsIcon type="data" />
              Download my data (JSON)
            </a>
            <p className="settings-export-note">
              Includes account fields, profile, briefs, settings. Stripe
              billing history lives in your billing portal.
            </p>
          </div>
          <div className="settings-card__divider" />
          <div className="settings-danger-zone">
            <strong className="settings-danger-zone__heading">Danger zone</strong>
            <label htmlFor="delete-confirm">
              Type DELETE to permanently clear workspace data
            </label>
            <input
              id="delete-confirm"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="DELETE"
            />
            <button
              className="settings-delete-button"
              type="button"
              disabled={deleting || confirmation !== "DELETE"}
              onClick={deleteWorkspaceData}
            >
              <SettingsIcon type="trash" />
              {deleting ? "Deleting workspace data..." : "Delete workspace data"}
            </button>
            <p className="settings-danger-zone__note">
              This removes your application briefs, profile and settings.
              To also delete your account, cancel your subscription first
              from the Billing page, then email{" "}
              <a href="mailto:forgeletterai@gmail.com">forgeletterai@gmail.com</a>.
            </p>
          </div>
        </section>
      </div>
    </section>
  )
}
