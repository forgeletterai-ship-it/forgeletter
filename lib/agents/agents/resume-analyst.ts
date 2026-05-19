import { z } from "zod"
import { MODELS, structuredCall } from "../client"
import { safeSlice } from "../utils"
import type { ResumeAnalysis } from "../types"

const ResumeAnalysisSchema = z.object({
  candidateName: z.string(),
  yearsOfExperience: z.number(),
  currentRole: z.string(),
  seniority: z.enum(["junior", "mid", "senior", "lead"]),
  topSkills: z.array(z.string()),
  measurableAchievements: z.array(z.string()),
  industries: z.array(z.string()),
  toolsAndTechnologies: z.array(z.string()),
})

const SYSTEM = `You extract structured signal from a candidate resume. Your job is comprehension, not commentary.

Rules:
- "yearsOfExperience": integer estimate from the work history. If unclear, infer conservatively.
- "seniority": junior (0-2 yr), mid (3-5 yr), senior (6-10 yr), lead (10+ yr or explicit leadership).
- "measurableAchievements": only items with concrete numbers, percentages, dollar amounts, scale, or other quantification. Up to 6. Verbatim or close paraphrase from the resume.
- "topSkills": up to 8. Skills the candidate actually used in roles, not aspirational keywords.
- "toolsAndTechnologies": named tools, frameworks, languages, platforms. Up to 12.
- Never invent. If the resume does not mention something, omit it.`

const FALLBACK: ResumeAnalysis = {
  candidateName: "Candidate",
  yearsOfExperience: 0,
  currentRole: "",
  seniority: "mid",
  topSkills: [],
  measurableAchievements: [],
  industries: [],
  toolsAndTechnologies: [],
}

export async function runResumeAnalyst(
  resumeText: string
): Promise<{ data: ResumeAnalysis; meta: CallMeta; fallback: boolean }> {
  try {
    const result = await structuredCall({
      agent: "ResumeAnalyst",
      model: MODELS.haiku,
      system: SYSTEM,
      user: `Analyze this resume:\n\n${safeSlice(resumeText, 12000)}`,
      schema: ResumeAnalysisSchema,
      schemaName: "submit_resume_analysis",
      schemaDescription: "Submit the structured analysis of the candidate's resume.",
      temperature: 0.2,
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
    console.warn("[ResumeAnalyst] falling back:", err)
    return {
      data: FALLBACK,
      meta: { modelUsed: MODELS.haiku, tokensInput: 0, tokensOutput: 0, durationMs: 0 },
      fallback: true,
    }
  }
}

export interface CallMeta {
  modelUsed: string
  tokensInput: number
  tokensOutput: number
  durationMs: number
}
