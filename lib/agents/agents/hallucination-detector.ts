import { z } from "zod"
import { MODELS, structuredCall } from "../client"
import { safeSlice } from "../utils"
import type { HallucinationCheck } from "../types"
import type { CallMeta } from "./resume-analyst"

const HallucinationCheckSchema = z.object({
  risk: z.enum(["none", "low", "medium", "high"]),
  unverifiedClaims: z.array(z.string()),
  fabricatedFacts: z.array(z.string()),
})

const SYSTEM = `You verify that every concrete claim in a cover letter is grounded in the candidate's resume. Your only sources of truth are the resume text and the job description — nothing else.

For each specific claim in the letter (numbers, named projects, technologies, durations, scale, employers, certifications, achievements), classify it:
- VERIFIED: the resume supports it (verbatim or close paraphrase). Do not list these.
- UNVERIFIED: cannot be confirmed from the resume but is plausible (e.g. an interest, opinion, soft skill).
- FABRICATED: a specific claim that contradicts or is absent from the resume (e.g. "led a team of 20" when resume shows IC role; a programming language not on the resume).

Output:
- "risk":
  - "none" — no unverified or fabricated claims
  - "low" — only unverified soft claims (interests, opinions)
  - "medium" — unverified hard claims (numbers/tools/scope not in resume)
  - "high" — fabricated facts that contradict the resume
- "unverifiedClaims": up to 5 specific quotes from the letter that are unverified.
- "fabricatedFacts": up to 5 specific quotes that contradict the resume. Empty if none.

Be strict — false positives are better than false negatives. Quote the letter verbatim when calling out a claim.`

const FALLBACK: HallucinationCheck = {
  risk: "low",
  unverifiedClaims: [],
  fabricatedFacts: [],
}

export async function runHallucinationDetector(args: {
  letter: string
  resumeText: string
  jobDescription: string
}): Promise<{ data: HallucinationCheck; meta: CallMeta; fallback: boolean }> {
  try {
    const result = await structuredCall({
      agent: "HallucinationDetector",
      model: MODELS.sonnet,
      system: SYSTEM,
      user: `Resume (source of truth):\n${safeSlice(args.resumeText, 8000)}\n\nJob description (context):\n${safeSlice(args.jobDescription, 6000)}\n\nLetter to verify:\n\n${args.letter}`,
      schema: HallucinationCheckSchema,
      schemaName: "submit_hallucination_check",
      schemaDescription: "Submit the grounding check for the cover letter.",
      temperature: 0.1,
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
    console.warn("[HallucinationDetector] falling back:", err)
    return {
      data: FALLBACK,
      meta: { modelUsed: MODELS.sonnet, tokensInput: 0, tokensOutput: 0, durationMs: 0 },
      fallback: true,
    }
  }
}
