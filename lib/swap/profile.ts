import type {
  Profile,
  ProfileConfidence,
  Quadrant,
  Signals,
  SwapThresholds,
} from "@/lib/swap/types"

/**
 * Profile resolution (Phase 1 contract).
 *
 * Non-FILLER quadrants pass straight through. FILLER splits into
 * TEMPLATE_FILL vs BLANK_PAGE only when calibrated thresholds exist
 * (Rule 7 — no invented cut-offs): with a JD the echo signal decides
 * at full confidence; without one, affect + rhythm tiebreak at
 * reduced confidence. Before calibration the split stays off and
 * every FILLER letter reads BLANK_PAGE at reduced confidence.
 */

export function resolveProfile(
  quadrant: Quadrant,
  signals: Signals,
  hadJd: boolean,
  thresholds: SwapThresholds | null
): { profile: Profile; confidence: ProfileConfidence } {
  if (quadrant !== "FILLER") {
    return { profile: quadrant, confidence: "full" }
  }

  if (!thresholds) {
    return { profile: "BLANK_PAGE", confidence: "reduced" }
  }

  if (hadJd && signals.echo !== null && thresholds.echoHigh !== null) {
    return {
      profile: signals.echo >= thresholds.echoHigh ? "TEMPLATE_FILL" : "BLANK_PAGE",
      confidence: "full",
    }
  }

  // No JD: affect + rhythm tiebreak, reduced confidence. A signal
  // whose threshold was disabled at calibration (null) simply doesn't
  // vote; with no votes available the default is BLANK_PAGE.
  const votes: boolean[] = []
  if (thresholds.affectHigh !== null) {
    votes.push(signals.affectRatio >= thresholds.affectHigh)
  }
  if (thresholds.cvLow !== null && signals.cv !== null) {
    votes.push(signals.cv <= thresholds.cvLow)
  }
  const templateFill = votes.length > 0 && votes.every(Boolean)
  return {
    profile: templateFill ? "TEMPLATE_FILL" : "BLANK_PAGE",
    confidence: "reduced",
  }
}
