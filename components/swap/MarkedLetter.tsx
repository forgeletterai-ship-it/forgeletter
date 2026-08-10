"use client"

import { useState } from "react"
import { sentenceReason } from "@/lib/swap/templates"
import type { ClassifiedSentence } from "@/lib/swap/types"

/**
 * Result beat 4 — the marked letter. Every sentence carries its
 * class colour + underline; hover/tap (and keyboard focus — the
 * trigger is a real button) reveals the template reason (Rule 5:
 * all reasoning language comes from templates, never the model).
 */

function reasonFor(s: ClassifiedSentence): string {
  return sentenceReason(s.cls, s.failure)
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
