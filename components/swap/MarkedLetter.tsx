"use client"

import { useState } from "react"
import { REPAIRS } from "@/lib/swap/templates"
import type { ClassifiedSentence, SentenceClass } from "@/lib/swap/types"

/**
 * Result beat 4 — the marked letter. Every sentence carries its
 * class colour + underline; hover/tap (and keyboard focus — the
 * trigger is a real button) reveals the template reason (Rule 5:
 * all reasoning language comes from templates, never the model).
 */

const CLASS_REASON: Record<SentenceClass, string> = {
  structural: "Structural — greeting or sign-off; excluded from every score.",
  "distinctive-them":
    "Could only have been written to this employer — it survives the swap test.",
  "boilerplate-them":
    "About the employer, but it would survive unchanged at any competitor.",
  "checkable-you":
    "A claim about you an interviewer could probe and catch a wrong answer on.",
  "asserted-you": "A claim about you with no number, baseline, or named result.",
}

function reasonFor(s: ClassifiedSentence): string {
  const base = CLASS_REASON[s.cls]
  if (s.failure && REPAIRS[s.failure]) {
    return `${base} ${REPAIRS[s.failure].headline}.`
  }
  return base
}

export default function MarkedLetter({ sentences }: { sentences: ClassifiedSentence[] }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="swap-block">
      <h3>Sentence by sentence</h3>
      <p className="swap-marked swap-anim">
        {sentences.map((s) => (
          <span key={s.index} className="swap-tip">
            <button
              type="button"
              className={`swap-s swap-s--${s.cls}`}
              aria-describedby={open === s.index ? `swap-tip-${s.index}` : undefined}
              onMouseEnter={() => setOpen(s.index)}
              onMouseLeave={() => setOpen((v) => (v === s.index ? null : v))}
              onFocus={() => setOpen(s.index)}
              onBlur={() => setOpen((v) => (v === s.index ? null : v))}
              onClick={() => setOpen((v) => (v === s.index ? null : s.index))}
            >
              {s.text}
            </button>{" "}
            {open === s.index ? (
              <span role="tooltip" id={`swap-tip-${s.index}`}>
                {reasonFor(s)}
              </span>
            ) : null}
          </span>
        ))}
      </p>
    </div>
  )
}
