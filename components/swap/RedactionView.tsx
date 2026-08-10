"use client"

import type { ClassifiedSentence } from "@/lib/swap/types"

/**
 * Result beat 1 — the redaction (the emotional beat precedes the
 * number). Distinctive passages lift out over 600ms; for 0-anchor
 * letters the verdict is the exact string "Nothing was removed."
 * passed down from the API (redact.ts owns it).
 */
export default function RedactionView({
  sentences,
  summary,
}: {
  sentences: ClassifiedSentence[]
  summary: string
}) {
  return (
    <div className="swap-block swap-redaction">
      <h3>Remove everything about the employer</h3>
      <p>
        {sentences.map((s) => (
          <span
            key={s.index}
            className={s.removed ? "swap-s swap-s--removed" : "swap-s"}
          >
            {s.text}{" "}
          </span>
        ))}
      </p>
      <div className="swap-redaction-verdict" aria-live="polite">
        {summary}
      </div>
    </div>
  )
}
