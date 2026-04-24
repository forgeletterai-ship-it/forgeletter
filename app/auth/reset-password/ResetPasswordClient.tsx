"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useState } from "react"
import { Brand } from "@/components/Brand"

export function ResetPasswordClient() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token") || ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [complete, setComplete] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Could not reset password.")
      }

      setComplete(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.")
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
          <h1>Create a new password for your workspace.</h1>
          <p>
            Keep it unique to LetterForge and avoid reusing a password from
            email, banking, or work accounts.
          </p>
        </div>
        <p>After reset, sign in again with your email and new password.</p>
      </section>

      <section className="auth-content">
        <div className="auth-card">
          <h2>Reset password</h2>
          <p>Choose a new password with at least 8 characters.</p>

          {!token ? (
            <div className="alert">This reset link is missing a token.</div>
          ) : null}
          {complete ? (
            <div className="success-alert">
              Password updated. You can sign in now.
            </div>
          ) : null}
          {error ? <div className="alert">{error}</div> : null}

          {complete ? (
            <Link className="button" href="/auth/login" style={{ width: "100%" }}>
              Back to login
            </Link>
          ) : (
            <form className="form-stack" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="password">New password</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="field">
                <label htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
              <button
                className="button"
                type="submit"
                style={{ width: "100%" }}
                disabled={loading || !token}
              >
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
