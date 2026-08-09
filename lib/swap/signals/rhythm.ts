/**
 * S5 — rhythm (Phase 1 contract): coefficient of variation of
 * non-structural sentence lengths. Null under 4 sentences.
 *
 * NEVER surfaced in the UI and never verdict-bearing on its own —
 * it only participates in the FILLER tiebreak alongside affect
 * (profile.ts), and only once calibrated thresholds exist. The
 * Phase 6 grep gate enforces the UI absence.
 */

export function rhythmCv(sentenceWordCounts: number[]): number | null {
  const lengths = sentenceWordCounts.filter((n) => n > 0)
  if (lengths.length < 4) return null
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length
  if (mean === 0) return null
  const variance =
    lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length
  return Math.sqrt(variance) / mean
}
