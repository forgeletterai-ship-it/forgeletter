import type {
  ClassifiedSentence,
  Quadrant,
  Scores,
  SegmentedSentence,
  SentenceClass,
  SentenceLabel,
} from "@/lib/swap/types"
import {
  sentenceIsDistinctive,
  type DistinctivenessContext,
} from "@/lib/swap/idf"

/**
 * Scoring (Phase 1 contract).
 *
 * Anchor is WORD-WEIGHTED: the share of non-structural words that sit
 * inside distinctive-them sentences. Proof is CLAIM-COUNTED: the share
 * of aboutYou claims that are checkable. Structural sentences are
 * excluded from every denominator (Rule 9).
 *
 * The Appendix A regression (tests/swap-score.test.ts) pins this
 * rubric: ChatGPT letter → 0 / 25 / FILLER; ForgeLetter letter →
 * 24±2 / 100 / TARGETED. A rubric change that breaks those is wrong.
 */

export const RUBRIC_VERSION = "1.0.0"

export const BANDS = {
  anchor: { passing: 12, healthy: 35 },
  proof: { mixed: 66 },
} as const

export function quadrantFor(anchor: number, proof: number): Quadrant {
  const anchored = anchor >= BANDS.anchor.passing
  const proven = proof > BANDS.proof.mixed
  if (anchored && proven) return "TARGETED"
  if (anchored) return "FLATTERY"
  if (proven) return "CREDENTIALS"
  return "FILLER"
}

/** Display-class precedence. A sentence can claim both sides
 *  ("Both may be true" in the agent task); the class that drives its
 *  visual treatment resolves distinctive-them first (the redaction
 *  mechanic), then proven you-claims, then them-boilerplate, then
 *  asserted you-claims. Matches the Appendix A worked examples. */
function classFor(label: SentenceLabel, distinct: boolean): SentenceClass {
  if (label.structural) return "structural"
  if (label.aboutThem && distinct) return "distinctive-them"
  if (label.aboutYou && label.checkable) return "checkable-you"
  if (label.aboutThem) return "boilerplate-them"
  if (label.aboutYou) return "asserted-you"
  return "boilerplate-them"
}

/** Merge segmentation + agent labels + distinctiveness resolution
 *  into the classified form every downstream module consumes. */
export function classifySentences(
  segmented: SegmentedSentence[],
  labels: SentenceLabel[],
  ctx: DistinctivenessContext
): ClassifiedSentence[] {
  const byIndex = new Map(labels.map((l) => [l.index, l]))
  return segmented.map((s) => {
    const label: SentenceLabel = byIndex.get(s.index) ?? {
      index: s.index,
      structural: true, // unlabelled → treated structural (excluded)
      aboutThem: false,
      aboutYou: false,
      themPhrases: [],
      checkable: false,
      technique: null,
      failure: null,
    }
    const distinct =
      !label.structural &&
      label.aboutThem &&
      sentenceIsDistinctive(label.themPhrases, ctx)
    const cls = classFor(label, distinct)
    return {
      ...s,
      ...label,
      distinct,
      cls,
      removed: cls === "distinctive-them",
    }
  })
}

export function scoreLetter(sentences: ClassifiedSentence[]): Scores {
  let nonStructuralWords = 0
  let distinctiveWords = 0
  let youClaims = 0
  let checkableClaims = 0

  for (const s of sentences) {
    if (s.structural) continue
    nonStructuralWords += s.words
    if (s.aboutThem && s.distinct) distinctiveWords += s.words
    if (s.aboutYou) {
      youClaims += 1
      if (s.checkable) checkableClaims += 1
    }
  }

  const anchor =
    nonStructuralWords > 0
      ? Math.round((100 * distinctiveWords) / nonStructuralWords)
      : 0
  const proof = youClaims > 0 ? Math.round((100 * checkableClaims) / youClaims) : 0

  return {
    anchor,
    proof,
    quadrant: quadrantFor(anchor, proof),
    nonStructuralWords,
    distinctiveWords,
    youClaims,
    checkableClaims,
  }
}
