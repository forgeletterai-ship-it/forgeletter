/**
 * scripts/extract-techniques.ts — Phase 3.1
 *
 * Per approved gold letter, Sonnet names what each sentence is
 * *doing* ("the move, not the content") via the Batch API (~$0.20,
 * 50% off online pricing). Output: data/technique-extraction.json —
 * the raw material for catalogue iteration (the seed catalogue
 * v0.1 ships from the build doc regardless; this refines triggers).
 *
 * Run:
 *   npx tsx scripts/extract-techniques.ts            # submit batch
 *   npx tsx scripts/extract-techniques.ts --poll ID  # poll + write
 */

import { resolve } from "node:path"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { config } from "dotenv"
import Anthropic from "@anthropic-ai/sdk"

config({ path: resolve(process.cwd(), ".env.local") })

// Offline extraction job — NOT the runtime scan model (that stays
// pinned to Haiku per the Part I builder note).
const EXTRACT_MODEL = "claude-sonnet-5"

interface GoldRecord {
  number: number
  role: string
  industry: string
  seniority: string
  hookDesc: string
  body: string
}

const PROMPT_HEADER = `You are analysing a strong cover letter, sentence by sentence.
For each numbered sentence, name the MOVE it performs — what the
sentence is doing rhetorically, not what it says. Examples of moves:
"states a metric with its baseline", "references a decision the
employer made", "names a failed attempt before the win", "states
exact ownership scope". One short move description per sentence.
Respond as JSON: {"moves":[{"i":<sentence number>,"move":"..."}]}
No other text.`

function sentences(body: string): string[] {
  const seg = new Intl.Segmenter("en", { granularity: "sentence" })
  const out: string[] = []
  for (const part of seg.segment(body.replace(/\r\n/g, "\n"))) {
    const t = part.segment.trim()
    if (t) out.push(t)
  }
  return out
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

    const results: Record<string, unknown> = {}
    for await (const entry of await client.messages.batches.results(pollId)) {
      if (entry.result.type === "succeeded") {
        const content = entry.result.message.content[0]
        const text = content.type === "text" ? content.text : ""
        try {
          results[entry.custom_id] = JSON.parse(text)
        } catch {
          results[entry.custom_id] = { parseError: true }
        }
      } else {
        results[entry.custom_id] = { error: entry.result.type }
      }
    }
    mkdirSync(resolve(process.cwd(), "data"), { recursive: true })
    const outPath = resolve(process.cwd(), "data/technique-extraction.json")
    writeFileSync(outPath, JSON.stringify(results, null, 2))
    console.log(`wrote ${outPath} (${Object.keys(results).length} letters)`)
    return
  }

  const gold: GoldRecord[] = JSON.parse(
    readFileSync(resolve(process.cwd(), "scripts/gold-letters-source.json"), "utf-8")
  )

  const requests = gold.map((rec) => {
    const numbered = sentences(rec.body)
      .map((s, i) => `${i}. ${s}`)
      .join("\n")
    return {
      custom_id: `gold-${rec.number}`,
      params: {
        model: EXTRACT_MODEL,
        max_tokens: 1024,
        temperature: 0,
        messages: [
          {
            role: "user" as const,
            content: `${PROMPT_HEADER}\n\nRole: ${rec.role} (${rec.industry}, ${rec.seniority})\n\n${numbered}`,
          },
        ],
      },
    }
  })

  const batch = await client.messages.batches.create({ requests })
  console.log(`submitted batch ${batch.id} (${requests.length} letters)`)
  console.log(`poll with: npx tsx scripts/extract-techniques.ts --poll ${batch.id}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
