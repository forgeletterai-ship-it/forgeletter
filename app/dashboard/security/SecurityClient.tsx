"use client"

import Link from "next/link"
import { useState } from "react"

type SecurityClientProps = {
  displayName: string
  email: string
  setupError?: string
}

type SecurityIconType = "shield" | "key" | "session" | "mail"

function SecurityIcon({ type }: { type: SecurityIconType }) {
  if (type === "key") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="8" cy="12" r="3.6" />
        <path d="M11.6 12H21" />
        <path d="M17 12v3" />
        <path d="M20 12v2" />
      </svg>
    )
  }

  if (type === "session") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
        <path d="M16 17h.01" />
      </svg>
    )
  }

  if (type === "mail") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6.5h16v11H4z" />
        <path d="m4.7 7.2 7.3 5.6 7.3-5.6" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-3.6 7-10.3V5.6L12 3 5 5.6v5.1C5 17.4 12 21 12 21Z" />
      <path d="m9.5 11.8 1.8 1.8 3.5-3.8" />
    </svg>
  )
}

export function SecurityClient({
  displayName,
  email,
  setupError,
}: SecurityClientProps) {
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState(setupError || "")

  async function sendPasswordReset() {
    if (!email || sending) {
      return
    }

    setSending(true)
    setMessage("")
    setError("")

    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || "Could not send the reset email.")
      }

      setMessage("Password reset email sent. Check your inbox.")
      setTimeout(() => setMessage(""), 2800)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send the reset email."
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="settings-luxury security-luxury" aria-labelledby="security-title">
      <div className="settings-luxury__hero security-luxury__hero">
        <Link className="security-back-link" href="/dashboard">
          Back to workspace
        </Link>

        <div className="settings-luxury__kicker">
          <SecurityIcon type="shield" />
          <span>Security</span>
        </div>
        <h1 id="security-title">
          Account <span>security.</span>
        </h1>
        <p>
          Manage sign-in access, password recovery, and session safety in one
          dedicated security page.
        </p>
      </div>

      {message ? <div className="success-alert">{message}</div> : null}
      {error ? <div className="alert">{error}</div> : null}

      <div className="settings-luxury__spark" aria-hidden="true">
        *
      </div>

      <div className="settings-luxury__grid security-luxury__grid">
        <section className="settings-card security-card security-card--access">
          <div className="settings-card__icon">
            <SecurityIcon type="key" />
          </div>
          <h2>Password access</h2>
          <div className="settings-card__rule" />
          <p>
            Send a secure reset link to the email attached to this ForgeLetter
            account.
          </p>

          <div className="security-email-box">
            <span>Signed in as</span>
            <strong>{displayName}</strong>
            <small>{email || "No account email found"}</small>
          </div>

          <button
            className="settings-save-button security-action"
            type="button"
            onClick={sendPasswordReset}
            disabled={sending || !email}
          >
            <SecurityIcon type="mail" />
            {sending ? "Sending reset..." : "Send reset email"}
          </button>
        </section>

        <section className="settings-card security-card">
          <div className="settings-card__icon">
            <SecurityIcon type="session" />
          </div>
          <h2>Session safety</h2>
          <div className="settings-card__rule" />
          <p>
            Your dashboard is protected by an authenticated session. Log out
            when using a shared device.
          </p>

          <div className="security-status-list">
            <div className="security-status-row">
              <span>Current dashboard session</span>
              <strong>Active</strong>
            </div>
            <div className="security-status-row">
              <span>Workspace access</span>
              <strong>Protected</strong>
            </div>
          </div>
        </section>

        <section className="settings-card security-card">
          <div className="settings-card__icon">
            <SecurityIcon type="shield" />
          </div>
          <h2>Security checklist</h2>
          <div className="settings-card__rule" />
          <p>
            Keep your account protected with a strong email password and a
            private device passcode.
          </p>

          <ul className="security-checklist">
            <li>Use a unique password for your email account.</li>
            <li>Keep Google or Facebook sign-in accounts protected.</li>
            <li>Review billing access only from the secure dashboard.</li>
          </ul>
        </section>
      </div>
    </section>
  )
}
