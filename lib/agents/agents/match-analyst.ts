import { z } from "zod"
import { MODELS, runAgent } from "../run-agent"
import type {
  AgentRunLog,
  JobAnalysis,
  MatchAnalysis,
  MatchBlueprint,
  ProfileAnalysis,
  ResumeAnalysis,
} from "../types"
import type { CallMeta } from "./resume-analyst"

/**
 * Match Analyst — "The Gold-Blueprint Extractor"
 *
 * Runs on EVERY paid tier per the blueprint. Decides:
 *   1. Which structural arc (hook style + section sequence) suits
 *      this candidate × this JD.
 *   2. Which wins are FEATURED (proof-driving, lead) vs SUPPORTING
 *      (context, mentioned briefly).
 *
 * Inputs:
 *   - ProfileAnalysis (preferred) or legacy ResumeAnalysis. The
 *     analyst respects every win the user selected — it ranks but
 *     NEVER drops a win.
 *   - JobAnalysis with hiringManagerPriorities + cultureSignals.
 *   - Optional: retrieved gold examples (structure only; the
 *     analyst lifts ARC, not language).
 *
 * Output (new MatchBlueprint shape):
 *   - hookStyle: short phrase ("metric-led", "story-first",
 *     "mission-bridge", "credential-anchored")
 *   - sections: ordered list of hook|proof|fit|close with
 *     direction note and winIdsFeatured
 *   - featuredWinIds / supportingWinIds: split of every input win
 *   - recommendedOpening / recommendedClosing: one-line strategy
 *
 * Legacy MatchAnalysis fields are populated in the return for
 * backwards-compat until the orchestrator migrates.
 *
 * Model: Sonnet 4.6. Strategy + ranking calls for the stronger
 * model — Haiku tends to flatten priority order on long inputs.
 */

const MatchBlueprintSchema = z.object({
  hookStyle: z.string(),
  sections: z.array(
    z.object({
      purpose: z.enum(["hook", "proof", "fit", "close"]),
      direction: z.string(),
      winIdsFeatured: z.array(z.string()),
    })
  ),
  featuredWinIds: z.array(z.string()),
  supportingWinIds: z.array(z.string()),
  recommendedOpening: z.string(),
  recommendedClosing: z.string(),
  // Legacy MatchAnalysis fields (kept so the orchestrator can still
  // consume the old shape during the migration).
  overallFit: z.number(),
  strongMatches: z.array(z.string()),
  gaps: z.array(z.string()),
  uniqueAngles: z.array(z.string()),
})

type MatchBlueprintFull = z.infer<typeof MatchBlueprintSchema>

const SYSTEM = `You are a hiring strategist building the structural BLUEPRINT for a cover letter. The Writer agent will follow your blueprint exactly.

CRITICAL RULES:
- Work ONLY from the wins the user already provided. Never invent a win, employer, or number.
- Every winId provided as input MUST appear in either featuredWinIds OR supportingWinIds — never drop one.
- "featuredWinIds" — wins that will be expanded with full sentences. Up to 4. Choose the strongest (number-heavy) wins that map most directly to the job's top hiring-manager priorities.
- "supportingWinIds" — every remaining winId, in priority order. The Writer may name-drop these briefly.
- "hookStyle" — one of: "metric-led", "story-first", "mission-bridge", "credential-anchored", "domain-bridge". Pick what plays best to this JD's culture signals.
- "sections" — exactly four entries in order: hook, proof, fit, close. For each: direction note (1 short sentence on what the section should accomplish) + winIdsFeatured (which featured wins anchor this section; can be empty for hook/close).
- "recommendedOpening" — one concrete sentence describing the strongest opening. Specific to this candidate × role. NEVER "I am writing to apply for…".
- "recommendedClosing" — one sentence describing a concrete next step. NEVER "I look forward to hearing from you."
- Legacy fields:
    - "overallFit" 0-100 integer, honest not flattering.
    - "strongMatches" up to 6 concrete overlaps (cite resume numbers).
    - "gaps" up to 4 honest gaps; [] if none.
    - "uniqueAngles" up to 3 angles the JD doesn't list but would value.

You honour the user's selection silently — never tell the writer "we dropped X". Order is your tool, omission is forbidden.`

const FALLBACK: MatchBlueprintFull = {
  hookStyle: "metric-led",
  sections: [
    { purpose: "hook", direction: "Lead with the strongest quantified win.", winIdsFeatured: [] },
    { purpose: "proof", direction: "Two concrete wins mapped to the JD's top priorities.", winIdsFeatured: [] },
    { purpose: "fit", direction: "One sentence on cultural / values alignment.", winIdsFeatured: [] },
    { purpose: "close", direction: "Propose a concrete next step.", winIdsFeatured: [] },
  ],
  featuredWinIds: [],
  supportingWinIds: [],
  recommendedOpening:
    "Lead with the candidate's strongest measurable achievement mapped to the job's primary responsibility.",
  recommendedClosing:
    "Propose a concrete next step — a short conversation to walk through specific work relevant to the role.",
  overallFit: 60,
  strongMatches: [],
  gaps: [],
  uniqueAngles: [],
}

export interface MatchAnalystResult {
  /** Legacy MatchAnalysis shape — used by old orchestrator. */
  data: MatchAnalysis
  /** New MatchBlueprint shape — used by rewritten orchestrator + Writer. */
  blueprint: MatchBlueprint
  log: AgentRunLog
  /** @deprecated Use `log`. */
  meta: CallMeta
  /** @deprecated Use `log.fallbackTriggered`. */
  fallback: boolean
}

export async function runMatchAnalyst(args: {
  /** Preferred input — provides per-win ids. */
  profile?: ProfileAnalysis
  /** Legacy input — used until orchestrator migrates to ProfileAnalysis. */
  resume?: ResumeAnalysis
  job: JobAnalysis
  cycleNumber?: number
}): Promise<MatchAnalystResult> {
  // Build the analyst-readable summary of the candidate. Prefer
  // the new ProfileAnalysis shape with explicit win ids; fall back
  // to the legacy resume analysis if that's all the orchestrator
  // currently provides.
  const candidateBlock = args.profile
    ? renderProfileForAnalyst(args.profile)
    : renderResumeForAnalyst(args.resume!)

  const jobBlock = renderJobForAnalyst(args.job)

  const result = await runAgent({
    agent: "MatchAnalyst",
    model: MODELS.sonnet,
    cycleNumber: args.cycleNumber ?? 0,
    system: SYSTEM,
    user: `${candidateBlock}\n\n${jobBlock}`,
    schema: MatchBlueprintSchema,
    schemaName: "submit_match_blueprint",
    schemaDescription:
      "Submit the structural blueprint for the cover letter, including featured vs supporting win ids.",
    fallback: FALLBACK,
    maxTokens: 1800,
    temperature: 0.3,
    timeoutMs: 30_000,
  })

  // Guarantee no win was dropped — if the model omitted one,
  // append it to supportingWinIds. Honour-selection-silently rule.
  const allWinIds = args.profile?.wins.map((w) => w.id) ?? []
  const used = new Set([
    ...result.data.featuredWinIds,
    ...result.data.supportingWinIds,
  ])
  const missing = allWinIds.filter((id) => !used.has(id))
  const supportingWinIds = [...result.data.supportingWinIds, ...missing]

  const blueprint: MatchBlueprint = {
    hookStyle: result.data.hookStyle,
    sections: result.data.sections,
    featuredWinIds: result.data.featuredWinIds,
    supportingWinIds,
    recommendedOpening: result.data.recommendedOpening,
    recommendedClosing: result.data.recommendedClosing,
  }

  const data: MatchAnalysis = {
    overallFit: clamp(result.data.overallFit, 0, 100),
    strongMatches: result.data.strongMatches,
    gaps: result.data.gaps,
    uniqueAngles: result.data.uniqueAngles,
    recommendedOpening: result.data.recommendedOpening,
    recommendedClosing: result.data.recommendedClosing,
  }

  return {
    data,
    blueprint,
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

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, Math.round(n)))
}

function renderProfileForAnalyst(p: ProfileAnalysis): string {
  const lines: string[] = []
  lines.push(`Candidate: ${p.candidateName} · ${p.seniority} · ${p.industries.join(", ") || "—"}`)
  if (p.skills.length) lines.push(`Skills: ${p.skills.join(", ")}`)
  lines.push("")
  lines.push(`Wins (${p.wins.length}) — EVERY one must be placed (featured or supporting):`)
  for (const w of p.wins) {
    const num = w.number ? ` [${w.number}]` : ""
    const why = w.whyItMattered ? ` — ${w.whyItMattered}` : ""
    lines.push(`  · [${w.id}] (${w.strength}) ${w.what}${num}${why}  ⟵ from "${w.entryLabel}"`)
  }
  if (p.qualifications) {
    lines.push("")
    lines.push(`Qualifications (always included):\n${p.qualifications}`)
  }
  return lines.join("\n")
}

function renderResumeForAnalyst(r: ResumeAnalysis): string {
  const lines: string[] = []
  lines.push(`Candidate: ${r.candidateName} · ${r.seniority} · ${r.industries.join(", ") || "—"}`)
  lines.push(`Years of experience: ${r.yearsOfExperience}`)
  lines.push(`Current role: ${r.currentRole}`)
  lines.push(`Top skills: ${r.topSkills.join(", ")}`)
  lines.push(`Tools & tech: ${r.toolsAndTechnologies.join(", ")}`)
  if (r.measurableAchievements.length) {
    lines.push("")
    lines.push("Measurable achievements (no per-win ids available — legacy input):")
    for (const a of r.measurableAchievements) lines.push(`  · ${a}`)
  }
  return lines.join("\n")
}

function renderJobForAnalyst(j: JobAnalysis): string {
  const lines: string[] = []
  lines.push(`Role: ${j.jobTitle} at ${j.companyName} · ${j.industry} · seniority: ${j.seniorityRequired}`)
  lines.push(`Must-have: ${j.mustHaveSkills.join(", ")}`)
  if (j.niceToHaveSkills.length) lines.push(`Nice-to-have: ${j.niceToHaveSkills.join(", ")}`)
  if (j.keyResponsibilities.length) lines.push(`Responsibilities: ${j.keyResponsibilities.join("; ")}`)
  if (j.hiringManagerPriorities?.length) {
    lines.push(`Hiring-manager priorities (ranked): ${j.hiringManagerPriorities.join(" → ")}`)
  }
  if (j.companyValues.length) lines.push(`Company values: ${j.companyValues.join(", ")}`)
  if (j.cultureSignals?.length) lines.push(`Culture signals: ${j.cultureSignals.join(", ")}`)
  if (j.recommendedTone) lines.push(`Recommended tone: ${j.recommendedTone}`)
  return lines.join("\n")
}
