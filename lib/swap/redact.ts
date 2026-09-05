import type { ClassifiedSentence } from "@/lib/swap/types"

/**
 * Redaction — the signature mechanic (Phase 1 contract). Marks every
 * distinctive-them sentence `removed:true`; the summary line for a
 * letter where nothing qualifies is the exact string below (the
 * results screen depends on it verbatim).
 */

export const NOTHING_REMOVED = "Nothing was removed."

export function applyRedaction(
  sentences: ClassifiedSentence[]
): ClassifiedSentence[] {
  return sentences.map((s) => ({
    ...s,
    removed: s.cls === "distinctive-them",
  }))
}

export function redactionSummary(sentences: ClassifiedSentence[]): string {
  const removed = sentences.filter((s) => s.removed)
  if (removed.length === 0) return NOTHING_REMOVED
  const words = removed.reduce((n, s) => n + s.words, 0)
  const passages = removed.length === 1 ? "passage" : "passages"
  return `${removed.length} ${passages} removed — ${words} words that could only have been written to this employer.`
}
