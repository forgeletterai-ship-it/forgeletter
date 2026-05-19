import { z } from "zod"
import { MODELS, structuredCall } from "../client"
import type { HMCritique, JobAnalysis } from "../types"
import type { CallMeta } from "./resume-analyst"

const HMCritiqueSchema = z.object({
  overallImpression: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  redFlags: z.array(z.string()),
  rewriteRecommended: z.boolean(),
  improvementSuggestions: z.array(z.string()),
})

const SYSTEM = `You are a senior hiring manager who has read 10,000 cover letters and is sick of every cliché. You read this letter the way you read every other: fast, suspicious, looking for reasons to reject.

Be specific and unsentimental. Quote phrases from the letter when calling them out.

Rules:
- "overallImpression": 1-2 sentences. Honest. Would you actually invite this candidate to a call?
- "strengths": up to 4. Specific to THIS letter, not generic ("good opening" is not specific — "the opening uses a quantified result tied to the JD's main responsibility" is).
- "weaknesses": up to 4. Vague claims, generic phrasing, missing connection to the role, etc.
- "redFlags": items that would actually get this letter set aside — clichés, AI-sounding phrases, fabricated specifics, formatting issues. Empty array if none.
- "rewriteRecommended": true if there are any red flags OR more than 2 weaknesses.
- "improvementSuggestions": concrete, actionable. "Replace the opening" not "improve the opening". Up to 4.`

const FALLBACK: HMCritique = {
  overallImpression: "Acceptable letter, no critique generated.",
  strengths: [],
  weaknesses: [],
  redFlags: [],
  rewriteRecommended: false,
  improvementSuggestions: [],
}

export async function runHMCritic(args: {
  letter: string
  job: JobAnalysis
}): Promise<{ data: HMCritique; meta: CallMeta; fallback: boolean }> {
  try {
    const result = await structuredCall({
      agent: "HMCritic",
      model: MODELS.sonnet,
      system: SYSTEM,
      user: `Job: ${args.job.jobTitle} at ${args.job.companyName}\nIndustry: ${args.job.industry}\n\nCover letter to critique:\n\n${args.letter}`,
      schema: HMCritiqueSchema,
      schemaName: "submit_hm_critique",
      schemaDescription: "Submit the hiring manager's critique of the letter.",
      temperature: 0.5,
      maxTokens: 1500,
    })
    return {
      data: result.data,
      meta: {
        modelUsed: result.modelUsed,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        durationMs: result.durationMs,
      },
      fallback: false,
    }
  } catch (err) {
    console.warn("[HMCritic] falling back:", err)
    return {
      data: FALLBACK,
      meta: { modelUsed: MODELS.sonnet, tokensInput: 0, tokensOutput: 0, durationMs: 0 },
      fallback: true,
    }
  }
}
