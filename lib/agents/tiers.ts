import type { AgentName, Tier } from "./types"

/**
 * Which agents run for each tier, and how many rewrite cycles are allowed
 * if the Quality Gate fails. This is the only place pipeline composition
 * lives — change it here, not in the orchestrator.
 */
export interface TierConfig {
  agents: ReadonlyArray<AgentName>
  maxRewriteCycles: number
  qualityThreshold: number
  enableATS: boolean
  enableExampleRetrieval: boolean
}

const STARTER_AGENTS: ReadonlyArray<AgentName> = [
  "InputCleaner",
  "ResumeAnalyst",
  "JobAnalyst",
  "Writer",
  "FinalEditor",
]

const PRO_AGENTS: ReadonlyArray<AgentName> = [
  "InputCleaner",
  "ResumeAnalyst",
  "JobAnalyst",
  "MatchAnalyst",
  "Writer",
  "ATSAgent",
  "HMCritic",
  "FinalEditor",
  "HallucinationDetector",
  "QualityGate",
]

const ULTRA_AGENTS: ReadonlyArray<AgentName> = [
  "InputCleaner",
  "ResumeAnalyst",
  "JobAnalyst",
  "MatchAnalyst",
  "ExampleRetrieval",
  "Writer",
  "ATSAgent",
  "HMCritic",
  "FinalEditor",
  "HallucinationDetector",
  "QualityGate",
  // RewriteAgent runs conditionally — not listed in fixed sequence
]

export const TIER_CONFIG: Record<Tier, TierConfig> = {
  free: {
    agents: STARTER_AGENTS,
    maxRewriteCycles: 0,
    qualityThreshold: 80,
    enableATS: false,
    enableExampleRetrieval: false,
  },
  starter: {
    agents: STARTER_AGENTS,
    maxRewriteCycles: 0,
    qualityThreshold: 85,
    enableATS: false,
    enableExampleRetrieval: false,
  },
  pro: {
    agents: PRO_AGENTS,
    maxRewriteCycles: 1,
    qualityThreshold: 90,
    enableATS: true,
    enableExampleRetrieval: false,
  },
  ultra: {
    agents: ULTRA_AGENTS,
    maxRewriteCycles: 3,
    qualityThreshold: 95,
    enableATS: true,
    enableExampleRetrieval: true,
  },
}

export function getTierConfig(tier: Tier): TierConfig {
  return TIER_CONFIG[tier] ?? TIER_CONFIG.starter
}
