import type { ExperienceBlock } from "@/lib/experience-types"

export type Tier = "free" | "starter" | "pro" | "ultra"

export type Tone = "professional" | "confident" | "warm" | "concise"

// ─────────────────────────────────────────────────────────────────
// PIPELINE INPUT (BLUEPRINT)
// Structured profile + selected experience IDs + always-included
// qualifications. Replaces the free-form `resumeText` blob.
// ─────────────────────────────────────────────────────────────────

export interface PipelineProfile {
  /** One-line headline e.g. "Senior Product Designer · 8 yrs · Fintech". */
  professionalHeadline?: string
  /** Free-form qualifications + certifications block (always included). */
  qualifications?: string
  /** Free-form skills/tools (always included). */
  strengths?: string
  /** Free-form additional notes (always included). */
  notes?: string
  /** Free-form legacy achievements fallback (used only if blocks empty). */
  keyAchievements?: string
  /** All experience blocks the user has saved. */
  experienceBlocks: ExperienceBlock[]
}

export interface PipelineInput {
  profile: PipelineProfile
  /** Subset of profile.experienceBlocks the user ticked in the
   *  Draft Inputs dropdown. Pipeline NEVER references entries
   *  outside this set. */
  selectedExperienceIds: string[]
  /** Always true per blueprint — qualifications row is forced-on
   *  in the UI. Kept explicit so the contract is self-documenting. */
  alwaysIncludeQualifications: boolean
  jobDescription: string
  targetRole?: string
  companyName?: string
  tone?: Tone
  tier: Tier
  userId: string
  generationId: string
}

/** Legacy free-text input kept during migration. The orchestrator
 *  derives the new PipelineInput from this until /api/generate is
 *  updated to send the structured shape. */
export interface LegacyPipelineInput {
  resumeText: string
  jobDescription: string
  jobTitle?: string
  companyName?: string
  tone?: Tone
  tier: Tier
  userId: string
  generationId: string
}

// ─────────────────────────────────────────────────────────────────
// PROFILE ANALYST OUTPUT (blueprint replacement for ResumeAnalyst)
// ─────────────────────────────────────────────────────────────────

export interface ProfileWin {
  /** Stable id so other agents can reference back. */
  id: string
  /** The achievement statement itself. */
  what: string
  /** Quantification (number, %, scale). Empty for weak wins. */
  number: string
  /** Optional "why it mattered" context. */
  whyItMattered: string
  /** Source entry's display label. */
  entryLabel: string
  /** Source entry's stable id. */
  entryId: string
  entryType: "employer" | "internship" | "university" | "qualifications"
  /** "strong" if `number` is non-empty, otherwise "weak". */
  strength: "strong" | "weak"
}

export interface ProfileAnalysis {
  candidateName: string
  seniority: "junior" | "mid" | "senior" | "lead"
  industries: string[]
  /** All wins, in order, with NO sampling. */
  wins: ProfileWin[]
  /** Always-included qualifications text, kept separate from wins. */
  qualifications: string
  /** Always-included skills/tools, deduped. */
  skills: string[]
}

/** @deprecated Use ProfileAnalysis. Kept until ResumeAnalyst is removed. */
export interface ResumeAnalysis {
  candidateName: string
  yearsOfExperience: number
  currentRole: string
  seniority: "junior" | "mid" | "senior" | "lead"
  topSkills: string[]
  measurableAchievements: string[]
  industries: string[]
  toolsAndTechnologies: string[]
}

// ─────────────────────────────────────────────────────────────────
// JOB ANALYST OUTPUT
// Existing shape kept; blueprint additions are optional so existing
// code continues to compile until job-analyst is refactored.
// ─────────────────────────────────────────────────────────────────

export interface JobAnalysis {
  jobTitle: string
  companyName: string
  industry: string
  seniorityRequired: "junior" | "mid" | "senior" | "lead"
  mustHaveSkills: string[]
  niceToHaveSkills: string[]
  keyResponsibilities: string[]
  companyValues: string[]
  atsKeywords: string[]
  /** Ranked hiring-manager priorities (primacy-effect ordering).
   *  Added per blueprint; optional during migration. */
  hiringManagerPriorities?: string[]
  /** Culture signals — added per blueprint, optional during migration. */
  cultureSignals?: string[]
  /** Recommended tone — added per blueprint, optional during migration. */
  recommendedTone?: Tone
}

// ─────────────────────────────────────────────────────────────────
// MATCH ANALYST OUTPUT
// Two shapes coexist during migration: old MatchAnalysis (free-form)
// and new MatchBlueprint (gold-derived structured blueprint).
// ─────────────────────────────────────────────────────────────────

/** @deprecated Use MatchBlueprint. */
export interface MatchAnalysis {
  overallFit: number
  strongMatches: string[]
  gaps: string[]
  uniqueAngles: string[]
  recommendedOpening: string
  recommendedClosing: string
}

export interface MatchBlueprint {
  hookStyle: string
  sections: Array<{
    purpose: "hook" | "proof" | "fit" | "close"
    direction: string
    winIdsFeatured: string[]
  }>
  featuredWinIds: string[]
  supportingWinIds: string[]
  recommendedOpening: string
  recommendedClosing: string
}

// ─────────────────────────────────────────────────────────────────
// EXAMPLE RETRIEVAL OUTPUT (unchanged from prior batch)
// ─────────────────────────────────────────────────────────────────

export interface RetrievedExample {
  id: string
  industry: string
  role: string
  excerpt: string
  whyItWorks: string | null
  qualityScore: number
  source: "curated" | "user_offer" | "user_interview"
}

// ─────────────────────────────────────────────────────────────────
// WRITER + DOWNSTREAM
// Existing shapes kept; new fields are optional.
// ─────────────────────────────────────────────────────────────────

export interface WriterOutput {
  letter: string
  openingStrategy: string
  closingCta: string
  toneUsed: Tone
  /** Word count of the letter body (excluding signature). Added per
   *  blueprint for the 300-380 band check. Optional during migration. */
  wordCount?: number
}

export interface ATSOutput {
  score: number
  verdict: "ATS Ready" | "Good" | "Needs Work" | "At Risk"
  coveredKeywords: string[]
  missingKeywords: string[]
  /** Blueprint additions, optional during migration. */
  stuffingRisk?: "none" | "moderate" | "high"
  recommendedAdditions?: string[]
}

// ─────────────────────────────────────────────────────────────────
// HM CRITIC
// Old shape kept; full BARS framework added as optional fields.
// New agents emit the BARS shape; old code continues to work.
// ─────────────────────────────────────────────────────────────────

export interface HMCritique {
  overallImpression: string
  strengths: string[]
  weaknesses: string[]
  redFlags: string[]
  rewriteRecommended: boolean
  improvementSuggestions: string[]
  /** BARS additions per blueprint — optional during migration. */
  weightedScore?: number
  wouldInterview?: boolean
  dimensions?: {
    jdRelevance: { score: number; weight: 25; rationale: string }
    evidenceCredibility: { score: number; weight: 25; rationale: string }
    clarity: { score: number; weight: 20; rationale: string }
    competenciesValues: { score: number; weight: 15; rationale: string }
    roleCultureFit: { score: number; weight: 15; rationale: string }
  }
  genericPhrases?: string[]
  strongestSentence?: string
  weakestSentence?: string
  consistencyNote?: string
  equityFlag?: boolean
}

export interface FinalEdit {
  letter: string
  changesMade: string[]
  bannedPhrasesRemoved: string[]
  /** Added per blueprint, optional during migration. */
  wordCount?: number
}

// ─────────────────────────────────────────────────────────────────
// HALLUCINATION CHECK
// Both old (fabricatedFacts) and new (claimMap) shapes coexist.
// ─────────────────────────────────────────────────────────────────

export interface HallucinationCheck {
  risk: "none" | "low" | "medium" | "high"
  /** Legacy field — kept for backwards compat. */
  unverifiedClaims: string[]
  fabricatedFacts: string[]
  /** Blueprint additions — exact win mapping. Optional during migration. */
  unmappedClaims?: string[]
  claimMap?: Array<{
    sentence: string
    winId: string | null
  }>
  removed?: string[]
}

// ─────────────────────────────────────────────────────────────────
// QUALITY GATE
// ─────────────────────────────────────────────────────────────────

export interface QualityVerdict {
  pass: boolean
  score: number
  reasoning: string
  bannedPhrasesFound: string[]
  recommendRewrite: boolean
  /** Added per blueprint — the single weakest element by name,
   *  guides Rewrite Agent. Optional during migration. */
  weakestElement?: string
}

// ─────────────────────────────────────────────────────────────────
// PIPELINE RESULT
// ─────────────────────────────────────────────────────────────────

export interface PipelineResult {
  generationId: string
  finalLetter: string
  finalScore: number
  hallucinationRisk: HallucinationCheck["risk"]
  atsScore?: number
  atsVerdict?: string
  atsCoveredKeywords?: string[]
  atsMissingKeywords?: string[]
  rewriteCycles: number
  agentsRun: string[]
  status: "passed" | "failed"
  failureReason?: string
  totalDurationMs: number
}

export type AgentName =
  | "InputCleaner"
  | "ProfileAnalyst"
  | "ResumeAnalyst" // legacy alias kept until full migration
  | "JobAnalyst"
  | "MatchAnalyst"
  | "ExampleRetrieval"
  | "Writer"
  | "ATSAgent"
  | "HMCritic"
  | "FinalEditor"
  | "HallucinationCheck"
  | "HallucinationDetector" // legacy alias
  | "QualityGate"
  | "RewriteAgent"

export type ProgressStatus = "pending" | "running" | "done" | "failed"

export interface ProgressEvent {
  generationId: string
  percent: number
  agent: AgentName | "Complete"
  status: ProgressStatus
  message?: string
}

export type ProgressCallback = (event: ProgressEvent) => void | Promise<void>

export interface AgentRunLog {
  agent: AgentName
  cycle: number
  outputJson: unknown
  modelUsed: string
  durationMs: number
  tokensInput: number
  tokensOutput: number
  fallbackTriggered: boolean
}
