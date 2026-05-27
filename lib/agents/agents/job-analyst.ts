import { z } from "zod"
import { MODELS, runAgent } from "../run-agent"
import { safeSlice } from "../utils"
import type { AgentRunLog, JobAnalysis } from "../types"
import type { CallMeta } from "./resume-analyst"

/**
 * Job Analyst — "The Decoder"
 *
 * Persona: a senior hiring manager who has written and reviewed
 * thousands of JDs. Reads beneath the surface to surface the
 * SIGNAL: what the role actually rewards, in what order.
 *
 * Science (per the Definitive Engine Blueprint):
 *   - Primacy effect: requirements listed first weigh more in
 *     hiring-manager evaluation. The analyst preserves order.
 *   - Frequency effect: terms repeated across the JD signal a
 *     genuine priority — not just window dressing.
 *   - Culture signals: explicit values, vocabulary tells (e.g.
 *     "scrappy", "ownership") shape tone and language choice.
 *   - Recommended tone: derived from the JD's own vocabulary, not
 *     a static default.
 *
 * Model: Sonnet 4.6. Job analysis is reasoning, not extraction —
 * the hiring-manager-priority ranking + tone inference benefit
 * from the higher-capability model.
 *
 * All tiers: this output is consumed by Match Analyst, Writer,
 * ATSAgent, and (Ultra) HM Critic. Every paid plan runs it.
 *
 * Fail-safe: typed FALLBACK if every retry fails — orchestrator
 * continues with empty priorities + neutral tone rather than
 * crashing.
 */

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
  /** Up to 6 hiring-manager priorities in primacy order. */
  hiringManagerPriorities: z.array(z.string()),
  /** Culture signals — vocabulary tells, value statements. */
  cultureSignals: z.array(z.string()),
  /** Tone inferred from the JD's own vocabulary. */
  recommendedTone: z.enum(["professional", "confident", "warm", "concise"]),
})

const SYSTEM = `You are a senior hiring manager decoding a job description for a downstream cover-letter pipeline.

CRITICAL RULES — break any and the output is rejected:
- Use ONLY information present in the JD. Do not invent company facts, salary, or location.
- "jobTitle" and "companyName" — use what the JD states; if a header is provided in the user message it overrides.
- "industry" — one-word sector tag (fintech, edtech, biotech, gaming, etc.). Best inference if not stated.
- "seniorityRequired" — junior / mid / senior / lead. Default to mid only if no signal is present.
- "mustHaveSkills" (up to 8) — requirements the JD marks required / must-have. Order matters; preserve the JD's order.
- "niceToHaveSkills" (up to 8) — preferred / bonus / nice-to-have.
- "keyResponsibilities" (up to 6) — close-to-verbatim responsibility bullets.
- "atsKeywords" (up to 15) — exact tool/skill nouns an ATS would scan for. Lowercase, single words or short phrases. Deduplicate.
- "companyValues" — explicit value words (ownership, customer-obsessed, scrappy, integrity, etc.). Empty if none surface.
- "hiringManagerPriorities" (up to 6) — what the hiring manager will actually FILTER FOR, ranked by primacy + frequency. Look at: which requirements appear first, which terms repeat, which sentences carry intent verbs ("you will own…", "you will drive…"). Phrase each as a short noun phrase ("data-driven decision making", "stakeholder communication", "ownership of revenue numbers").
- "cultureSignals" — vocabulary tells beyond explicit values. Tone words ("scrappy", "fast-paced", "rigorous"), pronoun choices ("we move fast", "you'll lead"), and any clues about working style. Empty array if the JD is purely transactional.
- "recommendedTone" — choose ONE of professional / confident / warm / concise based on the JD's own vocabulary:
    • professional — formal, corporate, conservative vocabulary (banks, law, healthcare)
    • confident — bold, ownership-heavy, results-oriented (high-growth tech, sales leadership)
    • warm — relationship-driven, mission-driven, people-centered (NGOs, healthcare, education)
    • concise — terse, technical, no-fluff (developer-tools, infra, deep tech)

Your output drives every downstream agent. Be precise.`

type JobAnalysisFull = z.infer<typeof JobAnalysisSchema>

const FALLBACK: JobAnalysisFull = {
  jobTitle: "",
  companyName: "",
  industry: "",
  seniorityRequired: "mid",
  mustHaveSkills: [],
  niceToHaveSkills: [],
  keyResponsibilities: [],
  companyValues: [],
  atsKeywords: [],
  hiringManagerPriorities: [],
  cultureSignals: [],
  recommendedTone: "professional",
}

export interface JobAnalystResult {
  data: JobAnalysis
  log: AgentRunLog
  /** @deprecated Use `log`. Kept until orchestrator migration completes. */
  meta: CallMeta
  /** @deprecated Use `log.fallbackTriggered`. */
  fallback: boolean
}

export async function runJobAnalyst(args: {
  jobDescription: string
  jobTitle?: string
  companyName?: string
  cycleNumber?: number
}): Promise<JobAnalystResult> {
  const userMsg = [
    args.jobTitle ? `Job title (provided): ${args.jobTitle}` : null,
    args.companyName ? `Company (provided): ${args.companyName}` : null,
    `Job description:\n\n${safeSlice(args.jobDescription, 12000)}`,
  ]
    .filter(Boolean)
    .join("\n")

  const result = await runAgent({
    agent: "JobAnalyst",
    model: MODELS.sonnet,
    cycleNumber: args.cycleNumber ?? 0,
    system: SYSTEM,
    user: userMsg,
    schema: JobAnalysisSchema,
    schemaName: "submit_job_analysis",
    schemaDescription:
      "Submit the structured analysis of the job description, including hiring-manager priorities and recommended tone.",
    fallback: FALLBACK,
    maxTokens: 1200,
    temperature: 0.1,
    timeoutMs: 30_000,
  })

  // Honour caller-provided overrides (form headers) over inferred values.
  const data: JobAnalysis = {
    ...result.data,
    jobTitle: args.jobTitle?.trim() || result.data.jobTitle,
    companyName: args.companyName?.trim() || result.data.companyName,
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
