"use client"

import { useEffect, useRef, useState } from "react"
import { BANDS } from "@/lib/swap/score"
import type { Scores as ScoresType } from "@/lib/swap/types"

/** Result beat 2 — the two scores with band lines. Count-up ~700ms
 *  (reduced motion → final value immediately). Anchor renders teal
 *  inside 12–35, alarm outside; Proof teal above 66. */

function useCountUp(target: number): number {
  const [value, setValue] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700)
      setValue(Math.round(target * (1 - (1 - t) ** 3)))
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target])
  return value
}

export default function Scores({ scores }: { scores: ScoresType }) {
  const anchor = useCountUp(scores.anchor)
  const proof = useCountUp(scores.proof)

  const anchorHealthy =
    scores.anchor >= BANDS.anchor.passing && scores.anchor <= BANDS.anchor.healthy
  const proofHealthy = scores.proof > BANDS.proof.mixed

  const anchorLine =
    scores.distinctiveWords > 0
      ? `${scores.distinctiveWords} of ${scores.nonStructuralWords} words could only have been written to this employer. Healthy band: 12–35%.`
      : `0 of ${scores.nonStructuralWords} words are specific to this employer. Healthy band: 12–35%.`
  const proofLine =
    scores.youClaims > 0
      ? `${scores.checkableClaims} of ${scores.youClaims} claims about you ${scores.checkableClaims === 1 ? "is" : "are"} checkable. Healthy: more than two-thirds.`
      : `No claims about you were found to count.`

  return (
    <div className="swap-scores">
      <div className={`swap-block swap-score ${anchorHealthy ? "swap-score--good" : "swap-score--alarm"}`}>
        <div className="swap-score-name">Anchor</div>
        <div className="swap-score-num">{anchor}%</div>
        <div className="swap-band-line">{anchorLine}</div>
      </div>
      <div className={`swap-block swap-score ${proofHealthy ? "swap-score--good" : "swap-score--alarm"}`}>
        <div className="swap-score-name">Proof</div>
        <div className="swap-score-num">{proof}%</div>
        <div className="swap-band-line">{proofLine}</div>
      </div>
    </div>
  )
}
