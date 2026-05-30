import type {
  HMCritique,
  JobAnalysis,
  MatchAnalysis,
  MatchBlueprint,
  ProfileAnalysis,
  QualityVerdict,
  ResumeAnalysis,
  RetrievedExample,
  Tier,
  Tone,
} from "../types"
import { runWriterAgent, type WriterAgentResult } from "./writer"

/**
 * Rewrite Agent — "The Targeted Re-Drafter"
 *
 * Caps per the blueprint (free, invisible, never decrement the
 * user's letter allowance):
 *   - starter : 1
 *   - pro     : 2
 *   - ultra   : 2
 *
 * Strategy:
 *   - Pulls the SINGLE weakest element from the Quality Gate
 *     verdict and uses it as the focus directive.
 *   - Adds the BARS weaknesses + improvementSuggestions from the
 *     HM Critic (Ultra) for surgical fixes.
 *   - Includes the previous draft text with a "do NOT copy
 *     phrasing — produce a meaningfully different letter" note.
 *
 * Implementation: this agent is a thin wrapper around the Writer
 * with `rewriteFeedback` set. The Writer drops its temperature to
 * 0.5 when feedback is present.
 *
 * The orchestrator owns the cap and the "ship best-not-last" rule
 * (keep the highest-scoring draft across all cycles).
 */

export const REWRITE_CAPS: Record<Tier, number> = {
  free: 0, // unused — /api/generate short-circuits before agents run
  starter: 1,
  pro: 2,
  ultra: 2,
}

export function rewriteCapForTier(tier: Tier): number {
  return REWRITE_CAPS[tier] ?? 1
}

export async function runRewriteAgent(args: {
  /** Preferred input — blueprint contract. */
  profile?: ProfileAnalysis
  /** Legacy input — used until orchestrator migrates. */
  resume?: ResumeAnalysis
  job: JobAnalysis
  match?: MatchAnalysis | null
  blueprint?: MatchBlueprint | null
  examples?: RetrievedExample[]
  tone: Tone
  previousLetter: string
  verdict: QualityVerdict
  critique?: HMCritique | null
  cycleNumber?: number
}): Promise<WriterAgentResult> {
  const parts: string[] = []
  parts.push(
    `Previous draft scored ${args.verdict.score}/100 against the tier threshold. Reasoning: ${args.verdict.reasoning}`
  )

  if (args.verdict.weakestElement) {
    parts.push(
      `WEAKEST ELEMENT (focus here first): ${args.verdict.weakestElement}.`
    )
  }
  if (args.verdict.bannedPhrasesFound.length > 0) {
    parts.push(
      `Banned phrases to remove: ${args.verdict.bannedPhrasesFound.join(", ")}`
    )
  }

  if (args.critique) {
    // Prefer the new section-5 rewriteTargets when present (Eval Spec v1);
    // fall back to legacy weaknesses / redFlags / improvementSuggestions
    // for any consumer still on the old shape.
    if (args.critique.rewriteTargets && args.critique.rewriteTargets.length > 0) {
      parts.push(
        `Highest-impact rewrite targets (in priority order): ${args.critique.rewriteTargets.join("; ")}`
      )
    } else if (args.critique.improvementSuggestions && args.critique.improvementSuggestions.length > 0) {
      parts.push(
        `Specific changes from hiring-manager critique: ${args.critique.improvementSuggestions.join("; ")}`
      )
    }
    if (args.critique.weaknesses && args.critique.weaknesses.length > 0) {
      parts.push(`Weaknesses to fix: ${args.critique.weaknesses.join("; ")}`)
    }
    if (args.critique.redFlags && args.critique.redFlags.length > 0) {
      parts.push(`Red flags to remove: ${args.critique.redFlags.join("; ")}`)
    }
    if (args.critique.registerCapped) {
      parts.push(
        `REGISTER CAP triggered — the previous draft contained a neediness phrase. Rewrite the close in peer register; do not use "honoured to be considered", "hope to hear", or similar.`
      )
    }
    if (args.critique.weakestSentence) {
      parts.push(`Rewrite or remove this exact sentence: "${args.critique.weakestSentence}"`)
    }
    if (args.critique.genericPhrases && args.critique.genericPhrases.length > 0) {
      parts.push(
        `Replace these generic phrases with specifics: ${args.critique.genericPhrases.join(", ")}`
      )
    }
  }

  parts.push(
    `Previous draft (do NOT copy phrasing — produce a meaningfully different letter):\n${args.previousLetter}`
  )

  return runWriterAgent({
    profile: args.profile,
    resume: args.resume,
    job: args.job,
    match: args.match,
    blueprint: args.blueprint,
    examples: args.examples,
    tone: args.tone,
    rewriteFeedback: parts.join("\n\n"),
    cycleNumber: args.cycleNumber,
  })
}
