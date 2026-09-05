"use client"

import { useState } from "react"
import { track } from "@/lib/swap/analytics"
import type { Profile, Scores } from "@/lib/swap/types"

/**
 * Share card: an explicit click snapshots scores (30-day TTL,
 * numbers + profile only — Rule 1 exception a) and copies a link
 * whose OG image carries them. Pre-filled text per §1.3.
 */
export default function ShareButton({
  scores,
  profile,
}: {
  scores: Scores
  profile: Profile
}) {
  const [state, setState] = useState<"idle" | "busy" | "copied" | "error">("idle")

  async function share() {
    setState("busy")
    try {
      const res = await fetch("/api/swap-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchor: scores.anchor,
          proof: scores.proof,
          quadrant: scores.quadrant,
          profile,
        }),
      })
      if (!res.ok) throw new Error("share failed")
      const { id } = (await res.json()) as { id: string }
      const url = `${window.location.origin}/swap-test?share=${id}`
      const text = `my cover letter is ${scores.anchor}% about the company I sent it to`
      track("share_clicked", { anchor: scores.anchor, proof: scores.proof, profile })
      if (navigator.share) {
        await navigator.share({ text, url })
      } else {
        await navigator.clipboard.writeText(`${text} — ${url}`)
      }
      setState("copied")
    } catch {
      setState("error")
    }
  }

  return (
    <button className="swap-submit" type="button" onClick={share} disabled={state === "busy"}>
      {state === "copied" ? "Link copied" : state === "error" ? "Try again" : "Share result"}
    </button>
  )
}
