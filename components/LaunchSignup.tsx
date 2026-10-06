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
        Get a <strong>special gift</strong> when we go live
        {/* Emoji-style filled gift: cream box, gold lid, red bow +
            ribbon tag + corner stripe (owner-approved reference). */}
        <svg
          className="launch-signup__gift"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <rect x="4.6" y="10.6" width="14.8" height="10" rx="1.8" fill="#fdf6e0" />
          <path d="M13.2 20.6l6.2-6.2v3.4l-2.8 2.8Z" fill="#e8313f" />
          <rect x="3" y="6.4" width="18" height="4.8" rx="1.6" fill="#f79c22" />
          <path
            d="M12 6.6C10.3 3.2 6.4 2.7 5.8 5c-.5 2 2.3 2.9 6.2 1.6Zm0 0c1.7-3.4 5.6-3.9 6.2-1.6.5 2-2.3 2.9-6.2 1.6Z"
            fill="#d8202f"
          />
          <path d="M10.5 6.4h3v6.2l-1.5-1.3-1.5 1.3Z" fill="#e8313f" />
        </svg>
      </p>
    </form>
  )
}
