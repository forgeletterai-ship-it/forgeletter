"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Script from "next/script"
import { track } from "@/lib/swap/analytics"
import {
  INPUT_PRIVACY_LINE,
  JD_FIELD_DISCLOSURE,
  OUTCOME_CHECKBOX_LABEL,
} from "@/lib/swap/templates"
import type { ScanResult } from "@/lib/swap/types"
import AccountGate from "@/components/swap/AccountGate"
import Fixes from "@/components/swap/Fixes"
import MarkedLetter from "@/components/swap/MarkedLetter"
import ProfileBlock from "@/components/swap/ProfileBlock"
import Quadrant from "@/components/swap/Quadrant"
import RedactionView from "@/components/swap/RedactionView"
import Scores from "@/components/swap/Scores"
import ShareButton from "@/components/swap/ShareButton"
import Wall from "@/components/swap/Wall"

/**
 * The tool + the fixed results order (§3.3): 1 redaction → 2 scores
 * → 3 quadrant → 4 marked letter → 5 profile → 6 fixes →
 * 7 distinctiveness disclosure → 8 outcome opt-in → 9 CTA/Wall.
 */

interface WallValues {
  a1: number
  a3: number
  p1: number
  p3: number
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void }) => void
    }
  }
}

export default function ResultsFlow({
  isLoggedIn,
  benchmark,
}: {
  isLoggedIn: boolean
  benchmark: { medianAnchor: number; medianProof: number; n: number } | null
}) {
  const [letter, setLetter] = useState("")
  const [jd, setJd] = useState("")
  const [company, setCompany] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [gate, setGate] = useState(false)
  const [wall, setWall] = useState<WallValues | null>(null)
  const [needsTurnstile, setNeedsTurnstile] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [outcomeConsented, setOutcomeConsented] = useState(false)
  const turnstileRef = useRef<HTMLDivElement | null>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  const renderTurnstile = useCallback(() => {
    if (siteKey && turnstileRef.current && window.turnstile) {
      turnstileRef.current.innerHTML = ""
      window.turnstile.render(turnstileRef.current, {
        sitekey: siteKey,
        callback: setTurnstileToken,
      })
    }
  }, [siteKey])

  useEffect(() => {
    if (needsTurnstile) renderTurnstile()
  }, [needsTurnstile, renderTurnstile])

  async function scan() {
    setBusy(true)
    setError(null)
    setGate(false)
    setWall(null)
    track("scan_started", {
      has_jd: Boolean(jd.trim()),
      auth_state: isLoggedIn ? "account" : "anon",
    })
    try {
      const res = await fetch("/api/swap-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letter,
          jd: jd.trim() || undefined,
          company: company.trim() || undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          turnstileToken: turnstileToken || undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as ScanResult & {
        error?: string
        reason?: string
        wall?: WallValues
      }
      if (!res.ok) {
        track("scan_blocked", { reason: data.reason || "error" })
        if (data.reason === "anon_limit") {
          setGate(true)
        } else if (data.reason === "acct_limit" && data.wall) {
          setWall(data.wall)
        } else if (data.reason === "turnstile" || data.reason === "circuit") {
          setNeedsTurnstile(true)
          setError("Confirm you're human below, then scan again.")
        } else {
          setError(data.error || "That didn't work — try again.")
        }
        return
      }
      setResult(data)
      track("scan_completed", {
        ordinal: data.ordinal,
        anchor: data.scores.anchor,
        proof: data.scores.proof,
        quadrant: data.scores.quadrant,
        profile: data.profile,
        confidence: data.confidence,
        mode: data.distinctMode,
      })
    } finally {
      setBusy(false)
    }
  }

  async function grantOutcomeConsent() {
    const res = await fetch("/api/swap-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "outcome_email" }),
    })
    if (res.ok) setOutcomeConsented(true)
  }

  const disclosure =
    result &&
    (result.distinctMode === "corpus"
      ? `Anchor was measured against ${result.corpusSize} real postings for this role.`
      : `Anchor used our reference phrase list — at 200 postings for this role we switch to measured data; ${result.corpusSize} so far.`)

  return (
    <div className="swap-scope">
      {siteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          onLoad={renderTurnstile}
        />
      ) : null}

      <div className="swap-tool">
        <label className="swap-field-label" htmlFor="swap-letter">
          Your cover letter
        </label>
        <textarea
          id="swap-letter"
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
          placeholder="Paste the whole letter, greeting to sign-off."
          maxLength={8000}
        />
        <p className="swap-privacy-line">{INPUT_PRIVACY_LINE}</p>

        <label className="swap-field-label" htmlFor="swap-jd">
          Job posting (optional)
        </label>
        <div className="swap-tool--jd">
          <textarea
            id="swap-jd"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the job ad."
            maxLength={20000}
          />
        </div>
        <p className="swap-disclosure">{JD_FIELD_DISCLOSURE}</p>

        <label className="swap-field-label" htmlFor="swap-company">
          Company name (optional)
        </label>
        <input
          id="swap-company"
          className="swap-company-input"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Who is this letter addressed to?"
        />

        {needsTurnstile ? <div ref={turnstileRef} /> : null}
        {error ? <p className="swap-error">{error}</p> : null}
        <button
          className="swap-submit"
          type="button"
          disabled={busy || letter.trim().length < 300}
          onClick={scan}
        >
          {busy ? "Scanning…" : "Run the swap test"}
        </button>
      </div>

      {gate ? <div className="swap-results"><AccountGate onDone={() => window.location.reload()} /></div> : null}
      {wall ? (
        <div className="swap-results">
          <Wall values={wall} benchmark={benchmark} />
        </div>
      ) : null}

      {result ? (
        <div className="swap-results">
          <RedactionView sentences={result.sentences} summary={result.redactionSummary} />
          <Scores scores={result.scores} />
          <Quadrant active={result.scores.quadrant} />
          <MarkedLetter sentences={result.sentences} />
          <ProfileBlock profile={result.profile} confidence={result.confidence} />
          <Fixes fixes={result.fixes} ordinal={result.ordinal} />
          <p className="swap-disclosure">{disclosure}</p>

          {isLoggedIn && !outcomeConsented ? (
            <div className="swap-block">
              <label className="swap-check">
                <input type="checkbox" onChange={grantOutcomeConsent} />
                {OUTCOME_CHECKBOX_LABEL}
              </label>
            </div>
          ) : null}

          <div>
            <a
              className="swap-cta"
              href="/auth/signup?src=swap-result"
              onClick={() =>
                track("generator_cta_clicked", { source: "result" })
              }
            >
              Build a letter that passes →
            </a>
            <span className="swap-cta-sub">
              <ShareButton scores={result.scores} profile={result.profile} />
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
