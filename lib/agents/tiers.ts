import type { AgentName, Tier } from "./types"

/**
 * Tier composition. The arrays below are the CUSTOMER-VISIBLE agents
 * — what the pricing card lists and what the pipeline emits as
 * progress events during generation. ExampleRetrieval runs for every
 * paid tier as background infrastructure (it's a retrieval system,
 * not a reasoning agent) and is gated by enableExampleRetrieval, not
 * by membership in `agents`. Same for ATS at the Starter level — a
 * code-only keyword score is computed without an agent slot.
 *
 * Strict superset rule: every Pro agent is also in Ultra; every
 * Starter agent is also in Pro. Hallucination Check and Final Editor
 * appear on all three because safety + polish can't be tier-gated.
 *
 * Two kinds of "rewrite" — they MUST stay separate:
 *   - Quality rewrite (maxRewriteCycles below): backend-only, free,
 *     invisible. Fires when QualityGate scores below the bar. Never
 *     counts against the user's letter allowance.
 *   - Tone rewrite (the 0/1/3 number sold on PricingCards): a
 *     user-triggered "regenerate in a different voice" feature that
 *     uses one of their monthly letter slots. Not configured here.
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
// STARTER · 6 visible agents · 90% bar · 1 backend rewrite
// Resume Analyst, Job Analyst, Writer, Final Editor,
// Hallucination Check, Quality Gate
// ATS via code-only keyword scorer (no agent slot)
// Example Retrieval runs in background (no agent slot)
// ───────────────────────────────────────────────────────────────
const STARTER_AGENTS: ReadonlyArray<AgentName> = [
  "ResumeAnalyst",
  "JobAnalyst",
  "Writer",
  "FinalEditor",
  "HallucinationDetector",
  "QualityGate",
]

// ───────────────────────────────────────────────────────────────
// PRO · 8 visible agents · 93% bar · 2 backend rewrites
// Starter agents + Match Analyst + ATS Agent
// Example Retrieval still background-only
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
// Full pipeline. Example Retrieval explicitly shown.
// Input Cleaner, HM Critic, Rewrite Agent visible to the customer.
// ───────────────────────────────────────────────────────────────
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
  // RewriteAgent runs conditionally inside the quality-rewrite loop —
  // counted toward the "12 AI agents" headline on the Ultra card.
]

export const TIER_CONFIG: Record<Tier, TierConfig> = {
  // The 'free' state is internal — it represents "no active
  // subscription" in the DB. /api/generate short-circuits with a
  // 402 before any agents run, so this config is never executed.
  free: {
    agents: STARTER_AGENTS,
    maxRewriteCycles: 0,
    qualityThreshold: 90,
    enableATS: false,
    enableExampleRetrieval: false,
  },
  starter: {
    agents: STARTER_AGENTS,
    maxRewriteCycles: 1,
    qualityThreshold: 90,
    // Starter gets a code-only ATS keyword score — no LLM call.
    // Set false here so orchestrator doesn't run the ATSAgent.
    enableATS: false,
    // Background retrieval runs but isn't surfaced on the pricing
    // card. Lets even first-time customers benefit from curated
    // examples (and from their own offer-winning letters once they
    // mark outcomes).
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
