"use client"

import { FormEvent, useState } from "react"

/* "Express your interest" email box on the pre-launch splash. Stores
   the address via /api/launch/interest; everyone on the list gets the
   one-time "we're live" email at launch (lib/launch-notify.ts). */
export function LaunchSignup() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle")
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setStatus("loading")
    try {
      const res = await fetch("/api/launch/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus("idle")
        setError(data.error || "Something went wrong. Please try again.")
        return
      }
      setStatus("done")
    } catch {
      setStatus("idle")
      setError("Something went wrong. Please try again.")
    }
  }

  if (status === "done") {
    return (
      <p className="launch-signup__done" role="status">
        You&apos;re on the list. We&apos;ll email you the moment we&apos;re
        live.
      </p>
    )
  }

  return (
    <form className="launch-signup" onSubmit={handleSubmit}>
      <div className="launch-signup__row">
        <label className="sr-only" htmlFor="launch-email">
          Email address
        </label>
        <input
          id="launch-email"
          type="email"
          required
          autoComplete="email"
          placeholder="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={status === "loading"}
        />
        <button
          className="button hero-primary-button"
          type="submit"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Saving..." : "Express your interest"}
        </button>
      </div>
      {error ? <p className="launch-signup__error">{error}</p> : null}
      <p className="launch-signup__note">
        One email when we go live. Nothing else.
      </p>
    </form>
  )
}
