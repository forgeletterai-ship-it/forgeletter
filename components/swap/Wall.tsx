"use client"

import { useEffect } from "react"
import { track } from "@/lib/swap/analytics"
import { wallCopy } from "@/lib/swap/templates"

/**
 * Scan 4+ — the Wall (Part I §1.2 verbatim skeleton with live
 * values). The benchmark line is a measured statistic or the
 * verified single-example fallback — never an invented average.
 */
export default function Wall({
  values,
  benchmark,
}: {
  values: { a1: number; a3: number; p1: number; p3: number }
  benchmark: { medianAnchor: number; medianProof: number; n: number } | null
}) {
  const copy = wallCopy({ ...values, benchmark })

  useEffect(() => {
    track("wall_viewed", {
      anchor_delta: values.a3 - values.a1,
      proof_delta: values.p3 - values.p1,
    })
  }, [values])

  return (
    <div className="swap-block swap-wall">
      <h3>Scan limit reached</h3>
      <h4>{copy.heading}</h4>
      <div className="swap-trajectory">{copy.trajectory}</div>
      <p>{copy.body}</p>
      <p>
        <strong>{copy.pitch}</strong>
      </p>
      <a
        className="swap-cta"
        href="/pricing?src=swap-wall"
        onClick={() =>
          track("wall_cta_clicked", {
            anchor_delta: values.a3 - values.a1,
            proof_delta: values.p3 - values.p1,
          })
        }
      >
        {copy.cta}
      </a>
      <span className="swap-cta-sub">€9.99/mo · 8 letters</span>
    </div>
  )
}
