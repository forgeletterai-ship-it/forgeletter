import { z } from "zod"
import {
  experienceBlockKind,
  experienceBlockLabel,
  type ExperienceBlock,
} from "@/lib/experience-types"
import { MODELS, runAgent } from "../run-agent"
import type {
  AgentRunLog,
  PipelineProfile,
  ProfileAnalysis,
  ProfileWin,
} from "../types"

/**
 * Profile Analyst — "The Talent Assessor"
 *
 * Persona: elite recruiter who has evaluated 50,000+ candidates.
 *
 * Science: hiring research shows quantified achievements predict
 * callbacks far more reliably than duty descriptions. Apply the STAR
 * lens and an achievement-orientation score to rank provable evidence.
 *
 * Mandate (LOCKED by the blueprint):
 *   - Take ONLY the experiences the user selected in the dropdown.
 *   - Ingest EVERY win in each selected entry — never cap, sample, or
 *     merge to a "top-N". The inventory must be complete.
 *   - Unselected entries contribute nothing.
 *   - Qualifications & achievements are ALWAYS folded in separately
 *     (the "always-on" toggle), independent of the selection.
 *   - Tag each win strong (has a number) or weak (no number).
 *   - Never drop a selected win.
 *   - Never invents — only structures.
 *   - The Match Analyst, not this agent, decides featured vs supporting.
 *
 * Model: Haiku 4.5. The work is structuring known data, not reasoning
 * — Haiku handles it at ~5× cheaper cost than Sonnet.
 *
 * Fail-safe: on any LLM error, falls back to a deterministic structured
 * inventory built directly from the input — preserves every win, never
 * invents. Pipeline keeps running with reduced inferred metadata.
 */

const StructuredAnalysisSchema = z.object({
  candidateName: z.string(),
  /** Inferred from the longest-duration entry's seniority signals. */
  seniority: z.enum(["junior", "mid", "senior", "lead"]),
  /** Inferred from sector tags across selected entries. */
  industries: z.array(z.string()),
})

const SYSTEM = `You are an elite recruiter with 20+ years of experience. You assess candidates by reading their structured profile data.

CRITICAL RULES — break any and the output is rejected:
- Use ONLY the data given to you. Never invent a company, a role, a number, or a skill.
- "candidateName" — use the professional headline subject if present; otherwise "Candidate".
- "seniority" — infer from the longest-tenure entry: junior (0-2 yr total), mid (3-5 yr), senior (6-10 yr), lead (10+ yr OR explicit leadership title).
- "industries" — list the distinct sectors mentioned across selected entries. Deduplicate, lowercase, no synonyms.

Do NOT score, rank, or filter the wins themselves — that's the Match Analyst's job.
Your only output is candidateName, seniority, industries. Everything else (the full win inventory) is built deterministically from the structured input.`

type ProfileAnalystInput = {
  profile: PipelineProfile
  selectedExperienceIds: string[]
  /** Whether qualifications should be folded in (always true in
   *  production per the blueprint's "always-on" toggle). */
  alwaysIncludeQualifications: boolean
  cycleNumber?: number
}

export interface ProfileAnalystResult {
  data: ProfileAnalysis
  log: AgentRunLog
}

export async function runProfileAnalyst(
  args: ProfileAnalystInput
): Promise<ProfileAnalystResult> {
  // ── Step 1 — DETERMINISTIC win inventory ──────────────────────
  // Build the inventory from the selected entries first. This step
  // can never fail and never invents — it just structures what the
  // user already entered. The Haiku call below only fills in
  // candidateName + seniority + industries.

  const selectedSet = new Set(args.selectedExperienceIds)
  const selectedBlocks = args.profile.experienceBlocks.filter((b) =>
    selectedSet.has(b.id)
  )

  const wins: ProfileWin[] = []
  for (const block of selectedBlocks) {
    const entryLabel = experienceBlockLabel(block)
    const entryType = block.type
    // For each block ingest EVERY achievement row. Strong wins
    // (col1 = number) first, then weak (no number) — within the
    // block. Cross-block order preserves the user's profile order.
    const strong: ProfileWin[] = []
    const weak: ProfileWin[] = []
    for (const a of block.achievements) {
      const what = (a.col0 || "").trim()
      const number = (a.col1 || "").trim()
      const whyItMattered = (a.col2 || "").trim()
      if (!what && !number && !whyItMattered) continue // skip empty rows
      const win: ProfileWin = {
        id: `${block.id}:${a.id}`,
        what: what || "(no statement provided)",
        number,
        whyItMattered,
        entryLabel,
        entryId: block.id,
        entryType,
        strength: number ? "strong" : "weak",
      }
      ;(number ? strong : weak).push(win)
    }
    wins.push(...strong, ...weak)
  }

  // Always-on qualifications folded in as virtual "qualifications"
  // wins. They never come from a specific entry, so we mark them
  // accordingly and use a stable winId prefix so HallucinationCheck
  // can map back to them.
  const qualificationsText = args.alwaysIncludeQualifications
    ? collectQualificationsText(args.profile)
    : ""
  if (qualificationsText) {
    wins.push({
      id: "qualifications:all",
      what: qualificationsText,
      number: "",
      whyItMattered: "Always-included qualifications block",
      entryLabel: "Qualifications & achievements",
      entryId: "qualifications",
      entryType: "qualifications",
      strength: "weak",
    })
  }

  const skills = dedupeSkills(args.profile.strengths || "")

  // ── Step 2 — Haiku call for inferred fields only ─────────────
  const userPrompt = buildUserPrompt(
    args.profile,
    selectedBlocks,
    qualificationsText
  )

  const result = await runAgent({
    agent: "ProfileAnalyst",
    model: MODELS.haiku,
    cycleNumber: args.cycleNumber ?? 0,
    system: SYSTEM,
    user: userPrompt,
    schema: StructuredAnalysisSchema,
    schemaName: "submit_profile_inference",
    schemaDescription:
      "Submit the candidate name, seniority, and industries inferred from the structured profile.",
    fallback: {
      candidateName: "Candidate",
      seniority: inferSeniorityFallback(selectedBlocks),
      industries: inferIndustriesFallback(selectedBlocks),
    },
    maxTokens: 400,
    temperature: 0.1,
    timeoutMs: 25_000,
  })

  return {
    data: {
      candidateName: result.data.candidateName || "Candidate",
      seniority: result.data.seniority,
      industries: dedupeIndustries(result.data.industries),
      wins,
      qualifications: qualificationsText,
      skills,
    },
    log: result.log,
  }
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function buildUserPrompt(
  profile: PipelineProfile,
  selected: ExperienceBlock[],
  qualifications: string
): string {
  const parts: string[] = []
  if (profile.professionalHeadline) {
    parts.push(`Professional headline: ${profile.professionalHeadline}`)
  }
  parts.push(
    `Selected experiences (${selected.length}) — these are the ONLY entries to consider:`
  )
  for (const block of selected) {
    parts.push(
      `- [${experienceBlockKind(block)}] ${experienceBlockLabel(block)}` +
        (block.duration ? ` (${block.duration})` : "") +
        (block.sector ? ` · ${block.sector}` : "") +
        (block.size ? ` · ${block.size}` : "")
    )
  }
  if (qualifications) {
    parts.push(`Qualifications & achievements (always-on):\n${qualifications}`)
  }
  parts.push(
    "Infer ONLY: candidateName (from headline subject), seniority, industries."
  )
  return parts.join("\n\n")
}

function collectQualificationsText(profile: PipelineProfile): string {
  const bits: string[] = []
  if (profile.qualifications) bits.push(profile.qualifications.trim())
  if (profile.strengths) bits.push(`Skills & tools: ${profile.strengths.trim()}`)
  if (profile.notes) bits.push(`Notes: ${profile.notes.trim()}`)
  if (profile.keyAchievements && bits.length === 0)
    bits.push(profile.keyAchievements.trim())
  return bits.join("\n").trim()
}

function dedupeSkills(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
    )
  )
}

function dedupeIndustries(input: string[]): string[] {
  return Array.from(new Set(input.map((i) => i.trim().toLowerCase()).filter(Boolean)))
}

function inferSeniorityFallback(
  blocks: ExperienceBlock[]
): ProfileAnalysis["seniority"] {
  const text = blocks
    .map(
      (b) =>
        `${b.title || ""} ${b.role || ""} ${b.duration || ""}`
    )
    .join(" ")
    .toLowerCase()
  if (/(lead|head|director|vp|chief)/.test(text)) return "lead"
  if (/senior|sr\./.test(text)) return "senior"
  if (/intern|junior|jr\./.test(text)) return "junior"
  return "mid"
}

function inferIndustriesFallback(blocks: ExperienceBlock[]): string[] {
  return Array.from(
    new Set(
      blocks
        .map((b) => (b.sector || "").trim().toLowerCase())
        .filter(Boolean)
    )
  )
}
