/**
 * Full-pipeline harness — H5.16 from the verification directive.
 *
 * Builds a real SWE-resume × PM-job structured PipelineInput and runs
 * generateCoverLetter() for each of starter / pro / ultra. For every
 * tier, prints:
 *
 *   • agents fired (in order, deduped)
 *   • model per agent (from the persisted run logs)
 *   • tier threshold
 *   • final quality score
 *   • rewrite cycle count
 *   • coverage check result
 *   • hallucination risk
 *   • body word count
 *   • the full letter
 *
 * Usage:
 *   npm run harness                  # all three tiers
 *   npm run harness -- starter       # one tier
 *   npm run harness -- pro,ultra     # two tiers
 *
 * Requires ANTHROPIC_API_KEY (every LLM agent fails closed without
 * it). Does NOT require Supabase — passes `null` for the client so
 * no rows are persisted; Example Retrieval returns [] silently;
 * vector search is short-circuited by the same.
 *
 * Telemetry: per-agent invocation records (model, tokens, duration,
 * fallback) are buffered in-memory inside the harness via a captured
 * progress callback + the orchestrator's run log array (which it
 * always builds, even with supabase=null).
 */

import "dotenv/config"
import { generateCoverLetter, getTierConfig } from "../lib/agents"
import type {
  PipelineInput,
  Tier,
} from "../lib/agents"
import type { ExperienceBlock } from "../lib/experience-types"
import { randomUUID } from "node:crypto"

// ─────────────────────────────────────────────────────────────────
// Sample input — Senior SWE resume × PM job
// ─────────────────────────────────────────────────────────────────

const SAMPLE_EXPERIENCE_BLOCKS: ExperienceBlock[] = [
  {
    id: "emp-helix",
    type: "employer",
    company: "Helix Systems",
    title: "Senior Software Engineer",
    employmentType: "Full-time",
    sector: "B2B SaaS",
    size: "200-500",
    role: "Senior Software Engineer",
    duration: "Jan 2022 – present (3.5 yrs)",
    name: "",
    degree: "",
    achievements: [
      {
        id: "a1",
        what: "Led migration of customer-data platform from monolithic Postgres to sharded Citus cluster serving 4.2B rows",
        number: "p99 read latency 380ms → 42ms",
        whyItMattered: "Unblocked enterprise contracts that required <100ms SLO",
      },
      {
        id: "a2",
        what: "Designed and shipped the write-ahead-log pipeline (Go + Kafka)",
        number: "18k events/sec at peak; data-loss incidents 3/quarter → 0",
        whyItMattered: "Made the platform audit-ready for SOC2 Type II",
      },
      {
        id: "a3",
        what: "Mentored four mid-level engineers; ran the team's design-review forum",
        number: "Two promoted to senior within 18 months",
        whyItMattered: "Reduced hiring spend and broadened the on-call rotation",
      },
    ],
  },
  {
    id: "emp-plinth",
    type: "employer",
    company: "Plinth Labs",
    title: "Software Engineer",
    employmentType: "Full-time",
    sector: "Fintech",
    size: "50-200",
    role: "Software Engineer",
    duration: "Jul 2019 – Dec 2021 (2.5 yrs)",
    name: "",
    degree: "",
    achievements: [
      {
        id: "b1",
        what: "Owned the billing service rewrite (Node.js + Postgres)",
        number: "€40M ARR in production; nightly job 6h → 22min",
        whyItMattered: "Cut close-of-month from 5 days to 1",
      },
      {
        id: "b2",
        what: "Built the company's first SOC2 audit-logging layer (Go)",
        number: "Passed Type II on first attempt",
        whyItMattered: "Unblocked the enterprise sales channel",
      },
    ],
  },
  {
    id: "uni-kth",
    type: "university",
    company: "",
    title: "",
    employmentType: "",
    sector: "",
    size: "",
    role: "",
    duration: "2014 – 2017",
    name: "KTH Royal Institute of Technology",
    degree: "BSc Computer Science",
    achievements: [
      {
        id: "c1",
        what: "Final-year project on real-time graph queries over streaming data",
        number: "Awarded best-thesis prize (top 3 of 64)",
        whyItMattered: "Foundation for the data-platform work later in career",
      },
    ],
  },
]

const SAMPLE_PROFILE = {
  professionalHeadline: "Senior Software Engineer · 8 yrs · B2B SaaS + Fintech",
  qualifications:
    "AWS Solutions Architect Associate (2021). Stripe-trained on payments architecture. Reading German (B1).",
  strengths:
    "Go, TypeScript, Postgres, Kafka, Citus, Docker, Kubernetes, AWS (EKS, RDS, S3), Terraform, React. " +
    "Strong stakeholder communication; comfortable presenting to exec audiences.",
  notes:
    "Looking for a role with cross-functional product ownership — interested in shifting from pure engineering into product management.",
  keyAchievements: "",
  portfolioLink: "github.com/mayachen-engineering",
  experienceBlocks: SAMPLE_EXPERIENCE_BLOCKS,
}

const SAMPLE_JD = `Senior Product Manager — Payments Platform
About Lyra Pay
We process payments for 11,000 merchants across the EU. Latency-sensitive,
high-volume, heavily regulated.

The role
You will own the product strategy and roadmap for our core ledger and
risk-decisioning platform. You will work cross-functionally with
engineering, compliance, and finance to ship changes to a system that
moves €1.2B annually with five-nines availability. You will lead
quarterly planning, define the success metrics, and report directly
to the VP Product.

What we are looking for
Required:
- 5+ years product management experience in B2B SaaS, payments, or
  high-throughput data systems
- Strong technical background (former engineer is a plus) — comfortable
  reading SQL and reasoning about distributed systems trade-offs
- Track record of leading cross-functional teams and shipping
  technical platform products to production
- Excellent stakeholder communication; comfortable presenting roadmaps
  to executive audiences

Nice to have:
- Direct experience with payments, ledger, or risk-decisioning systems
- Familiarity with SOC2 or PCI compliance workflows
- Experience hiring or mentoring junior PMs

We move quickly. We value PMs who can ship without waiting for a
roadmap to be dictated to them. Equal parts technical depth and
customer empathy.`

// ─────────────────────────────────────────────────────────────────
// Harness runner
// ─────────────────────────────────────────────────────────────────

interface ProgressTrace {
  agent: string
  status: string
  percent: number
  message?: string
  at: number
}

async function runOne(tier: Tier) {
  const config = getTierConfig(tier)
  const generationId = randomUUID()
  const start = Date.now()
  const trace: ProgressTrace[] = []

  console.log(`\n${"═".repeat(78)}`)
  console.log(
    `TIER: ${tier.toUpperCase()}  ·  threshold ${config.qualityThreshold}  ·  ` +
      `quality-rewrite cap ${config.maxRewriteCycles}  ·  ` +
      `agents in config (${config.agents.length}): ${config.agents.join(", ")}`
  )
  console.log(`generationId=${generationId}`)
  console.log("═".repeat(78))

  const pipelineInput: PipelineInput = {
    profile: SAMPLE_PROFILE,
    selectedExperienceIds: SAMPLE_EXPERIENCE_BLOCKS.map((b) => b.id),
    alwaysIncludeQualifications: true,
    jobDescription: SAMPLE_JD,
    targetRole: "Senior Product Manager — Payments Platform",
    companyName: "Lyra Pay",
    tone: "confident",
    tier,
    userId: "harness-user",
    generationId,
  }

  let result
  try {
    result = await generateCoverLetter(
      pipelineInput,
      null, // no supabase — agent_outputs not persisted, vector skipped
      async (event) => {
        trace.push({
          agent: event.agent,
          status: event.status,
          percent: event.percent,
          message: event.message,
          at: Date.now() - start,
        })
        process.stdout.write(
          `  [${event.percent.toString().padStart(3, " ")}%]  ${event.agent.padEnd(22)}  ${event.status.padEnd(8)}` +
            (event.message ? `  — ${event.message}` : "") +
            "\n"
        )
      }
    )
  } catch (err) {
    console.error(`\nTIER ${tier.toUpperCase()} CRASHED:`, err)
    return
  }

  const wallSec = ((Date.now() - start) / 1000).toFixed(1)

  console.log(`\nResult ─────────────────────────────────────────────`)
  console.log(`status            : ${result.status}`)
  console.log(`finalScore        : ${result.finalScore} / 100  (threshold ${config.qualityThreshold})`)
  console.log(`hallucinationRisk : ${result.hallucinationRisk}`)
  if (result.atsScore != null) {
    console.log(`ats               : ${result.atsScore} (${result.atsVerdict})`)
    console.log(`  covered: ${(result.atsCoveredKeywords ?? []).slice(0, 10).join(", ")}`)
    console.log(`  missing: ${(result.atsMissingKeywords ?? []).slice(0, 10).join(", ")}`)
  }
  console.log(`rewriteCycles     : ${result.rewriteCycles}`)
  console.log(`coverageMissing   : ${
    result.coverageMissing && result.coverageMissing.length > 0
      ? result.coverageMissing.join("; ")
      : "(none — every selected experience is referenced)"
  }`)
  console.log(`wordCount (body)  : ${result.wordCount} ` +
    `(${tier === "starter" || tier === "pro" || tier === "ultra"
      ? "target 300-380"
      : "target n/a"})`)
  console.log(`wallTime          : ${wallSec}s`)
  console.log(`agentsRun         : ${result.agentsRun.join(" → ")}`)
  if (result.failureReason) console.log(`failureReason     : ${result.failureReason}`)

  console.log(`\n─────────── DELIVERED LETTER ───────────`)
  console.log(result.finalLetter || "(no letter produced)")
  console.log(`─────────── END LETTER ────────────────`)
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is not set. The harness needs a live key — add it to .env.local and re-run."
    )
    process.exit(1)
  }

  const tiers: Tier[] = process.argv[2]
    ? (process.argv[2].split(",") as Tier[])
    : ["starter", "pro", "ultra"]

  for (const tier of tiers) {
    try {
      await runOne(tier)
    } catch (err) {
      console.error(`\n[harness] tier ${tier} threw:`, err)
    }
  }
  console.log("\n[harness] done.\n")
}

main().catch((err) => {
  console.error("[harness] crashed:", err)
  process.exit(1)
})
