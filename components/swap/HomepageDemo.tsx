"use client"

import { useEffect, useRef, useState } from "react"
import { track } from "@/lib/swap/analytics"
import { DEMO_COPY, DEMO_LETTERS, type DemoLetter } from "@/lib/swap/demo-data"
import { sentenceReason } from "@/lib/swap/templates"
import type { SentenceClass } from "@/lib/swap/types"

/**
 * Homepage demo (§1.3 / Phase 6): auto-plays the two verified
 * Appendix A letters when 30% visible. Static data, zero API calls,
 * pure DOM/CSS. No paste box — watching is free; the CTA leads to
 * /swap-test where the 30 seconds of effort belong.
 */

type Phase = "idle" | "marking" | "redacting" | "scored"

function classFor(s: DemoLetter["sentences"][number]): SentenceClass {
  if (s.structural) return "structural"
  if (s.themPhrases && (s.technique === "T05" || s.technique === "T07")) return "distinctive-them"
  if (s.aboutThem) return "boilerplate-them"
  if (s.checkable) return "checkable-you"
  return "asserted-you"
}

function scoresFor(letter: DemoLetter): { anchor: number; proof: number; quadrant: string } {
  return letter.id === "generic"
    ? { anchor: 0, proof: 25, quadrant: "FILLER" }
    : { anchor: 24, proof: 100, quadrant: "TARGETED" }
}

export default function HomepageDemo() {
  const [variant, setVariant] = useState<DemoLetter>(DEMO_LETTERS[0])
  const [phase, setPhase] = useState<Phase>("idle")
  const [openTip, setOpenTip] = useState<number | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const played = useRef(false)

  function play(letter: DemoLetter) {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setOpenTip(null)
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) {
      setPhase("scored")
      track("demo_completed", { letter_variant: letter.id })
      return
    }
    setPhase("marking")
    timers.current.push(
      setTimeout(() => setPhase("redacting"), 1400),
      setTimeout(() => {
        setPhase("scored")
        track("demo_completed", { letter_variant: letter.id })
      }, 2600)
    )
  }

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !played.current) {
          played.current = true
          play(variant)
        }
      },
      { threshold: 0.3 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      timers.current.forEach(clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scores = scoresFor(variant)

  return (
    <div className="swap-scope swap-demo" ref={rootRef}>
      <div className="swap-demo-toggle" role="group" aria-label="Demo letter">
        {DEMO_LETTERS.map((l) => (
          <button
            key={l.id}
            type="button"
            aria-pressed={variant.id === l.id}
            onClick={() => {
              setVariant(l)
              play(l)
            }}
          >
            {l.title}
          </button>
        ))}
      </div>

      <p className="swap-demo-letter swap-marked swap-anim">
        {variant.sentences.map((s, i) => {
          const cls = classFor(s)
          const marked = phase !== "idle"
          const removed = phase !== "idle" && phase !== "marking" && cls === "distinctive-them"
          const className = removed
            ? "swap-s swap-s--removed"
            : marked
              ? `swap-s swap-s--${cls}`
              : "swap-s"
          const style =
            marked && !removed ? { transitionDelay: `${i * 180}ms` } : undefined
          // Once marked, every sentence explains itself on hover/tap/
          // focus — same template reasons as the real results screen.
          if (!marked) {
            return (
              <span key={i} className={className}>
                {s.text}{" "}
              </span>
            )
          }
          return (
            <span key={i} className="swap-tip">
              <button
                type="button"
                className={className}
                style={style}
                aria-describedby={openTip === i ? `swap-demo-tip-${i}` : undefined}
                onMouseEnter={() => setOpenTip(i)}
                onMouseLeave={() => setOpenTip((v) => (v === i ? null : v))}
                onFocus={() => setOpenTip(i)}
                onBlur={() => setOpenTip((v) => (v === i ? null : v))}
                onClick={() => setOpenTip((v) => (v === i ? null : i))}
              >
                {s.text}
              </button>{" "}
              {openTip === i ? (
                <span role="tooltip" id={`swap-demo-tip-${i}`}>
                  {sentenceReason(cls, s.failure ?? null)}
                </span>
              ) : null}
            </span>
          )
        })}
      </p>

      {phase === "scored" ? (
        <>
          <div className="swap-redaction-verdict" aria-live="polite">
            {variant.id === "generic"
              ? "Nothing was removed."
              : "The opening passage was removed — it only fits this employer."}
          </div>
          <div className="swap-demo-scores">
            <div>
              <div className="swap-score-name">Anchor</div>
              <div className="swap-score-num">
                {scores.anchor}%
              </div>
              <div className="swap-band-line">{variant.anchorBandLine}</div>
            </div>
            <div>
              <div className="swap-score-name">Proof</div>
              <div className="swap-score-num">{scores.proof}%</div>
              <div className="swap-band-line">{variant.proofBandLine}</div>
            </div>
          </div>
        </>
      ) : null}

      <div>
        <button className="swap-demo-replay" type="button" onClick={() => play(variant)}>
          Replay
        </button>
      </div>

      <p style={{ marginTop: 14 }}>
        <a
          className="swap-cta"
          href="/swap-test"
          onClick={() => track("demo_cta_clicked")}
        >
          Test your own letter →
        </a>
      </p>
      <p className="swap-disclosure">{DEMO_COPY.heroSub}</p>
    </div>
  )
}
