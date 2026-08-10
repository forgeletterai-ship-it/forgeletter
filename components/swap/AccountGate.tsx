"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { track } from "@/lib/swap/analytics"
import {
  ACCOUNT_GATE_COPY,
  OUTCOME_CHECKBOX_LABEL,
  RESEARCH_CHECKBOX_LABEL,
} from "@/lib/swap/templates"

/**
 * The account gate at scan 2 (Appendix B copy verbatim; both
 * checkboxes ship UNTICKED). Creates the account through the
 * existing signup route (disposable domains blocked server-side),
 * signs in, and hands control back so the visitor can rescan.
 */
export default function AccountGate({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [outcomeOptin, setOutcomeOptin] = useState(false)
  const [researchOptin, setResearchOptin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, outcomeOptin, researchOptin }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error || "Could not create the account.")
        return
      }
      track("account_created", {
        from_ordinal: 1,
        outcome_optin: outcomeOptin,
        research_optin: researchOptin,
      })
      const signin = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })
      if (signin?.error) {
        setError("Account created — log in to continue.")
        return
      }
      onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="swap-block swap-gate">
      <h3>Two more scans, free</h3>
      <p>{ACCOUNT_GATE_COPY}</p>
      <form onSubmit={submit}>
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (8+ characters)"
          value={password}
          autoComplete="new-password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <label className="swap-check">
          <input
            type="checkbox"
            checked={outcomeOptin}
            onChange={(e) => setOutcomeOptin(e.target.checked)}
          />
          {OUTCOME_CHECKBOX_LABEL}
        </label>
        <label className="swap-check">
          <input
            type="checkbox"
            checked={researchOptin}
            onChange={(e) => setResearchOptin(e.target.checked)}
          />
          {RESEARCH_CHECKBOX_LABEL}
        </label>
        {error ? <p className="swap-error">{error}</p> : null}
        <button className="swap-submit" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create the free account"}
        </button>
      </form>
    </div>
  )
}
