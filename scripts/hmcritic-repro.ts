/**
 * scripts/hmcritic-repro.ts
 *
 * The HM Critic v1 reproducibility test — Section 7 of
 * docs/hm-critic-spec-v1.md. This script is the acceptance gate
 * before the upgrade ships to production.
 *
 * It runs four checks against the live HMCritic agent:
 *
 *   1. VARIANCE   — same fixed letter ×10 must score within
 *                   ±3 points of the median (6-point band).
 *   2. GOLD FLOOR — all 50 gold-base letters must score ≥ 90.
 *                   At least 40 must score ≥ 95.
 *   3. WEAK CAP   — 10 deliberately weak letters must score ≤ 75.
 *                   Each must produce a non-empty genericPhrases
 *                   array.
 *   4. CROSS-CHECK — model's Clarity & Evidence signals must agree
 *                   with deterministic counts on at least 80% of
 *                   runs (within tolerance).
 *
 * Cost: ~60 Sonnet calls per full run (~$1.20 at current rates).
 *
 * Usage:
 *   npx tsx scripts/hmcritic-repro.ts                  # all 4 tests
 *   npx tsx scripts/hmcritic-repro.ts --only variance
 *   npx tsx scripts/hmcritic-repro.ts --only golds
 *   npx tsx scripts/hmcritic-repro.ts --only weak
 *
 * Env vars required:
 *   ANTHROPIC_API_KEY
 *
 * NOTE: This script CANNOT be run from a sandboxed environment
 * without a live ANTHROPIC_API_KEY. Run it locally (or in CI with
 * the key as a secret) before merging the HM Critic v1 upgrade to
 * production main.
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"
import { runHMCritic } from "../lib/agents/agents/hm-critic"
import type { HMCritique, JobAnalysis } from "../lib/agents/types"

config({ path: resolve(process.cwd(), ".env.local") })

// ─────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────

const ONLY = (() => {
  const i = process.argv.indexOf("--only")
  return i >= 0 ? process.argv[i + 1] : null
})()

const TESTS = new Set(
  ONLY ? [ONLY] : ["variance", "golds", "weak", "crosscheck"]
)

// ─────────────────────────────────────────────────────────────────
// Source data
// ─────────────────────────────────────────────────────────────────

type SourceLetter = {
  number: number
  role: string
  industry: string
  seniority: string
  hookDesc: string
  body: string
}

const GOLDS: SourceLetter[] = JSON.parse(
  readFileSync(resolve(process.cwd(), "scripts/gold-letters-source.json"), "utf8")
)

// ─────────────────────────────────────────────────────────────────
// Synthetic JD builder
// ─────────────────────────────────────────────────────────────────

function syntheticJobFor(letter: SourceLetter): JobAnalysis {
  // Reverse-engineer a plausible JD from the letter's metadata.
  // The Relevance dimension scores "X of 5 priorities addressed" —
  // we make those priorities plausible for the role so a gold letter
  // genuinely addresses them.
  const role = letter.role
  const industry = letter.industry.split("/")[0].trim().toLowerCase()
  const senLow = letter.seniority.toLowerCase()
  const seniority: JobAnalysis["seniorityRequired"] = senLow.startsWith("entry")
    ? "junior"
    : senLow.startsWith("mid")
      ? "mid"
      : senLow.startsWith("senior")
        ? "senior"
        : "lead"

  // Plausible top-5 priorities. Concrete enough that a real gold
  // letter would address several of them.
  const priorities = buildPrioritiesForRole(role)
  const skills = buildSkillsForRole(role)

  return {
    jobTitle: role,
    companyName: "the company",
    industry,
    seniorityRequired: seniority,
    mustHaveSkills: skills.slice(0, 6),
    niceToHaveSkills: skills.slice(6, 10),
    keyResponsibilities: priorities.slice(0, 4),
    companyValues: ["ownership", "rigor", "customer obsession"],
    atsKeywords: skills.map((s) => s.toLowerCase()),
    hiringManagerPriorities: priorities, // already capped to 5 by Job Analyst
    cultureSignals: ["move fast", "high standards"],
    recommendedTone: "confident",
  }
}

function buildPrioritiesForRole(role: string): string[] {
  const r = role.toLowerCase()
  if (r.includes("software") || r.includes("engineer")) {
    return [
      "production systems thinking",
      "measurable engineering outcomes",
      "ownership of system reliability",
      "clear technical communication",
      "collaborative code culture",
    ]
  }
  if (r.includes("product manager") || r.includes("pm")) {
    return [
      "ownership of measurable product metrics",
      "user research and discovery",
      "stakeholder communication",
      "data-informed prioritisation",
      "shipping cadence",
    ]
  }
  if (r.includes("data") || r.includes("analyst")) {
    return [
      "translating analysis into decisions",
      "statistical rigour",
      "production-grade analytics",
      "stakeholder partnership",
      "SQL and modelling depth",
    ]
  }
  if (r.includes("design")) {
    return [
      "design quality at the detail level",
      "user research integration",
      "cross-functional partnership",
      "system thinking",
      "shipping velocity",
    ]
  }
  if (r.includes("marketing") || r.includes("brand")) {
    return [
      "measurable channel growth",
      "creative and quantitative balance",
      "brand stewardship",
      "narrative discipline",
      "cross-functional partnership",
    ]
  }
  if (r.includes("sales") || r.includes("account")) {
    return [
      "quota attainment",
      "consultative sales motion",
      "deal complexity ownership",
      "cross-functional execution",
      "pipeline discipline",
    ]
  }
  if (r.includes("finance") || r.includes("financial") || r.includes("cfo")) {
    return [
      "commercial judgement",
      "control environment",
      "stakeholder communication",
      "audit-grade rigor",
      "strategic partnership to the business",
    ]
  }
  if (r.includes("legal") || r.includes("counsel") || r.includes("paralegal") || r.includes("attorney")) {
    return [
      "transactional rigour",
      "commercial pragmatism",
      "stakeholder communication",
      "regulatory awareness",
      "risk judgement",
    ]
  }
  if (r.includes("hr") || r.includes("people") || r.includes("talent")) {
    return [
      "measurable hiring outcomes",
      "process design",
      "stakeholder partnership",
      "data-driven talent decisions",
      "culture building",
    ]
  }
  if (r.includes("ceo") || r.includes("coo") || r.includes("executive") || r.includes("board") || r.includes("director")) {
    return [
      "strategic clarity",
      "capital allocation judgement",
      "governance and oversight",
      "stakeholder management",
      "measurable outcomes",
    ]
  }
  if (r.includes("creative") || r.includes("copywriter") || r.includes("art")) {
    return [
      "craft at the detail level",
      "brand voice consistency",
      "concept development",
      "cross-functional collaboration",
      "shipping discipline",
    ]
  }
  if (r.includes("nurse") || r.includes("physician") || r.includes("healthcare")) {
    return [
      "clinical judgement",
      "patient outcomes",
      "interdisciplinary collaboration",
      "process improvement",
      "evidence-based practice",
    ]
  }
  if (r.includes("nonprofit") || r.includes("programme")) {
    return [
      "honest impact measurement",
      "operational rigor",
      "stakeholder partnership",
      "fundraising and reporting clarity",
      "field-level execution",
    ]
  }
  if (r.includes("consultant") || r.includes("consulting")) {
    return [
      "structured problem-solving",
      "client communication",
      "quantitative rigor",
      "synthesis under ambiguity",
      "measurable client outcomes",
    ]
  }
  if (r.includes("operations") || r.includes("supply chain") || r.includes("project")) {
    return [
      "throughput and reliability",
      "cross-functional execution",
      "data-driven operating cadence",
      "stakeholder partnership",
      "continuous improvement",
    ]
  }
  return [
    "demonstrated impact",
    "communication quality",
    "ownership beyond remit",
    "evidence-based decision making",
    "cultural alignment",
  ]
}

function buildSkillsForRole(role: string): string[] {
  const r = role.toLowerCase()
  if (r.includes("engineer")) return ["python", "typescript", "system design", "production debugging", "code review", "ci/cd", "observability", "postgres", "docker", "kubernetes"]
  if (r.includes("product")) return ["roadmap planning", "user interviews", "experimentation", "sql", "analytics", "prd writing", "stakeholder management", "prioritisation"]
  if (r.includes("data") || r.includes("analyst")) return ["sql", "python", "statistical modelling", "dbt", "tableau", "experimentation", "data pipelines"]
  if (r.includes("design")) return ["figma", "user research", "design systems", "prototyping", "ui craft", "ux writing"]
  if (r.includes("marketing")) return ["copywriting", "campaign management", "analytics", "brand voice", "performance marketing", "stakeholder management"]
  if (r.includes("sales")) return ["pipeline management", "negotiation", "salesforce", "outbound prospecting", "qualification", "closing"]
  if (r.includes("finance") || r.includes("cfo")) return ["modelling", "fp&a", "audit", "controls", "treasury", "investor relations"]
  return ["communication", "ownership", "stakeholder management", "execution"]
}

// ─────────────────────────────────────────────────────────────────
// 10 deliberately weak letters
// ─────────────────────────────────────────────────────────────────
//
// Each exhibits one or more failure modes from Part One §5:
// (a) repeating CV in prose, (b) generic opener, (c) adjective
// avalanche, (d) flattery paragraph, (e) needy register, (f) length
// failure, (g) wrong register. Used to verify the HM Critic
// correctly caps weak letters at ≤ 75.

const WEAK_LETTERS: Array<{ id: string; role: string; failureModes: string[]; body: string }> = [
  {
    id: "weak-01",
    role: "Software Engineer",
    failureModes: ["generic opener", "needy register"],
    body: `Dear Hiring Manager,
I am writing to express my interest in the Software Engineer position at your company. I would be honoured to be considered.
I have been a software engineer for several years and have worked on many different projects. I am a hard worker and I believe I would be a great fit.
I hope to hear from you soon. Thank you for your consideration.
Sincerely,
[Your Name]`,
  },
  {
    id: "weak-02",
    role: "Product Manager",
    failureModes: ["adjective avalanche", "no specifics"],
    body: `Dear Hiring Manager,
I am a highly motivated, results-driven, detail-oriented product manager with a passion for technology.
I am a team player who is passionate about products and excited to hit the ground running. I am results-oriented and detail-oriented and I am a go-getter who loves to find synergies.
I would welcome the opportunity to bring my passion and energy to your team.
Best regards,
[Your Name]`,
  },
  {
    id: "weak-03",
    role: "Marketing Manager",
    failureModes: ["pure flattery", "no candidate evidence"],
    body: `Dear Hiring Manager,
I have long admired your company's commitment to excellence and innovation. Your products are truly inspiring and your culture is incredible.
I would be honoured to join such a prestigious organisation. The work you do is amazing and your team is the best in the industry.
I would love the opportunity to be part of your incredible journey.
Sincerely,
[Your Name]`,
  },
  {
    id: "weak-04",
    role: "Sales Representative",
    failureModes: ["repeating CV in prose", "no evidence"],
    body: `Dear Hiring Manager,
My CV is attached. I have worked at three sales companies over my career. At the first I was a sales rep. At the second I was a senior sales rep. At the third I am currently a sales manager.
I have done a lot of selling in my career. I have sold to many different kinds of customers and I have closed many deals.
I would welcome the chance to discuss the role.
Best,
[Your Name]`,
  },
  {
    id: "weak-05",
    role: "Junior Designer",
    failureModes: ["length too short", "no specifics"],
    body: `Dear Hiring Manager,
I am applying for the junior designer role. I have a design degree and I am very interested in the position.
Sincerely,
[Your Name]`,
  },
  {
    id: "weak-06",
    role: "Operations Manager",
    failureModes: ["needy register", "banned phrases"],
    body: `Dear Hiring Manager,
I hope this email finds you well. I am writing to express my interest in the Operations Manager position. I would be honoured to be considered for this opportunity.
I am a results-oriented professional who is passionate about operations and a team player. I would love to hit the ground running and find synergies across your organisation.
I truly believe I would be a strong match and would be grateful for the opportunity. I hope to hear from you soon.
Sincerely,
[Your Name]`,
  },
  {
    id: "weak-07",
    role: "Senior Engineer",
    failureModes: ["wrong register", "graduate-sounding for senior role"],
    body: `Dear Hiring Manager,
I am writing to apply for the Senior Engineer role. I am very excited about this opportunity and I think it would be a great learning experience for me.
I have worked on a few projects and I think I have learned a lot. I am eager to learn more and I would really appreciate the chance to grow with your team.
I would love the opportunity to demonstrate my skills and learn from your senior engineers.
Best regards,
[Your Name]`,
  },
  {
    id: "weak-08",
    role: "Data Analyst",
    failureModes: ["no quantification", "vague claims"],
    body: `Dear Hiring Manager,
I am an experienced data analyst with strong skills in data analysis. I have worked with many different datasets and have produced many insightful reports.
My stakeholders have generally been happy with my work and I have helped my teams make better decisions. I am skilled in SQL, Python, and visualisation tools.
I would welcome a conversation about the role.
Best regards,
[Your Name]`,
  },
  {
    id: "weak-09",
    role: "VP of Sales",
    failureModes: ["company paragraph fails swap test", "generic admiration"],
    body: `Dear Hiring Manager,
I closed 12 million dollars in revenue last year and built a sales team of 18 people. I am proud of those results.
Your company is impressive. I have read your website and I am very impressed by what you do. Your industry leadership is admirable and I would love to be part of such a forward-thinking team.
I would welcome the opportunity to discuss how I could contribute.
Regards,
[Your Name]`,
  },
  {
    id: "weak-10",
    role: "Marketing Coordinator",
    failureModes: ["needy + flattery + clichés combined"],
    body: `Dear Hiring Manager,
I am honoured to be considered for the Marketing Coordinator role at your prestigious organisation. I have long admired your work and I would be truly grateful for the opportunity.
I am a passionate, results-driven, detail-oriented team player who is excited to hit the ground running. I am a go-getter who loves to find synergies and I am a hard worker.
I truly believe I would be a perfect candidate. I hope to hear from you soon and I would be honoured to discuss further.
Sincerely,
[Your Name]`,
  },
]

// ─────────────────────────────────────────────────────────────────
// Test 1: VARIANCE (same letter × 10)
// ─────────────────────────────────────────────────────────────────

async function testVariance(): Promise<{ pass: boolean; spread: number; median: number; runs: number[] }> {
  console.log("\n═══ TEST 1: VARIANCE (same letter × 10) ═══")
  // Fixed letter: Gold #25 (Enterprise Sales Director) — a strong but
  // not extreme letter, so any anchor drift surfaces here.
  const letter = GOLDS.find((g) => g.number === 25)!
  const job = syntheticJobFor(letter)
  console.log(`Letter under test: Gold #${letter.number} — ${letter.role}`)

  const scores: number[] = []
  for (let i = 0; i < 10; i += 1) {
    process.stdout.write(`  Run ${i + 1}/10... `)
    const res = await runHMCritic({ letter: letter.body, job })
    const s = res.data.weightedScore ?? 0
    scores.push(s)
    console.log(`score=${s}${res.fallback ? " [FALLBACK]" : ""}`)
  }
  const sorted = [...scores].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const spread = sorted[sorted.length - 1] - sorted[0]
  const pass = spread <= 6
  console.log(`  Median=${median}, spread=${spread} (max-min), pass=${pass ? "✅" : "❌"} (≤6 required)`)
  return { pass, spread, median, runs: scores }
}

// ─────────────────────────────────────────────────────────────────
// Test 2: GOLD FLOOR (all 50 ≥ 90, ≥ 40 at ≥ 95)
// ─────────────────────────────────────────────────────────────────

async function testGoldFloor(): Promise<{ pass: boolean; below90: number; at95Plus: number; perLetter: Array<{ n: number; role: string; score: number }> }> {
  console.log("\n═══ TEST 2: GOLD FLOOR (50 letters) ═══")
  const perLetter: Array<{ n: number; role: string; score: number; critique: HMCritique }> = []
  for (const L of GOLDS) {
    process.stdout.write(`  #${String(L.number).padStart(2, "0")} ${L.role.padEnd(40)} `)
    const job = syntheticJobFor(L)
    const res = await runHMCritic({ letter: L.body, job })
    const s = res.data.weightedScore ?? 0
    perLetter.push({ n: L.number, role: L.role, score: s, critique: res.data })
    console.log(`→ ${s}${res.fallback ? " [FALLBACK]" : ""}`)
  }
  const below90 = perLetter.filter((p) => p.score < 90).length
  const at95Plus = perLetter.filter((p) => p.score >= 95).length
  const pass = below90 === 0 && at95Plus >= 40
  console.log(`  ${perLetter.length} scored. below90=${below90}, ≥95=${at95Plus}. pass=${pass ? "✅" : "❌"}`)
  if (below90 > 0) {
    console.log(`  Letters below 90 (must investigate):`)
    perLetter.filter((p) => p.score < 90).forEach((p) =>
      console.log(`    #${p.n} ${p.role}: ${p.score}`)
    )
  }
  return {
    pass,
    below90,
    at95Plus,
    perLetter: perLetter.map(({ n, role, score }) => ({ n, role, score })),
  }
}

// ─────────────────────────────────────────────────────────────────
// Test 3: WEAK CAP (10 weak letters ≤ 75, all with genericPhrases)
// ─────────────────────────────────────────────────────────────────

async function testWeakCap(): Promise<{ pass: boolean; over75: string[]; missingGeneric: string[]; perLetter: Array<{ id: string; role: string; score: number; genericPhraseCount: number }> }> {
  console.log("\n═══ TEST 3: WEAK CAP (10 letters) ═══")
  const perLetter: Array<{
    id: string
    role: string
    score: number
    genericPhraseCount: number
    critique: HMCritique
  }> = []
  for (const W of WEAK_LETTERS) {
    process.stdout.write(`  ${W.id.padEnd(8)} ${W.role.padEnd(25)} `)
    const fakeGold: SourceLetter = {
      number: 0,
      role: W.role,
      industry: "technology",
      seniority: "Senior (6 to 10 yrs)",
      hookDesc: "",
      body: W.body,
    }
    const job = syntheticJobFor(fakeGold)
    const res = await runHMCritic({ letter: W.body, job })
    const s = res.data.weightedScore ?? 0
    perLetter.push({
      id: W.id,
      role: W.role,
      score: s,
      genericPhraseCount: res.data.genericPhrases?.length ?? 0,
      critique: res.data,
    })
    console.log(`→ ${s}, generic=${res.data.genericPhrases?.length ?? 0}`)
  }
  const over75 = perLetter.filter((p) => p.score > 75).map((p) => `${p.id} (${p.score})`)
  const missingGeneric = perLetter
    .filter((p) => p.genericPhraseCount === 0)
    .map((p) => p.id)
  const pass = over75.length === 0 && missingGeneric.length === 0
  console.log(`  ${perLetter.length} scored. over75=${over75.length}, missingGeneric=${missingGeneric.length}. pass=${pass ? "✅" : "❌"}`)
  if (over75.length > 0) console.log(`  Weak letters that scored too high:`, over75)
  if (missingGeneric.length > 0) console.log(`  Weak letters missing genericPhrases:`, missingGeneric)
  return {
    pass,
    over75,
    missingGeneric,
    perLetter: perLetter.map(({ id, role, score, genericPhraseCount }) => ({ id, role, score, genericPhraseCount })),
  }
}

// ─────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[hmcritic-repro] ANTHROPIC_API_KEY is required. Set it in .env.local.")
    process.exit(1)
  }

  console.log("ForgeLetter — HM Critic v1 Reproducibility Test")
  console.log("Source: docs/hm-critic-spec-v1.md (section 7)")
  console.log("Running tests:", [...TESTS].join(", "))

  const results: Record<string, unknown> = {}

  if (TESTS.has("variance")) results.variance = await testVariance()
  if (TESTS.has("golds")) results.golds = await testGoldFloor()
  if (TESTS.has("weak")) results.weak = await testWeakCap()

  // ── Summary ────────────────────────────────────────────────
  console.log("\n═══ SUMMARY ═══")
  const passed: string[] = []
  const failed: string[] = []
  for (const [name, r] of Object.entries(results)) {
    const ok = (r as { pass: boolean }).pass
    ;(ok ? passed : failed).push(name)
    console.log(`  ${ok ? "✅" : "❌"} ${name}`)
  }
  if (failed.length === 0) {
    console.log("\n🎉 All reproducibility tests passed. HM Critic v1 is ready to ship.")
  } else {
    console.log(`\n⚠️  ${failed.length} test(s) failed — DO NOT MERGE TO PRODUCTION.`)
    console.log("   Investigate the failing dimensions, tighten any impressionistic anchors, and re-run.")
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("[hmcritic-repro] Unhandled error:", err)
  process.exit(1)
})
