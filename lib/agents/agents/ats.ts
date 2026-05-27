import { z } from "zod"
import { MODELS, runAgent } from "../run-agent"
import { clamp } from "../utils"
import type { AgentRunLog, ATSOutput, JobAnalysis } from "../types"
import type { CallMeta } from "./resume-analyst"

/**
 * ATS Agent — keyword scoring + (optional) LLM-driven nuance.
 *
 * Two modes per the blueprint:
 *   - DETERMINISTIC (Starter): pure code, no model call. Substring
 *     matching with must-have weighting. This is the always-on
 *     base score; cheap, fast, exact.
 *   - LLM (Pro / Ultra): Haiku 4.5 adds two judgment fields:
 *       • stuffingRisk — none / moderate / high (catches obvious
 *         keyword-stuffing patterns the substring scorer can't see)
 *       • recommendedAdditions — top 5 missing keywords that would
 *         naturally fit. Used by the Rewrite Agent.
 *     The base score still comes from the deterministic pass — the
 *     LLM only refines the verdict.
 *
 * Both modes return the same ATSOutput shape so consumers don't care
 * which ran.
 */

// ─────────────────────────────────────────────────────────────────
// Deterministic base scorer — used directly on Starter, and as the
// floor / seed for the LLM mode on Pro/Ultra.
// ─────────────────────────────────────────────────────────────────

export function scoreATSDeterministic(args: {
  letter: string
  job: JobAnalysis
}): {
  score: number
  verdict: ATSOutput["verdict"]
  coveredKeywords: string[]
  missingKeywords: string[]
} {
  const keywords = dedupeLower(args.job.atsKeywords).filter((k) => k.length >= 2)
  const letterLower = args.letter.toLowerCase()

  const covered: string[] = []
  const missing: string[] = []

  for (const kw of keywords) {
    if (matchesKeyword(letterLower, kw)) covered.push(kw)
    else missing.push(kw)
  }

  const mustHaveSet = new Set(dedupeLower(args.job.mustHaveSkills))
  const mustHaveTotal = keywords.filter((k) => mustHaveSet.has(k)).length || 1
  const mustHaveCovered = covered.filter((k) => mustHaveSet.has(k)).length

  const longTailTotal = keywords.length - mustHaveTotal || 1
  const longTailCovered = covered.length - mustHaveCovered

  const mustHaveRatio = mustHaveCovered / mustHaveTotal
  const longTailRatio = longTailCovered / Math.max(1, longTailTotal)

  // 70% weight on must-haves, 30% on long-tail.
  const rawScore = mustHaveRatio * 70 + longTailRatio * 30
  const score = clamp(Math.round(rawScore), 0, 100)

  let verdict: ATSOutput["verdict"]
  if (score >= 80) verdict = "ATS Ready"
  else if (score >= 60) verdict = "Good"
  else if (score >= 40) verdict = "Needs Work"
  else verdict = "At Risk"

  return { score, verdict, coveredKeywords: covered, missingKeywords: missing }
}

// ─────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────

export interface ATSResult {
  data: ATSOutput
  log: AgentRunLog
  /** @deprecated Use `log`. */
  meta: CallMeta
  /** @deprecated Use `log.fallbackTriggered`. */
  fallback: boolean
}

/**
 * Legacy synchronous entry-point. Returns deterministic ATS only.
 * Kept so existing orchestrator code that calls `runATSAgent({...})`
 * continues to work until the orchestrator migrates to the async
 * tier-aware version below.
 */
export function runATSAgent(args: {
  letter: string
  job: JobAnalysis
}): ATSOutput {
  return scoreATSDeterministic(args)
}

const ATSEnhancementSchema = z.object({
  stuffingRisk: z.enum(["none", "moderate", "high"]),
  recommendedAdditions: z.array(z.string()),
  /** Optional verdict override; clamped against deterministic score. */
  verdictAdjustment: z.enum(["lower", "keep", "raise"]),
  reasoning: z.string(),
})

type ATSEnhancementFull = z.infer<typeof ATSEnhancementSchema>

const SYSTEM = `You are an ATS-tuning assistant. You're given a cover letter, a deterministic ATS keyword-coverage score, and the JD's keyword list. You add two judgment calls a substring scorer cannot make:

1. "stuffingRisk":
   - "none" — keywords are integrated naturally inside meaningful sentences
   - "moderate" — at least one paragraph reads like a keyword list, OR same keyword repeats unnaturally
   - "high" — keywords appear in lists / parenthetical dumps / clearly stuffed sentences

2. "recommendedAdditions" — up to 5 missing JD keywords (from the provided list) that would naturally fit in the letter given the candidate's experience. Order by impact. Never invent — only pick from the provided missing list.

3. "verdictAdjustment":
   - "raise" — letter integrates keywords better than the base score suggests
   - "keep" — base verdict is right
   - "lower" — stuffing penalises the letter despite keyword coverage

4. "reasoning" — 1-2 sentences explaining the call.`

const FALLBACK_ATS: ATSEnhancementFull = {
  stuffingRisk: "none",
  recommendedAdditions: [],
  verdictAdjustment: "keep",
  reasoning: "ATS LLM enhancement unavailable; defaulting to base deterministic score.",
}

/**
 * Tier-aware ATS scorer.
 *
 * @param useLLM  Pass true for Pro / Ultra (enableATS=true in tier
 *                config). Pass false for Starter or anytime a code-
 *                only score is sufficient.
 */
export async function runATSAgentTiered(args: {
  letter: string
  job: JobAnalysis
  useLLM: boolean
  cycleNumber?: number
}): Promise<ATSResult> {
  const base = scoreATSDeterministic({ letter: args.letter, job: args.job })

  if (!args.useLLM) {
    const data: ATSOutput = {
      ...base,
      stuffingRisk: "none",
      recommendedAdditions: base.missingKeywords.slice(0, 5),
    }
    const log: AgentRunLog = {
      agent: "ATSAgent",
      cycle: args.cycleNumber ?? 0,
      outputJson: data,
      modelUsed: "deterministic",
      durationMs: 0,
      tokensInput: 0,
      tokensOutput: 0,
      fallbackTriggered: false,
    }
    return {
      data,
      log,
      meta: { modelUsed: "deterministic", tokensInput: 0, tokensOutput: 0, durationMs: 0 },
      fallback: false,
    }
  }

  const result = await runAgent({
    agent: "ATSAgent",
    model: MODELS.haiku,
    cycleNumber: args.cycleNumber ?? 0,
    system: SYSTEM,
    user: [
      `Base deterministic ATS score: ${base.score} (${base.verdict})`,
      `Covered keywords (${base.coveredKeywords.length}): ${base.coveredKeywords.join(", ") || "—"}`,
      `Missing keywords (${base.missingKeywords.length}): ${base.missingKeywords.join(", ") || "—"}`,
      "",
      "Letter:",
      args.letter,
    ].join("\n"),
    schema: ATSEnhancementSchema,
    schemaName: "submit_ats_enhancement",
    schemaDescription:
      "Submit the ATS enhancement — stuffing risk, recommended additions, verdict adjustment.",
    fallback: FALLBACK_ATS,
    maxTokens: 600,
    temperature: 0.1,
    timeoutMs: 15_000,
  })

  // Compose final verdict. The base score is the floor; LLM can
  // raise / lower one notch, never two.
  let verdict = base.verdict
  if (result.data.verdictAdjustment === "lower") verdict = downgrade(verdict)
  if (result.data.verdictAdjustment === "raise") verdict = upgrade(verdict)
  // Stuffing = high → force "Needs Work" minimum.
  if (result.data.stuffingRisk === "high") verdict = downgrade(verdict)

  // Recommended additions: enforce that every item exists in the
  // deterministic missing list — the model cannot invent keywords.
  const missingSet = new Set(base.missingKeywords)
  const recs = result.data.recommendedAdditions.filter((k) => missingSet.has(k.toLowerCase()))

  const data: ATSOutput = {
    ...base,
    verdict,
    stuffingRisk: result.data.stuffingRisk,
    recommendedAdditions: recs.length > 0 ? recs : base.missingKeywords.slice(0, 5),
  }

  return {
    data,
    log: result.log,
    meta: {
      modelUsed: result.log.modelUsed,
      tokensInput: result.log.tokensInput,
      tokensOutput: result.log.tokensOutput,
      durationMs: result.log.durationMs,
    },
    fallback: result.log.fallbackTriggered,
  }
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function matchesKeyword(haystack: string, keyword: string): boolean {
  if (keyword.includes(" ")) return haystack.includes(keyword)
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

const VERDICT_ORDER: ATSOutput["verdict"][] = ["At Risk", "Needs Work", "Good", "ATS Ready"]

function upgrade(v: ATSOutput["verdict"]): ATSOutput["verdict"] {
  const i = VERDICT_ORDER.indexOf(v)
  return VERDICT_ORDER[Math.min(i + 1, VERDICT_ORDER.length - 1)]
}

function downgrade(v: ATSOutput["verdict"]): ATSOutput["verdict"] {
  const i = VERDICT_ORDER.indexOf(v)
  return VERDICT_ORDER[Math.max(i - 1, 0)]
}
