import type {
  HMCritique,
  JobAnalysis,
  MatchAnalysis,
  QualityVerdict,
  ResumeAnalysis,
  RetrievedExample,
  Tone,
  WriterOutput,
} from "../types"
import type { CallMeta } from "./resume-analyst"
import { runWriterAgent } from "./writer"

/**
 * Re-runs the Writer with explicit feedback from the Quality Gate and
 * the HM Critic. The Writer is the same agent — feedback is passed via
 * the `rewriteFeedback` field, which it injects into the user prompt
 * and shifts to lower temperature.
 */
export async function runRewriteAgent(args: {
  resume: ResumeAnalysis
  job: JobAnalysis
  match?: MatchAnalysis | null
  examples?: RetrievedExample[]
  tone: Tone
  previousLetter: string
  verdict: QualityVerdict
  critique?: HMCritique | null
}): Promise<{ data: WriterOutput; meta: CallMeta; fallback: boolean }> {
  const feedbackParts: string[] = []
  feedbackParts.push(
    `Previous draft scored ${args.verdict.score}/100. Reasoning: ${args.verdict.reasoning}`
  )
  if (args.verdict.bannedPhrasesFound.length > 0) {
    feedbackParts.push(
      `Banned phrases to remove: ${args.verdict.bannedPhrasesFound.join(", ")}`
    )
  }
  if (args.critique) {
    if (args.critique.weaknesses.length > 0) {
      feedbackParts.push(
        `Weaknesses to fix: ${args.critique.weaknesses.join("; ")}`
      )
    }
    if (args.critique.redFlags.length > 0) {
      feedbackParts.push(
        `Red flags to remove: ${args.critique.redFlags.join("; ")}`
      )
    }
    if (args.critique.improvementSuggestions.length > 0) {
      feedbackParts.push(
        `Specific changes: ${args.critique.improvementSuggestions.join("; ")}`
      )
    }
  }
  feedbackParts.push(
    `Previous draft (do NOT copy phrasing — produce a meaningfully different letter):\n${args.previousLetter}`
  )

  return runWriterAgent({
    resume: args.resume,
    job: args.job,
    match: args.match,
    examples: args.examples,
    tone: args.tone,
    rewriteFeedback: feedbackParts.join("\n\n"),
  })
}
