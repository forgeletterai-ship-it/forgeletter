import { z } from "zod"
import { MODELS, structuredCall } from "../client"
import { safeSlice } from "../utils"
import type { JobAnalysis } from "../types"
import type { CallMeta } from "./resume-analyst"

const JobAnalysisSchema = z.object({
  jobTitle: z.string(),
  companyName: z.string(),
  industry: z.string(),
  seniorityRequired: z.enum(["junior", "mid", "senior", "lead"]),
  mustHaveSkills: z.array(z.string()),
  niceToHaveSkills: z.array(z.string()),
  keyResponsibilities: z.array(z.string()),
  companyValues: z.array(z.string()),
  atsKeywords: z.array(z.string()),
})

const SYSTEM = `You extract structured requirements from a job description. Be precise.

Rules:
- "mustHaveSkills": only requirements the JD explicitly marks as required, must-have, or required. Up to 8.
- "niceToHaveSkills": nice-to-have / preferred / bonus items. Up to 8.
- "keyResponsibilities": up to 6 bullet-form responsibilities, close to verbatim.
- "atsKeywords": exact terms an ATS would scan for — skill nouns, tool names, certifications, methodologies. Up to 15. Single words or short phrases. Lowercase.
- "companyValues": cultural signals from the JD (move fast, customer obsessed, ownership, etc.). Empty array if none surface.
- "seniorityRequired": junior / mid / senior / lead. Default to mid if the JD does not specify a level.
- Use values from the input where given. Do not invent a company name or job title.`

const FALLBACK: JobAnalysis = {
  jobTitle: "",
  companyName: "",
  industry: "",
  seniorityRequired: "mid",
  mustHaveSkills: [],
  niceToHaveSkills: [],
  keyResponsibilities: [],
  companyValues: [],
  atsKeywords: [],
}

export async function runJobAnalyst(args: {
  jobDescription: string
  jobTitle?: string
  companyName?: string
}): Promise<{ data: JobAnalysis; meta: CallMeta; fallback: boolean }> {
  try {
    const userMsg = [
      args.jobTitle ? `Job title: ${args.jobTitle}` : null,
      args.companyName ? `Company: ${args.companyName}` : null,
      `Job description:\n\n${safeSlice(args.jobDescription, 12000)}`,
    ]
      .filter(Boolean)
      .join("\n")

    const result = await structuredCall({
      agent: "JobAnalyst",
      model: MODELS.haiku,
      system: SYSTEM,
      user: userMsg,
      schema: JobAnalysisSchema,
      schemaName: "submit_job_analysis",
      schemaDescription: "Submit the structured analysis of the job description.",
      temperature: 0.2,
    })
    return {
      data: {
        ...result.data,
        jobTitle: args.jobTitle?.trim() || result.data.jobTitle,
        companyName: args.companyName?.trim() || result.data.companyName,
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
    console.warn("[JobAnalyst] falling back:", err)
    return {
      data: { ...FALLBACK, jobTitle: args.jobTitle || "", companyName: args.companyName || "" },
      meta: { modelUsed: MODELS.haiku, tokensInput: 0, tokensOutput: 0, durationMs: 0 },
      fallback: true,
    }
  }
}
