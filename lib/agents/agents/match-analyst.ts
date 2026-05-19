import { z } from "zod"
import { MODELS, structuredCall } from "../client"
import type { JobAnalysis, MatchAnalysis, ResumeAnalysis } from "../types"
import type { CallMeta } from "./resume-analyst"

const MatchAnalysisSchema = z.object({
  overallFit: z.number(),
  strongMatches: z.array(z.string()),
  gaps: z.array(z.string()),
  uniqueAngles: z.array(z.string()),
  recommendedOpening: z.string(),
  recommendedClosing: z.string(),
})

const SYSTEM = `You are a hiring strategist. Given a candidate analysis and a job analysis, produce a tactical brief for the cover letter writer.

Rules:
- "overallFit": integer 0-100. Honest, not flattering.
- "strongMatches": up to 6 specific overlaps — be concrete (e.g. "5 years of Postgres, JD requires 3+"). Cite numbers from the resume when available.
- "gaps": real gaps between resume and JD must-haves. Up to 4. If there are none, return [].
- "uniqueAngles": angles the candidate brings that the JD does not list but would value (e.g. domain experience, scale, multi-team coordination). Up to 3.
- "recommendedOpening": one sentence describing the strongest hook to lead with. Concrete and specific to this candidate + role. NOT a phrase like "I am writing to apply for..."
- "recommendedClosing": one sentence describing what the call to action should be. Avoid "I look forward to hearing from you."`

const FALLBACK: MatchAnalysis = {
  overallFit: 60,
  strongMatches: [],
  gaps: [],
  uniqueAngles: [],
  recommendedOpening:
    "Lead with the candidate's strongest measurable achievement that maps to the job's primary responsibility.",
  recommendedClosing:
    "Propose a concrete next step — a short conversation to walk through specific work relevant to the role.",
}

export async function runMatchAnalyst(args: {
  resume: ResumeAnalysis
  job: JobAnalysis
}): Promise<{ data: MatchAnalysis; meta: CallMeta; fallback: boolean }> {
  try {
    const result = await structuredCall({
      agent: "MatchAnalyst",
      model: MODELS.sonnet,
      system: SYSTEM,
      user: `Resume analysis:\n${JSON.stringify(args.resume, null, 2)}\n\nJob analysis:\n${JSON.stringify(args.job, null, 2)}`,
      schema: MatchAnalysisSchema,
      schemaName: "submit_match_analysis",
      schemaDescription: "Submit the strategic match analysis brief for the writer.",
      temperature: 0.4,
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
    console.warn("[MatchAnalyst] falling back:", err)
    return {
      data: FALLBACK,
      meta: { modelUsed: MODELS.sonnet, tokensInput: 0, tokensOutput: 0, durationMs: 0 },
      fallback: true,
    }
  }
}
