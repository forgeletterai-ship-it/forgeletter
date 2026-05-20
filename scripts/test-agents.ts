/**
 * Smoke test for the 12-agent pipeline.
 *
 * Usage:
 *   npm run test:agents
 *
 * Requires ANTHROPIC_API_KEY to be set. Does NOT require Supabase — passes
 * `null` as the client, so no rows are written, and Example Retrieval
 * returns an empty list.
 *
 * Runs the pipeline three times: once per tier (starter, pro, ultra) on
 * the same input. Prints per-agent timings, the final letter, the
 * scoring, and any fallbacks that triggered.
 */
import "dotenv/config"
import { generateCoverLetter } from "../lib/agents"
import type { Tier } from "../lib/agents"
import { randomUUID } from "node:crypto"

const SAMPLE_RESUME = `Maya Chen
Senior Software Engineer | maya.chen@example.com | linkedin.com/in/mayachen

EXPERIENCE
Senior Software Engineer, Helix Systems — Jan 2022 to present
- Led the migration of the customer-data platform from a monolithic Postgres
  schema to a sharded Citus cluster serving 4.2B rows. Reduced p99 read
  latency from 380ms to 42ms.
- Designed and shipped the new write-ahead log pipeline (Go + Kafka) that
  now processes 18k events/second at peak. Cut data loss incidents from
  ~3/quarter to zero across the last 5 quarters.
- Mentored 4 mid-level engineers; two were promoted to senior within 18
  months.

Software Engineer, Plinth Labs — Jul 2019 to Dec 2021
- Owned the billing service rewrite (Node.js + Postgres). Handled €40M
  ARR in production. Cut nightly job runtime from 6h to 22min.
- Built the company's first SOC2 audit logging layer (Go). Passed Type II
  on first attempt.

Junior Engineer, Cobalt Tech — Aug 2017 to Jun 2019
- Shipped 30+ frontend features across the React dashboard.
- Reduced first-paint time on the marketing site by 41% via image
  optimisation and route-level code splitting.

EDUCATION
BSc Computer Science, KTH Royal Institute of Technology, 2017

SKILLS
Go, TypeScript, Postgres, Kafka, Citus, Docker, Kubernetes, AWS
(EKS, RDS, S3), Terraform, React. Reading German.`

const SAMPLE_JD = `Staff Backend Engineer — Stripe-style payments platform
About Lyra Pay
We process payments for 11,000 merchants across the EU. Latency-sensitive,
high-volume, regulated.

The role
You will own the reliability and performance of our core ledger service.
You will lead a small team of 3-5 engineers shipping changes to a system
that moves €1.2B annually with five nines availability.

What we are looking for
Required:
- 7+ years backend experience in a payments, ledger, or high-throughput
  data system
- Strong Postgres skills, ideally with sharding or partitioning at scale
- Deep familiarity with Kafka or similar event streams
- Track record of mentoring engineers

Nice to have:
- Go
- Experience passing SOC2 audits
- Multi-tenant SaaS infrastructure

We move quickly. We value engineers who can produce results without
needing a roadmap dictated to them.`

async function runOne(tier: Tier) {
  const generationId = randomUUID()
  console.log(`\n============================================================`)
  console.log(`TIER: ${tier.toUpperCase()}   generationId=${generationId}`)
  console.log(`============================================================`)
  const start = Date.now()

  const result = await generateCoverLetter(
    {
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      jobTitle: "Staff Backend Engineer",
      companyName: "Lyra Pay",
      tone: "confident",
      tier,
      userId: "smoke-test-user",
      generationId,
    },
    null, // no supabase — no agent_outputs persistence
    async (event) => {
      console.log(`  [${event.percent.toString().padStart(3, " ")}%] ${event.agent.padEnd(22)} ${event.status}${event.message ? ` — ${event.message}` : ""}`)
    }
  )

  console.log(`\nFinal status: ${result.status}`)
  console.log(`Final score:  ${result.finalScore}`)
  console.log(`Hallucination risk: ${result.hallucinationRisk}`)
  if (result.atsScore != null) {
    console.log(`ATS:  ${result.atsScore}/100 (${result.atsVerdict})`)
    console.log(`  covered: ${result.atsCoveredKeywords?.slice(0, 8).join(", ")}`)
    console.log(`  missing: ${result.atsMissingKeywords?.slice(0, 8).join(", ")}`)
  }
  console.log(`Rewrite cycles: ${result.rewriteCycles}`)
  console.log(`Agents run:     ${result.agentsRun.join(" → ")}`)
  console.log(`Wall time:      ${((Date.now() - start) / 1000).toFixed(1)}s`)
  if (result.failureReason) console.log(`Failure reason: ${result.failureReason}`)
  console.log(`\n-------- LETTER --------`)
  console.log(result.finalLetter || "(no letter produced)")
  console.log(`-------- END LETTER --------`)

  return result
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Add it to .env.local and re-run.")
    process.exit(1)
  }

  const tiers: Tier[] = (process.argv[2]
    ? (process.argv[2].split(",") as Tier[])
    : ["starter", "pro", "ultra"])

  for (const tier of tiers) {
    try {
      await runOne(tier)
    } catch (err) {
      console.error(`[smoke] tier ${tier} failed:`, err)
    }
  }
}

main().catch((err) => {
  console.error("[smoke] crashed:", err)
  process.exit(1)
})
