/**
 * S3 — affect density (Phase 1 contract): enthusiasm vocabulary per
 * checkable claim. High affect with low proof is the FILLER signature.
 */

/** ~25-term wordlist from the build doc (single words + phrases). */
export const AFFECT_TERMS: readonly string[] = [
  "excited",
  "thrilled",
  "passionate",
  "passion",
  "eager",
  "admire",
  "love",
  "inspired",
  "inspiring",
  "keen",
  "deeply",
  "genuinely",
  "truly",
  "confident",
  "delighted",
  "honored",
  "enthusiastic",
  "perfect fit",
  "ideal candidate",
  "dream role",
  "dream job",
  "aligns with my values",
  "growth mindset",
  "team player",
  "immediate impact",
]

const PATTERNS = AFFECT_TERMS.map(
  (t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi")
)

export function affectSignal(
  nonStructuralText: string,
  checkableClaims: number
): { affectCount: number; ratio: number } {
  let affectCount = 0
  for (const re of PATTERNS) {
    const m = nonStructuralText.match(re)
    if (m) affectCount += m.length
  }
  return { affectCount, ratio: affectCount / Math.max(checkableClaims, 1) }
}
