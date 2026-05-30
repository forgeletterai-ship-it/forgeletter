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

/**
 * Tolerant string-array field. The model occasionally returns a single
 * comma/semicolon-delimited string (or omits the field) instead of a
 * JSON array. Coerce both shapes so a cosmetic format slip never forces
 * a whole-agent fallback — which would silently discard the JD analysis
 * the rest of the pipeline (Writer, ATS, HM Critic) depends on.
 */
const flexibleStringArray = () =>
  z.preprocess((v) => {
    if (Array.isArray(v)) return v
    if (typeof v === "string") {
      return v
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
    }
    if (v == null) return []
    return v
  }, z.array(z.string()))

const JobAnalysisSchema = z.object({
  jobTitle: z.string(),
  companyName: z.string(),
  industry: z.string(),
  seniorityRequired: z.enum(["junior", "mid", "senior", "lead"]),
  mustHaveSkills: flexibleStringArray(),
  niceToHaveSkills: flexibleStringArray(),
  keyResponsibilities: flexibleStringArray(),
  companyValues: flexibleStringArray(),
  atsKeywords: flexibleStringArray(),
  /** EXACTLY the top 5 hiring-manager priorities in primacy order.
   *  Cap is enforced both in the prompt and in code post-validation
   *  so the HM Critic's Relevance dimension has a stable
   *  denominator ("X of 5 priorities addressed"). */
  hiringManagerPriorities: flexibleStringArray(),
  /** Culture signals — vocabulary tells, value statements. */
  cultureSignals: flexibleStringArray(),
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
- "hiringManagerPriorities" — return EXACTLY the TOP 5, ranked by primacy + frequency. Look at: which requirements appear first, which terms repeat, which sentences carry intent verbs ("you will own…", "you will drive…"). Phrase each as a short noun phrase ("data-driven decision making", "stakeholder communication", "ownership of revenue numbers"). Return exactly 5 entries. If the JD genuinely only signals 3 or 4 priorities, repeat the most-emphasised one or pad with the next-most-emphasised — the downstream HM Critic uses "addressed N of 5" as the Relevance score, so a stable denominator matters.
- "cultureSignals" — vocabulary tells beyond explicit values. Tone words ("scrappy", "fast-paced", "rigorous"), pronoun choices ("we move fast", "you'll lead"), and any clues about working style. Empty array if the JD is purely transactional.
- "recommendedTone" — choose ONE of professional / confident / warm / concise based on the JD's own vocabulary:
    • professional — formal, corporate, conservative vocabulary (banks, law, healthcare)
    • confident — bold, ownership-heavy, results-oriented (high-growth tech, sales leadership)
    • warm — relationship-driven, mission-driven, people-centered (NGOs, healthcare, education)
    • concise — terse, technical, no-fluff (developer-tools, infra, deep tech)

Your output drives every downstream agent. Be precise.`

type JobAnalysisFull = z.infer<typeof JobAnalysisSchema>

const FALLBACK_JOB_ANALYST: JobAnalysisFull = {
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
    fallback: FALLBACK_JOB_ANALYST,
    maxTokens: 1200,
    temperature: 0.1,
    timeoutMs: 30_000,
  })

  // Honour caller-provided overrides (form headers) over inferred values.
  // hiringManagerPriorities is hard-capped at 5 in code so the HM
  // Critic's Relevance score has a stable denominator regardless of
  // whether the model produced 4, 5, 6, or more.
  const data: JobAnalysis = {
    ...result.data,
    jobTitle: args.jobTitle?.trim() || result.data.jobTitle,
    companyName: args.companyName?.trim() || result.data.companyName,
    hiringManagerPriorities: capPriorities(result.data.hiringManagerPriorities),
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

/**
 * Stable-denominator guarantee for the HM Critic's Relevance dimension.
 * Returns exactly 5 priorities — trims overflow, pads from the most
 * emphasised entry when the model returned fewer, returns the canonical
 * "no JD signal" sentinels when the array was empty.
 */
function capPriorities(raw: string[]): string[] {
  const cleaned = raw
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .slice(0, 5)
  if (cleaned.length === 5) return cleaned
  if (cleaned.length === 0) {
    return [
      "role relevance",
      "demonstrated competency",
      "communication quality",
      "evidence of impact",
      "cultural alignment",
    ]
  }
  // Pad by repeating the strongest entry first, then the next-strongest.
  // This is the prompt's "if the JD only signals 3, pad with the most-
  // emphasised one" rule, enforced in code so the denominator is always 5.
  const padded = [...cleaned]
  while (padded.length < 5) {
    padded.push(cleaned[padded.length % cleaned.length])
  }
  return padded
}
