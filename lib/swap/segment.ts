import type { SegmentedSentence } from "@/lib/swap/types"

/**
 * Sentence segmentation via Intl.Segmenter (Phase 1 contract).
 *
 * ICU sentence rules handle "Dr.", "e.g.", decimals ("6.1%") without
 * false splits, and hard line breaks (UAX #29 Sep class) separate
 * salutations that carry no terminal punctuation.
 */

const segmenter = new Intl.Segmenter("en", { granularity: "sentence" })

/** Whitespace-token word count, ignoring punctuation-only tokens
 *  (a spaced em-dash is not a word). The single counting rule every
 *  denominator uses (Rule 9 exclusions happen at the scoring layer). */
export function countWords(text: string): number {
  const tokens = text.trim().match(/\S+/g)
  if (!tokens) return 0
  return tokens.filter((t) => /[\p{L}\p{N}]/u.test(t)).length
}

/** A segment ending on one of these is a false break — the ICU data
 *  shipped with V8 lacks the CLDR abbreviation suppressions, so
 *  "Dr. Smith" and "(e.g. quarterly)" would otherwise split. */
const ABBREV_TAIL =
  /\b(?:Dr|Mr|Mrs|Ms|Prof|St|Jr|Sr|vs|etc|approx|Inc|Ltd|Co|No|Dept|Univ|est|e\.g|i\.e|cf|al)\.$/i

export function segmentSentences(text: string): SegmentedSentence[] {
  if (!text || !text.trim()) return []
  const raw: string[] = []
  for (const part of segmenter.segment(text.replace(/\r\n/g, "\n"))) {
    const t = part.segment.trim()
    if (!t) continue
    const prev = raw[raw.length - 1]
    if (prev && ABBREV_TAIL.test(prev)) {
      raw[raw.length - 1] = `${prev} ${t}`
    } else {
      raw.push(t)
    }
  }
  return raw.map((t, index) => ({ index, text: t, words: countWords(t) }))
}
