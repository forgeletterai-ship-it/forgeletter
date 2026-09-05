import { REPAIRS } from "@/lib/swap/templates"
import type { ClassifiedSentence, Fix, Scores } from "@/lib/swap/types"

/**
 * Deterministic fixes (Phase 1 contract): max 3, fixed priority.
 *  1. anchor = 0 with them-sentences → quote the first boilerplate one
 *  2. anchor = 0 without them-sentences → "never engages the employer"
 *  3. asserted you-claims → quote the first, carry the count
 *  4. anchor > 35 & proof ≤ 66 → the flattery trade
 * Content comes from templates.ts (Rule 5). The route decides how
 * many render per ladder position (scan 1 shows one).
 */

const MAX_FIXES = 3

export function buildFixes(sentences: ClassifiedSentence[], scores: Scores): Fix[] {
  const fixes: Fix[] = []
  const live = sentences.filter((s) => !s.structural)
  const themSentences = live.filter((s) => s.aboutThem)
  const boilerplateThem = themSentences.filter((s) => !s.distinct)

  if (scores.anchor === 0 && themSentences.length > 0) {
    const target = boilerplateThem[0] ?? themSentences[0]
    fixes.push({ key: "F03", ...REPAIRS.F03, quotedSentence: target.text })
  } else if (scores.anchor === 0) {
    fixes.push({ key: "ENGAGE", ...REPAIRS.ENGAGE })
  }

  const asserted = live.filter((s) => s.aboutYou && !s.checkable)
  if (asserted.length > 0) {
    fixes.push({
      key: "F01",
      ...REPAIRS.F01,
      quotedSentence: asserted[0].text,
      count: asserted.length,
    })
  }

  if (scores.anchor > 35 && scores.proof <= 66) {
    fixes.push({ key: "TRADE", ...REPAIRS.TRADE })
  }

  return fixes.slice(0, MAX_FIXES)
}
