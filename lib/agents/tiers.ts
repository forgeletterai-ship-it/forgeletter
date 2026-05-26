import type { AgentName, Tier } from "./types"

/**
 * Tier composition per the Definitive Engine Blueprint.
 *
 * Counts: 8 / 9 / 12.
 *   • Starter (8): ProfileAnalyst, JobAnalyst, MatchAnalyst,
 *     ExampleRetrieval, Writer, FinalEditor, HallucinationCheck,
 *     QualityGate. ATS via code-only keyword scorer (no agent slot).
 *   • Pro (9): Starter + ATSAgent (Haiku LLM).
 *   • Ultra (12): Pro + InputCleaner, HMCritic, RewriteAgent.
 *
 * Quality bars: 90 / 93 / 95 (hard thresholds).
 * Quality-rewrite caps: 1 / 2 / 2 (backend-only — free, invisible).
 *
 * Tone rewrites (the 0 / 1 / 3 sold on PricingCards) are a SEPARATE
 * user-triggered feature tracked outside this config — they count
 * against the monthly letter allowance.
 */
export interface TierConfig {
  agents: ReadonlyArray<AgentName>
  /** Backend-only quality-fix attempts when QualityGate fails the
   *  tier threshold. Customer never sees this; it's how we deliver
   *  on the 90/93/95 promise without charging them. */
  maxRewriteCycles: number
  qualityThreshold: number
  enableATS: boolean
  enableExampleRetrieval: boolean
}

// ───────────────────────────────────────────────────────────────
// STARTER · 8 visible agents · 90% bar · 1 backend rewrite
// Profile Analyst, Job Analyst, Match Analyst, Writer,
// Final Editor, Hallucination Check, Quality Gate
// (+ Example Retrieval enabled but presented as background infra)
// ATS via code-only keyword scorer (no agent slot)
// ───────────────────────────────────────────────────────────────
//
// NOTE: agents arrays use legacy names (ResumeAnalyst, HallucinationDetector)
// during the migration so the orchestrator's shouldRun() lookups still
// resolve. A later phase will swap these to the blueprint names once the
// orchestrator wiring is migrated.
const STARTER_AGENTS: ReadonlyArray<AgentName> = [
  "ResumeAnalyst", // → ProfileAnalyst after migration
  "JobAnalyst",
  "MatchAnalyst", // NEW on Starter per blueprint
  "Writer",
  "FinalEditor",
  "HallucinationDetector", // → HallucinationCheck after migration
  "QualityGate",
]

// ───────────────────────────────────────────────────────────────
// PRO · 9 visible agents · 93% bar · 2 backend rewrites
// Starter + ATSAgent (Haiku LLM)
// ───────────────────────────────────────────────────────────────
const PRO_AGENTS: ReadonlyArray<AgentName> = [
  "ResumeAnalyst",
  "JobAnalyst",
  "MatchAnalyst",
  "Writer",
  "ATSAgent",
  "FinalEditor",
  "HallucinationDetector",
  "QualityGate",
]

// ───────────────────────────────────────────────────────────────
// ULTRA · 12 visible agents · 95% bar · 2 backend rewrites
// Full pipeline. Input Cleaner, Example Retrieval as visible,
// HM Critic (BARS), Rewrite Agent — all included.
// Hallucination Check runs ×2 on Ultra (before AND after editing).
// ───────────────────────────────────────────────────────────────
const ULTRA_AGENTS: ReadonlyArray<AgentName> = [
  "InputCleaner",
  "ResumeAnalyst",
  "JobAnalyst",
  "MatchAnalyst",
  "ExampleRetrieval", // explicitly visible on Ultra
  "Writer",
  "ATSAgent",
  "HMCritic",
  "FinalEditor",
  "HallucinationDetector",
  "QualityGate",
  // RewriteAgent runs conditionally inside the quality-rewrite loop —
  // counted toward the "12 AI agents" headline on the Ultra card.
]

export const TIER_CONFIG: Record<Tier, TierConfig> = {
  // The 'free' state represents "no active subscription" in the DB.
  // /api/generate short-circuits with a 402 before any agents run,
  // so this config is never actually executed in production.
  free: {
    agents: STARTER_AGENTS,
    maxRewriteCycles: 0,
    qualityThreshold: 90,
    enableATS: false,
    enableExampleRetrieval: false,
  },
  starter: {
    agents: STARTER_AGENTS,
    maxRewriteCycles: 1, // 1 backend quality rewrite per blueprint
    qualityThreshold: 90,
    // Starter gets a code-only ATS keyword score (no LLM call).
    enableATS: false,
    // ExampleRetrieval runs as background infrastructure on Starter —
    // gates the gold-base feedback loop benefit even without an
    // explicit "Example Retrieval" pill on the pricing card.
    enableExampleRetrieval: true,
  },
  pro: {
    agents: PRO_AGENTS,
    maxRewriteCycles: 2,
    qualityThreshold: 93,
    enableATS: true,
    enableExampleRetrieval: true,
  },
  ultra: {
    agents: ULTRA_AGENTS,
    maxRewriteCycles: 2,
    qualityThreshold: 95,
    enableATS: true,
    enableExampleRetrieval: true,
  },
}

export function getTierConfig(tier: Tier): TierConfig {
  return TIER_CONFIG[tier] ?? TIER_CONFIG.starter
}
