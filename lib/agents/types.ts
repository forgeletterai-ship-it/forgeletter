export type Tier = "free" | "starter" | "pro" | "ultra"

export type Tone = "professional" | "confident" | "warm" | "concise"

export interface PipelineInput {
  resumeText: string
  jobDescription: string
  jobTitle?: string
  companyName?: string
  tone?: Tone
  tier: Tier
  userId: string
  generationId: string
}

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
}

export interface MatchAnalysis {
  overallFit: number
  strongMatches: string[]
  gaps: string[]
  uniqueAngles: string[]
  recommendedOpening: string
  recommendedClosing: string
}

export interface RetrievedExample {
  id: string
  industry: string
  role: string
  excerpt: string
  whyItWorks: string | null
  qualityScore: number
  /** Provenance of this example.
   *
   *  - "curated" = editor-vetted entry in cover_letter_examples.
   *  - "user_offer" = the requesting user's own letter that earned
   *    an offer. Strongest personal signal.
   *  - "user_interview" = the requesting user's own letter that
   *    got them through to interview. Still a winning letter, just
   *    a slightly weaker conversion signal than an offer. */
  source: "curated" | "user_offer" | "user_interview"
}

export interface WriterOutput {
  letter: string
  openingStrategy: string
  closingCta: string
  toneUsed: Tone
}

export interface ATSOutput {
  score: number
  verdict: "ATS Ready" | "Good" | "Needs Work" | "At Risk"
  coveredKeywords: string[]
  missingKeywords: string[]
}

export interface HMCritique {
  overallImpression: string
  strengths: string[]
  weaknesses: string[]
  redFlags: string[]
  rewriteRecommended: boolean
  improvementSuggestions: string[]
}

export interface FinalEdit {
  letter: string
  changesMade: string[]
  bannedPhrasesRemoved: string[]
}

export interface HallucinationCheck {
  risk: "none" | "low" | "medium" | "high"
  unverifiedClaims: string[]
  fabricatedFacts: string[]
}

export interface QualityVerdict {
  pass: boolean
  score: number
  reasoning: string
  bannedPhrasesFound: string[]
  recommendRewrite: boolean
}

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
  | "ResumeAnalyst"
  | "JobAnalyst"
  | "MatchAnalyst"
  | "ExampleRetrieval"
  | "Writer"
  | "ATSAgent"
  | "HMCritic"
  | "FinalEditor"
  | "HallucinationDetector"
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
