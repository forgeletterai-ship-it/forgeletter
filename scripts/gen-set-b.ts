/**
 * scripts/gen-set-b.ts — Phase 5 Set B: 50 AI-generic letters.
 * Varied fictional job ads + a three-line profile WITH NO NUMBERS →
 * Sonnet writes the letter a lazy prompt would produce. Batch API.
 *
 * Run:  npx tsx scripts/gen-set-b.ts             # submit
 *       npx tsx scripts/gen-set-b.ts --poll ID   # poll + write data/set-b.json
 */

import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"
import Anthropic from "@anthropic-ai/sdk"

config({ path: resolve(process.cwd(), ".env.local") })

const GEN_MODEL = "claude-sonnet-5" // offline generation, not the runtime scan model

const ROLES = [
  "Customer Success Manager", "Frontend Developer", "Data Analyst", "Content Marketer",
  "Operations Coordinator", "Account Executive", "UX Designer", "Financial Controller",
  "HR Generalist", "Product Manager",
]
const COMPANIES = [
  "Bramblehurst", "Veltrona", "Quillstone", "Marovex", "Suncrest Labs",
]
const PROFILES = [
  "Recent graduate in business administration.\nOne internship at a mid-size company.\nEnjoys teamwork and organisation.",
  "Career switcher from hospitality.\nCompleted an online certificate in the field.\nDescribed by colleagues as reliable.",
  "Five years of general experience in the field.\nWorked at two companies.\nEnjoys solving problems and helping customers.",
  "Team lead at a small local firm.\nManages a handful of colleagues.\nInterested in joining a bigger organisation.",
  "Freelancer returning to full-time work.\nVaried project background.\nValues flexibility and growth.",
]

function jobAd(role: string, company: string, i: number): string {
  return `${company} is hiring a ${role}. You will collaborate with cross-functional teams, own key initiatives, and drive measurable results in a fast-paced environment. Requirements: ${
    2 + (i % 4)
  }+ years of relevant experience, excellent communication skills, a proactive attitude, and familiarity with modern tools. We offer a competitive salary, hybrid work, and a supportive culture.`
}

async function main() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const pollId = process.argv.includes("--poll")
    ? process.argv[process.argv.indexOf("--poll") + 1]
    : null

  if (pollId) {
    const batch = await client.messages.batches.retrieve(pollId)
    console.log(`batch ${pollId}: ${batch.processing_status}`)
    if (batch.processing_status !== "ended") return
    const letters: { id: string; jd: string; body: string }[] = []
    for await (const entry of await client.messages.batches.results(pollId)) {
      if (entry.result.type !== "succeeded") continue
      const block = entry.result.message.content[0]
      const body = block?.type === "text" ? block.text.trim() : ""
      const i = Number(entry.custom_id.replace("setb-", ""))
      const role = ROLES[i % ROLES.length]
      const company = COMPANIES[i % COMPANIES.length]
      letters.push({ id: entry.custom_id, jd: jobAd(role, company, i), body })
    }
    mkdirSync(resolve(process.cwd(), "data"), { recursive: true })
    writeFileSync(
      resolve(process.cwd(), "data/set-b.json"),
      JSON.stringify({ letters }, null, 2)
    )
    console.log(`wrote data/set-b.json (${letters.length} letters)`)
    return
  }

  const requests = Array.from({ length: 50 }, (_, i) => {
    const role = ROLES[i % ROLES.length]
    const company = COMPANIES[i % COMPANIES.length]
    const profile = PROFILES[i % PROFILES.length]
    return {
      custom_id: `setb-${i}`,
      params: {
        model: GEN_MODEL,
        max_tokens: 700,
        messages: [
          {
            role: "user" as const,
            content: `Write a cover letter for this job posting.\n\nPOSTING:\n${jobAd(role, company, i)}\n\nABOUT ME:\n${profile}\n\nJust the letter, nothing else.`,
          },
        ],
      },
    }
  })

  const batch = await client.messages.batches.create({ requests })
  console.log(`submitted ${batch.id} — poll with: npx tsx scripts/gen-set-b.ts --poll ${batch.id}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
