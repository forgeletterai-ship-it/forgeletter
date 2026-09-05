"use client"

import { SCAN1_BANNER } from "@/lib/swap/templates"
import type { Fix } from "@/lib/swap/types"

/** Result beat 6 — the fixes (per-ladder count: the route already
 *  sliced to one for scan 1; the banner sells the other two). */
export default function Fixes({ fixes, ordinal }: { fixes: Fix[]; ordinal: number | null }) {
  if (fixes.length === 0) return null
  return (
    <div className="swap-block">
      <h3>{fixes.length === 1 ? "The fix" : "The fixes"}</h3>
      {fixes.map((f) => (
        <div key={f.key} className="swap-fix">
          <h4>{f.headline}</h4>
          {f.quotedSentence ? <blockquote>“{f.quotedSentence}”</blockquote> : null}
          <p>
            {f.body}
            {typeof f.count === "number" && f.count > 1
              ? ` This letter does it ${f.count} times.`
              : ""}
          </p>
          <p className="swap-gold">What works: “{f.goldQuote}”</p>
          <p className="swap-ask">{f.ask}</p>
        </div>
      ))}
      {ordinal === 1 ? <div className="swap-banner">{SCAN1_BANNER}</div> : null}
    </div>
  )
}
