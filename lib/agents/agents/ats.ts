import { clamp } from "../utils"
import type { ATSOutput, JobAnalysis } from "../types"

/**
 * ATS scoring — deterministic.
 *
 * Why no LLM call: the inputs (keyword list + letter text) are already
 * structured. Running an LLM to do substring matching wastes tokens and
 * introduces non-determinism. The JobAnalyst already extracted the
 * `atsKeywords` set we score against.
 */
export function runATSAgent(args: {
  letter: string
  job: JobAnalysis
}): ATSOutput {
  const keywords = dedupeLower(args.job.atsKeywords).filter((k) => k.length >= 2)
  const letterLower = args.letter.toLowerCase()

  const covered: string[] = []
  const missing: string[] = []

  for (const kw of keywords) {
    if (matchesKeyword(letterLower, kw)) {
      covered.push(kw)
    } else {
      missing.push(kw)
    }
  }

  // Weighting: must-have keywords carry more weight than the long-tail.
  const mustHaveSet = new Set(dedupeLower(args.job.mustHaveSkills))
  const mustHaveTotal = keywords.filter((k) => mustHaveSet.has(k)).length || 1
  const mustHaveCovered = covered.filter((k) => mustHaveSet.has(k)).length

  const longTailTotal = keywords.length - mustHaveTotal || 1
  const longTailCovered = covered.length - mustHaveCovered

  const mustHaveRatio = mustHaveCovered / mustHaveTotal
  const longTailRatio = longTailCovered / Math.max(1, longTailTotal)

  // 70% weight on must-haves, 30% on long-tail
  const rawScore = mustHaveRatio * 70 + longTailRatio * 30
  const score = clamp(Math.round(rawScore), 0, 100)

  let verdict: ATSOutput["verdict"]
  if (score >= 80) verdict = "ATS Ready"
  else if (score >= 60) verdict = "Good"
  else if (score >= 40) verdict = "Needs Work"
  else verdict = "At Risk"

  return { score, verdict, coveredKeywords: covered, missingKeywords: missing }
}

function matchesKeyword(haystack: string, keyword: string): boolean {
  // Word-boundary-ish match. For multi-word keywords use substring; for
  // single words require it to be a recognizable token (so "java" doesn't
  // match "javascript").
  if (keyword.includes(" ")) {
    return haystack.includes(keyword)
  }
  const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}([^a-z0-9]|$)`, "i")
  return re.test(haystack)
}

function dedupeLower(arr: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of arr) {
    const lower = item.trim().toLowerCase()
    if (!lower || seen.has(lower)) continue
    seen.add(lower)
    out.push(lower)
  }
  return out
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
