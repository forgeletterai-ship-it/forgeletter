/**
 * scripts/gen-set-f.ts — Phase 5 Set F: 50 planted single-failure
 * degradations of gold letters. Each letter gets exactly ONE failure
 * planted (round-robin F01–F08), e.g. "from 12 percent to 54
 * percent" → "significantly" for F01. Batch API; the planted code is
 * the ground-truth label eval-agent.ts scores recall against.
 *
 * Run:  npx tsx scripts/gen-set-f.ts             # submit
 *       npx tsx scripts/gen-set-f.ts --poll ID   # poll + write data/set-f.json
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"
import Anthropic from "@anthropic-ai/sdk"
import catalogue from "../config/catalogue.v0.1.json"

config({ path: resolve(process.cwd(), ".env.local") })

const GEN_MODEL = "claude-sonnet-5"

const cat = catalogue as unknown as {
  failures: { id: string; name: string; definition: string; trigger: string }[]
}

async function main() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const pollId = process.argv.includes("--poll")
    ? process.argv[process.argv.indexOf("--poll") + 1]
    : null

  const gold = JSON.parse(
    readFileSync(resolve(process.cwd(), "scripts/gold-letters-source.json"), "utf-8")
  ) as { number: number; body: string }[]

  if (pollId) {
    const batch = await client.messages.batches.retrieve(pollId)
    console.log(`batch ${pollId}: ${batch.processing_status}`)
    if (batch.processing_status !== "ended") return
    const letters: {
      id: string
      sourceNumber: number
      plantedFailure: string
      body: string
    }[] = []
    for await (const entry of await client.messages.batches.results(pollId)) {
      if (entry.result.type !== "succeeded") continue
      const block = entry.result.message.content[0]
      const body = block?.type === "text" ? block.text.trim() : ""
      const [, idxStr, code] = entry.custom_id.split("-") // setf-<i>-<F0x>
      const i = Number(idxStr)
      letters.push({
        id: entry.custom_id,
        sourceNumber: gold[i]?.number ?? i,
        plantedFailure: code,
        body,
      })
    }
    mkdirSync(resolve(process.cwd(), "data"), { recursive: true })
    writeFileSync(
      resolve(process.cwd(), "data/set-f.json"),
      JSON.stringify({ letters }, null, 2)
    )
    console.log(`wrote data/set-f.json (${letters.length} letters)`)
    return
  }

  const requests = gold.slice(0, 50).map((rec, i) => {
    const failure = cat.failures[i % cat.failures.length]
    return {
      custom_id: `setf-${i}-${failure.id}`,
      params: {
        model: GEN_MODEL,
        max_tokens: 900,
        messages: [
          {
            role: "user" as const,
            content: [
              `Here is a strong cover letter. Degrade it by introducing EXACTLY ONE flaw, leaving everything else untouched:`,
              ``,
              `FLAW TO PLANT — ${failure.id} ${failure.name}: ${failure.definition} (${failure.trigger})`,
              ``,
              `Rewrite the minimum number of sentences (usually one) so the letter now commits this flaw. For example, planting "verb without magnitude" means replacing a before/after metric with a vague verb like "significantly improved". Do not add new flaws, do not improve anything, do not comment.`,
              ``,
              `LETTER:`,
              rec.body,
              ``,
              `Return only the full modified letter.`,
            ].join("\n"),
          },
        ],
      },
    }
  })

  const batch = await client.messages.batches.create({ requests })
  console.log(`submitted ${batch.id} — poll with: npx tsx scripts/gen-set-f.ts --poll ${batch.id}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
