"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { Brand } from "@/components/Brand"

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [devResetUrl, setDevResetUrl] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")
    setDevResetUrl("")

    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Could not start password reset.")
      }

      setSubmitted(true)
      if (data.resetUrl) setDevResetUrl(data.resetUrl)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start password reset."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Brand dark />
        <div>
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            Account recovery
          </span>
          <h1>Recover access without losing your workspace.</h1>
          <p>
            Enter your account email and LetterForge will send a secure reset
            link when email delivery is configured.
          </p>
        </div>
        <p>Reset links expire automatically for account safety.</p>
      </section>

      <section className="auth-content">
        <div className="auth-card">
          <h2>Forgot password</h2>
          <p>Enter your email and we will send reset instructions if an account exists.</p>

          {submitted ? (
            <div className="alert" style={{ color: "var(--green)", borderColor: "#a8d7c5", background: "#f0fbf6" }}>
              Check your inbox for a secure reset link.
            </div>
          ) : null}
          {devResetUrl ? (
            <Link className="button-secondary" href={devResetUrl}>
              Open local reset link
            </Link>
          ) : null}
          {error ? <div className="alert">{error}</div> : null}

          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <button className="button" type="submit" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <p className="muted-link" style={{ marginTop: 18 }}>
            Remembered it? <Link href="/auth/login">Back to login</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
