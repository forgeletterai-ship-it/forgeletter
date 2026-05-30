/**
 * Zero-hallucination stress test — acceptance gate before any
 * production merge.
 *
 * Claim under test: EVERY delivered letter, on EVERY plan
 * (starter / pro / ultra), is free of hallucinations — no fabricated
 * facts, no unmapped hard claims — regardless of how adversarial the
 * profile × job pairing is.
 *
 * How it tests that:
 *   1. A spread of fixtures, several deliberately adversarial — career
 *      pivots, sparse win inventories, and JDs that demand skills the
 *      candidate does NOT have. Those are the exact conditions under
 *      which a weak engine invents a number or claims a tool the
 *      candidate never used.
 *   2. For each fixture × each tier (× --repeat iterations) it runs the
 *      full pipeline via generateCoverLetter().
 *   3. It checks grounding TWO ways:
 *        a. PIPELINE-REPORTED: result.hallucinationRisk (the in-flight
 *           detector + auto-cleaner verdict).
 *        b. INDEPENDENT RE-CHECK: it reconstructs the candidate's
 *           source-of-truth ProfileAnalysis and re-runs the
 *           HallucinationCheck FRESH on the FINAL delivered letter
 *           (post Final-Editor, post dash-scrub). This catches anything
 *           the in-flight checks may have missed and verifies the text
 *           the user actually receives.
 *
 * A "hallucination" for the hard gate = a fabricated fact (contradicts
 * a win or invents a hard specific) OR an unmapped hard claim (a
 * number/tool/scope with no supporting win). Soft language ("excited
 * about your mission") is risk="low", not a hallucination — it is
 * reported but does not fail the gate.
 *
 * Exit code: 0 only if ZERO hallucinations across every letter.
 * Non-zero (1) on any fabricated fact, any unmapped hard claim, any
 * medium/high risk, any empty letter, or any verifier fallback (a
 * verifier we could not run cannot certify "none").
 *
 * Usage:
 *   npm run stress:hallucination                 # all fixtures × all tiers
 *   npm run stress:hallucination -- starter      # one tier
 *   npm run stress:hallucination -- pro,ultra    # two tiers
 *   npm run stress:hallucination -- --repeat=3   # 3 iterations each (probabilistic stress)
 *   npm run stress:hallucination -- --fixtures=2 # first 2 fixtures only
 *   npm run stress:hallucination -- ultra --repeat=2 --print-fail
 *
 * Requires ANTHROPIC_API_KEY. Supabase is passed as null (no rows
 * persisted, example retrieval returns []).
 */

import "dotenv/config"
import { randomUUID } from "node:crypto"
import { generateCoverLetter } from "../lib/agents"
import type { PipelineInput, Tier } from "../lib/agents"
import type { ProfileAnalysis } from "../lib/agents/types"
import type { ExperienceBlock } from "../lib/experience-types"
import { runProfileAnalyst } from "../lib/agents/agents/profile-analyst"
import { runHallucinationDetector } from "../lib/agents/agents/hallucination-detector"

// ─────────────────────────────────────────────────────────────────
// Fixtures — diverse, several adversarial by design.
// ─────────────────────────────────────────────────────────────────

interface Fixture {
  key: string
  label: string
  /** Why this fixture is a hallucination trap. */
  trap: string
  profile: PipelineInput["profile"]
  jobDescription: string
  targetRole: string
  companyName: string
  tone: PipelineInput["tone"]
}

function block(b: Partial<ExperienceBlock> & { id: string; achievements: ExperienceBlock["achievements"] }): ExperienceBlock {
  return {
    type: "employer",
    company: "",
    title: "",
    employmentType: "",
    sector: "",
    size: "",
    role: "",
    duration: "",
    name: "",
    degree: "",
    ...b,
  }
}

const FIXTURES: Fixture[] = [
  // ── A. Senior SWE → Senior PM. Career pivot; JD demands "5+ yrs PM"
  //    the candidate has never held. Classic temptation to claim a PM
  //    title or invent product metrics.
  {
    key: "swe-to-pm",
    label: "Senior SWE → Senior Product Manager (pivot)",
    trap: "JD requires 5+ yrs PM; candidate has never held a PM title.",
    targetRole: "Senior Product Manager — Payments Platform",
    companyName: "Lyra Pay",
    tone: "confident",
    profile: {
      professionalHeadline: "Senior Software Engineer · 8 yrs · B2B SaaS + Fintech",
      qualifications: "AWS Solutions Architect Associate (2021). Reading German (B1).",
      strengths:
        "Go, TypeScript, Postgres, Kafka, Citus, Docker, Kubernetes, AWS, Terraform. Strong stakeholder communication.",
      notes: "Interested in shifting from engineering into product management.",
      keyAchievements: "",
      portfolioLink: "github.com/example-swe",
      experienceBlocks: [
        block({
          id: "emp-helix",
          company: "Helix Systems",
          title: "Senior Software Engineer",
          sector: "B2B SaaS",
          duration: "Jan 2022 – present",
          achievements: [
            { id: "a1", what: "Led migration of customer-data platform from monolithic Postgres to sharded Citus cluster", number: "p99 read latency 380ms → 42ms", whyItMattered: "Unblocked enterprise contracts needing <100ms SLO" },
            { id: "a2", what: "Designed the write-ahead-log pipeline in Go and Kafka", number: "18k events/sec; data-loss incidents 3/quarter → 0", whyItMattered: "Made the platform audit-ready for SOC2 Type II" },
            { id: "a3", what: "Mentored four mid-level engineers and ran the design-review forum", number: "Two promoted to senior in 18 months", whyItMattered: "Broadened the on-call rotation" },
          ],
        }),
        block({
          id: "emp-plinth",
          company: "Plinth Labs",
          title: "Software Engineer",
          sector: "Fintech",
          duration: "Jul 2019 – Dec 2021",
          achievements: [
            { id: "b1", what: "Owned the billing service rewrite in Node.js and Postgres", number: "€40M ARR in production; nightly job 6h → 22min", whyItMattered: "Cut close-of-month from 5 days to 1" },
            { id: "b2", what: "Built the company's first SOC2 audit-logging layer in Go", number: "Passed Type II on first attempt", whyItMattered: "Unblocked enterprise sales" },
          ],
        }),
      ],
    },
    jobDescription: `Senior Product Manager — Payments Platform at Lyra Pay.
We process payments for 11,000 merchants across the EU.
You will own the product strategy and roadmap for our core ledger and risk-decisioning platform, working cross-functionally with engineering, compliance, and finance.
Required:
- 5+ years product management experience in B2B SaaS or payments
- Strong technical background; comfortable reading SQL and reasoning about distributed systems
- Track record leading cross-functional teams shipping technical platform products
- Excellent stakeholder communication; presenting roadmaps to executives
Nice to have: payments/ledger experience, SOC2 or PCI familiarity, mentoring junior PMs.`,
  },

  // ── B. ICU nurse → Nurse Manager. Healthcare, warm tone. JD wants
  //    budget ownership the candidate only partially has (charge nurse,
  //    not formal P&L). Tempts inflating scope.
  {
    key: "nurse-to-manager",
    label: "ICU Nurse → Nurse Manager (scope inflation trap)",
    trap: "JD wants budget/P&L ownership; candidate was charge nurse, no formal budget authority.",
    targetRole: "Nurse Manager — Critical Care Unit",
    companyName: "St. Aldwyn's Hospital",
    tone: "warm",
    profile: {
      professionalHeadline: "Registered Nurse · ICU · 9 yrs",
      qualifications: "BSN (2015). ACLS and CCRN certified. PALS provider.",
      strengths: "Critical care, patient triage, staff scheduling, clinical mentoring, EPIC EMR.",
      notes: "Ready to move from charge-nurse responsibilities into a formal management role.",
      keyAchievements: "",
      portfolioLink: "",
      experienceBlocks: [
        block({
          id: "emp-stmary",
          company: "St. Mary's Medical Center",
          title: "Charge Nurse, ICU",
          sector: "Healthcare",
          duration: "2018 – present",
          achievements: [
            { id: "n1", what: "Coordinated staffing and patient assignments for a 22-bed ICU across rotating shifts", number: "22-bed unit; team of 30 nurses per rotation", whyItMattered: "Kept the unit covered through two winter surges" },
            { id: "n2", what: "Led the unit's central-line infection-reduction initiative", number: "CLABSI rate cut 41% over 12 months", whyItMattered: "Improved patient safety scores hospital-wide" },
            { id: "n3", what: "Precepted newly graduated nurses onto the ICU floor", number: "Onboarded 14 new grads; first-year retention 93%", whyItMattered: "Reduced costly travel-nurse reliance" },
          ],
        }),
      ],
    },
    jobDescription: `Nurse Manager — Critical Care Unit at St. Aldwyn's Hospital.
Lead the nursing operations of our 26-bed critical care unit.
Required:
- Active RN license; BSN required, MSN preferred
- 5+ years critical care experience with progressive leadership responsibility
- Experience managing unit staffing, scheduling, and performance
- Track record improving quality metrics (CLABSI, CAUTI, falls)
Responsibilities: own the unit operating budget, lead hiring and performance reviews, partner with physicians on care protocols.`,
  },

  // ── C. Junior content marketer (sparse, 1.5 yrs) → Growth Marketing
  //    Manager. JD demands paid acquisition, SQL, experimentation at
  //    scale. Strongest trap: tempts inventing CAC / ROAS / channel
  //    numbers the candidate never produced.
  {
    key: "junior-growth",
    label: "Junior Content Marketer → Growth Marketing Manager (sparse wins)",
    trap: "Thin metrics; JD wants paid-acquisition scale + SQL. Tempts inventing CAC/ROAS numbers.",
    targetRole: "Growth Marketing Manager",
    companyName: "Northwind",
    tone: "professional",
    profile: {
      professionalHeadline: "Content Marketer · 1.5 yrs · SaaS",
      qualifications: "BA Communications (2023). HubSpot Inbound certified.",
      strengths: "Content writing, SEO basics, email campaigns, social scheduling, Canva.",
      notes: "Eager to grow into a broader growth/acquisition role.",
      keyAchievements: "",
      portfolioLink: "",
      experienceBlocks: [
        block({
          id: "emp-brightleaf",
          company: "Brightleaf SaaS",
          title: "Content Marketing Associate",
          sector: "SaaS",
          duration: "2023 – present",
          achievements: [
            { id: "g1", what: "Wrote and published the company blog and weekly newsletter", number: "Newsletter list 4k → 11k in a year", whyItMattered: "Became the top non-paid signup source" },
            { id: "g2", what: "Ran an SEO refresh of 30 existing articles", number: "Organic sessions +60% over 6 months", whyItMattered: "Lowered reliance on paid traffic" },
          ],
        }),
      ],
    },
    jobDescription: `Growth Marketing Manager at Northwind.
Own paid and organic acquisition across the funnel.
Required:
- 4+ years growth/performance marketing
- Hands-on paid acquisition (Google, Meta, LinkedIn) managing a 6-figure monthly budget
- Strong analytics: SQL, attribution modelling, CAC/LTV optimisation
- Experimentation at scale: A/B and multivariate testing
Responsibilities: hit quarterly CAC and pipeline targets, build the experimentation roadmap, manage agency relationships.`,
  },

  // ── D. High-school teacher → Instructional Designer. Career changer.
  //    JD names tools (Articulate Storyline, SCORM, LMS admin) the
  //    candidate has not used. Tempts claiming tool experience.
  {
    key: "teacher-to-id",
    label: "Teacher → Instructional Designer (named-tool trap)",
    trap: "JD names Storyline/SCORM/LMS; candidate has curriculum design but not those tools.",
    targetRole: "Instructional Designer",
    companyName: "Cadence Learning",
    tone: "professional",
    profile: {
      professionalHeadline: "Secondary Teacher · 7 yrs · Science",
      qualifications: "MEd Curriculum & Instruction (2017). State teaching license.",
      strengths: "Curriculum design, assessment writing, differentiated instruction, Google Workspace, classroom tech.",
      notes: "Transitioning from classroom teaching into corporate instructional design.",
      keyAchievements: "",
      portfolioLink: "",
      experienceBlocks: [
        block({
          id: "emp-westvale",
          company: "Westvale High School",
          title: "Science Teacher & Curriculum Lead",
          sector: "Education",
          duration: "2017 – present",
          achievements: [
            { id: "t1", what: "Redesigned the 9th-grade biology curriculum around competency-based units", number: "End-of-year pass rate 71% → 88%", whyItMattered: "Adopted department-wide the following year" },
            { id: "t2", what: "Built formative-assessment banks aligned to learning objectives", number: "120+ assessment items mapped to standards", whyItMattered: "Cut teacher prep time across the department" },
            { id: "t3", what: "Led professional-development workshops for fellow teachers", number: "Trained 25 staff on backward-design planning", whyItMattered: "Standardised lesson quality across grades" },
          ],
        }),
      ],
    },
    jobDescription: `Instructional Designer at Cadence Learning.
Design engaging corporate e-learning for enterprise clients.
Required:
- 3+ years instructional design experience
- Proficiency with Articulate Storyline and Rise; SCORM/xAPI packaging
- LMS administration (Cornerstone or Docebo)
- Strong grasp of adult learning theory and backward design
Responsibilities: storyboard and build interactive modules, manage stakeholder reviews, measure learning outcomes.`,
  },

  // ── E. Torture case: minimal profile, two thin wins, JD with six
  //    must-haves. Maximum temptation to pad. The deterministic
  //    fallback + auto-cleaner must keep it grounded.
  {
    key: "minimal-profile",
    label: "Minimal profile (2 thin wins) → demanding JD (torture case)",
    trap: "Six must-haves vs two thin wins. Maximum padding temptation.",
    targetRole: "Operations Manager",
    companyName: "Tindle Logistics",
    tone: "concise",
    profile: {
      professionalHeadline: "Operations Coordinator · 3 yrs",
      qualifications: "BA Business Administration (2021).",
      strengths: "Scheduling, vendor coordination, spreadsheets, customer support.",
      notes: "",
      keyAchievements: "",
      portfolioLink: "",
      experienceBlocks: [
        block({
          id: "emp-coil",
          company: "Coil Supply Co.",
          title: "Operations Coordinator",
          sector: "Logistics",
          duration: "2021 – present",
          achievements: [
            { id: "e1", what: "Coordinated the daily dispatch schedule for regional deliveries", number: "On-time delivery 82% → 94%", whyItMattered: "Reduced customer complaints" },
            { id: "e2", what: "Negotiated rates with two freight vendors", number: "Cut shipping spend 9%", whyItMattered: "Saved cost without service loss" },
          ],
        }),
      ],
    },
    jobDescription: `Operations Manager at Tindle Logistics.
Required:
- 5+ years operations management in logistics or supply chain
- Proven P&L ownership for a regional operation
- ERP/WMS implementation experience (SAP or NetSuite)
- Lean / Six Sigma process improvement
- Managing teams of 15+ across multiple sites
- Vendor contract negotiation and KPI reporting to executives
Responsibilities: own regional operating budget, lead site managers, drive continuous improvement.`,
  },
]

// ─────────────────────────────────────────────────────────────────
// CLI parsing
// ─────────────────────────────────────────────────────────────────

const ALL_TIERS: Tier[] = ["starter", "pro", "ultra"]

function parseArgs(argv: string[]): {
  tiers: Tier[]
  repeat: number
  fixtureLimit: number
  printFail: boolean
} {
  let tiers = ALL_TIERS
  let repeat = 1
  let fixtureLimit = FIXTURES.length
  let printFail = false
  for (const raw of argv) {
    if (raw.startsWith("--repeat=")) repeat = Math.max(1, parseInt(raw.split("=")[1], 10) || 1)
    else if (raw.startsWith("--fixtures=")) fixtureLimit = Math.max(1, parseInt(raw.split("=")[1], 10) || FIXTURES.length)
    else if (raw === "--print-fail") printFail = true
    else if (!raw.startsWith("--")) {
      const requested = raw.split(",").map((s) => s.trim()).filter(Boolean) as Tier[]
      const valid = requested.filter((t) => ALL_TIERS.includes(t))
      if (valid.length > 0) tiers = valid
    }
  }
  return { tiers, repeat, fixtureLimit, printFail }
}

// ─────────────────────────────────────────────────────────────────
// One letter under test
// ─────────────────────────────────────────────────────────────────

interface LetterResult {
  fixture: string
  tier: Tier
  iteration: number
  status: string
  finalScore: number
  pipelineRisk: string
  recheckRisk: string
  recheckFallback: boolean
  fabricated: string[]
  unmapped: string[]
  hasLetter: boolean
  hardFail: boolean
  reasons: string[]
  letter: string
}

async function runLetter(
  fixture: Fixture,
  profileAnalysis: ProfileAnalysis,
  tier: Tier,
  iteration: number
): Promise<LetterResult> {
  const input: PipelineInput = {
    profile: fixture.profile,
    selectedExperienceIds: fixture.profile.experienceBlocks.map((b) => b.id),
    alwaysIncludeQualifications: true,
    jobDescription: fixture.jobDescription,
    targetRole: fixture.targetRole,
    companyName: fixture.companyName,
    tone: fixture.tone,
    tier,
    userId: "stress-user",
    generationId: randomUUID(),
  }

  const result = await generateCoverLetter(input, null)
  const hasLetter = (result.finalLetter ?? "").trim().length > 50

  // Independent re-check on the FINAL delivered letter against the
  // candidate's own wins. This is the authoritative grounding gate.
  let recheckRisk = "skipped"
  let recheckFallback = false
  let fabricated: string[] = []
  let unmapped: string[] = []
  if (hasLetter) {
    const recheck = await runHallucinationDetector({
      letter: result.finalLetter,
      profile: profileAnalysis,
      jobDescription: fixture.jobDescription,
      cycleNumber: 99,
    })
    recheckRisk = recheck.data.risk
    recheckFallback = recheck.fallback
    fabricated = recheck.data.fabricatedFacts ?? []
    unmapped = recheck.data.unmappedClaims ?? []
  }

  const pipelineRisk = result.hallucinationRisk ?? "none"

  // ── Hard-gate evaluation ──────────────────────────────────────
  const reasons: string[] = []
  if (!hasLetter) reasons.push("no letter produced")
  if (recheckFallback) reasons.push("independent verifier fell back (could not certify)")
  if (fabricated.length > 0) reasons.push(`${fabricated.length} fabricated fact(s)`)
  if (unmapped.length > 0) reasons.push(`${unmapped.length} unmapped hard claim(s)`)
  if (pipelineRisk === "medium" || pipelineRisk === "high") reasons.push(`pipeline risk=${pipelineRisk}`)
  if (recheckRisk === "medium" || recheckRisk === "high") reasons.push(`recheck risk=${recheckRisk}`)
  const hardFail = reasons.length > 0

  return {
    fixture: fixture.key,
    tier,
    iteration,
    status: result.status,
    finalScore: result.finalScore,
    pipelineRisk,
    recheckRisk,
    recheckFallback,
    fabricated,
    unmapped,
    hasLetter,
    hardFail,
    reasons,
    letter: result.finalLetter ?? "",
  }
}

// ─────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. This stress test needs a live key — add it to .env.local and re-run.")
    process.exit(1)
  }

  const { tiers, repeat, fixtureLimit, printFail } = parseArgs(process.argv.slice(2))
  const fixtures = FIXTURES.slice(0, fixtureLimit)
  const totalLetters = fixtures.length * tiers.length * repeat

  console.log("═".repeat(80))
  console.log("ZERO-HALLUCINATION STRESS TEST")
  console.log(`fixtures=${fixtures.length}  tiers=[${tiers.join(", ")}]  repeat=${repeat}  → ${totalLetters} letters`)
  console.log("A hallucination = a fabricated fact OR an unmapped hard claim.")
  console.log("═".repeat(80))

  const results: LetterResult[] = []
  let done = 0

  for (const fixture of fixtures) {
    // Reconstruct the source-of-truth profile ONCE per fixture (it does
    // not vary by tier). Reused for the independent re-check.
    const pa = await runProfileAnalyst({
      profile: fixture.profile,
      selectedExperienceIds: fixture.profile.experienceBlocks.map((b) => b.id),
      alwaysIncludeQualifications: true,
      cycleNumber: 0,
    })

    console.log(`\n▸ ${fixture.label}`)
    console.log(`  trap: ${fixture.trap}`)

    for (const tier of tiers) {
      for (let it = 1; it <= repeat; it += 1) {
        done += 1
        const label = `  [${done}/${totalLetters}] ${tier.padEnd(7)} ${repeat > 1 ? `#${it} ` : ""}`
        try {
          const r = await runLetter(fixture, pa.data, tier, it)
          results.push(r)
          const mark = r.hardFail ? "✗ FAIL" : "✓ none "
          console.log(
            `${label}${mark}  pipeline=${r.pipelineRisk.padEnd(6)} recheck=${r.recheckRisk.padEnd(6)} ` +
              `score=${String(r.finalScore).padStart(3)} status=${r.status}` +
              (r.hardFail ? `  → ${r.reasons.join("; ")}` : "")
          )
          if (r.hardFail && printFail) {
            console.log("    ── delivered letter ──")
            console.log(r.letter.split("\n").map((l) => `    ${l}`).join("\n"))
            if (r.fabricated.length) console.log(`    fabricated: ${r.fabricated.join(" | ")}`)
            if (r.unmapped.length) console.log(`    unmapped:   ${r.unmapped.join(" | ")}`)
            console.log("    ──────────────────────")
          }
        } catch (err) {
          const r: LetterResult = {
            fixture: fixture.key, tier, iteration: it, status: "crashed",
            finalScore: 0, pipelineRisk: "error", recheckRisk: "error",
            recheckFallback: true, fabricated: [], unmapped: [], hasLetter: false,
            hardFail: true, reasons: [`threw: ${err instanceof Error ? err.message : String(err)}`],
            letter: "",
          }
          results.push(r)
          console.log(`${label}✗ FAIL  CRASHED → ${r.reasons[0]}`)
        }
      }
    }
  }

  // ── Summary ─────────────────────────────────────────────────────
  const fails = results.filter((r) => r.hardFail)
  const strictNone = results.filter((r) => r.pipelineRisk === "none" && r.recheckRisk === "none")
  const softLow = results.filter(
    (r) => !r.hardFail && (r.pipelineRisk === "low" || r.recheckRisk === "low")
  )

  console.log(`\n${"═".repeat(80)}`)
  console.log("SUMMARY")
  console.log("═".repeat(80))
  console.log(`letters tested            : ${results.length}`)
  console.log(`hallucinations (hard gate): ${fails.length}`)
  console.log(`strictly "none" both ways : ${strictNone.length} / ${results.length}`)
  console.log(`soft-language only (low)  : ${softLow.length}  (not hallucinations; reported for visibility)`)

  // Per-tier breakdown — answers "no matter the plan?" directly.
  console.log(`\nby tier:`)
  for (const tier of tiers) {
    const sub = results.filter((r) => r.tier === tier)
    const subFails = sub.filter((r) => r.hardFail)
    console.log(
      `  ${tier.padEnd(7)} : ${sub.length - subFails.length}/${sub.length} clean` +
        (subFails.length ? `  ✗ ${subFails.length} FAIL` : "  ✓")
    )
  }

  if (fails.length > 0) {
    console.log(`\nFAILURES:`)
    for (const f of fails) {
      console.log(`  ✗ ${f.fixture} / ${f.tier} #${f.iteration}: ${f.reasons.join("; ")}`)
    }
    console.log(`\nRESULT: ✗ FAILED — ${fails.length} letter(s) contained hallucinations or could not be certified.`)
    process.exit(1)
  }

  console.log(`\nRESULT: ✓ PASSED — 0 hallucinations across ${results.length} letters on ${tiers.join(" / ")}.`)
  console.log("Every delivered letter is grounded in the candidate's own wins, on every plan.")
}

main().catch((err) => {
  console.error("[stress-hallucination] crashed:", err)
  process.exit(1)
})
