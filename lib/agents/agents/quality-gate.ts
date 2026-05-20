import { z } from "zod"
import { MODELS, structuredCall } from "../client"
import { clamp, detectBannedPhrases } from "../utils"
import type { HallucinationCheck, HMCritique, QualityVerdict } from "../types"
import type { CallMeta } from "./resume-analyst"

const QualityVerdictSchema = z.object({
  pass: z.boolean(),
  score: z.number(),
  reasoning: z.string(),
  bannedPhrasesFound: z.array(z.string()),
  recommendRewrite: z.boolean(),
})

const SYSTEM = `You are the final quality gate for a cover letter. Score it honestly out of 100.

Scoring rubric:
- 30 pts — opening: specific hook tied to the role, no clichés, no "I am writing to..."
- 25 pts — proof: at least two concrete achievements with numbers, scale, or named impact
- 20 pts — fit: explicit connection between the candidate's experience and the JD's main requirements
- 15 pts — close: a concrete next step, not "I look forward to hearing from you"
- 10 pts — voice: clean prose, no clichés, no AI-sounding phrasing, no banned phrases

Set "pass" = true only if score ≥ threshold (caller will tell you in the user message).
Set "recommendRewrite" = true if score < threshold AND a rewrite has a realistic chance of clearing the bar (i.e., the letter is salvageable; not gibberish).

"bannedPhrasesFound" — list any cliché/banned phrasing you spotted in the letter. Quote exactly.
"reasoning" — 2-3 sentences. Where points were lost.`

const FALLBACK: QualityVerdict = {
  pass: false,
  score: 70,
  reasoning: "Quality gate could not run; defaulting to manual review.",
  bannedPhrasesFound: [],
  recommendRewrite: true,
}

export async function runQualityGate(args: {
  letter: string
  threshold: number
  critique?: HMCritique | null
  hallucinationCheck?: HallucinationCheck | null
}): Promise<{ data: QualityVerdict; meta: CallMeta; fallback: boolean }> {
  const banned = detectBannedPhrases(args.letter)

  // If banned openings are present, fail fast without spending a model call.
  if (banned.some((b) => b.location === "opening")) {
    return {
      data: {
        pass: false,
        score: 45,
        reasoning: `Letter opens with a banned cliché: "${banned.find((b) => b.location === "opening")?.phrase}". Auto-failed before scoring.`,
        bannedPhrasesFound: banned.map((b) => b.phrase),
        recommendRewrite: true,
      },
      meta: { modelUsed: "deterministic", tokensInput: 0, tokensOutput: 0, durationMs: 0 },
      fallback: false,
    }
  }

  // If the hallucination detector flagged high risk, hard-fail.
  if (args.hallucinationCheck?.risk === "high") {
    return {
      data: {
        pass: false,
        score: 50,
        reasoning: `Hallucination detector flagged fabricated facts: ${args.hallucinationCheck.fabricatedFacts.slice(0, 2).join("; ")}. Auto-failed.`,
        bannedPhrasesFound: banned.map((b) => b.phrase),
        recommendRewrite: true,
      },
      meta: { modelUsed: "deterministic", tokensInput: 0, tokensOutput: 0, durationMs: 0 },
      fallback: false,
    }
  }

  try {
    const result = await structuredCall({
      agent: "QualityGate",
      model: MODELS.sonnet,
      system: SYSTEM,
      user: [
        `Pass threshold: ${args.threshold}`,
        args.critique
          ? `Hiring manager critique:\n${JSON.stringify(args.critique, null, 2)}`
          : null,
        args.hallucinationCheck
          ? `Hallucination check:\n${JSON.stringify(args.hallucinationCheck, null, 2)}`
          : null,
        `Letter to score:\n\n${args.letter}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      schema: QualityVerdictSchema,
      schemaName: "submit_quality_verdict",
      schemaDescription: "Submit the final quality verdict for the letter.",
      temperature: 0.2,
      maxTokens: 1200,
    })

    const score = clamp(Math.round(result.data.score), 0, 100)
    const pass = score >= args.threshold && banned.length === 0

    return {
      data: {
        ...result.data,
        score,
        pass,
        bannedPhrasesFound: dedupe([...result.data.bannedPhrasesFound, ...banned.map((b) => b.phrase)]),
      },
      meta: {
        modelUsed: result.modelUsed,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        durationMs: result.durationMs,
      },
      fallback: false,
    }
  } catch (err) {
    console.warn("[QualityGate] falling back:", err)
    return {
      data: FALLBACK,
      meta: { modelUsed: MODELS.sonnet, tokensInput: 0, tokensOutput: 0, durationMs: 0 },
      fallback: true,
    }
  }
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)]
}
