/**
 * scripts/edit-diff.ts — Phase 7.1 nightly job. Sentence-level diff
 * of delivered vs final text per letter_edits row; classifies each
 * edited/deleted sentence with the swap agent; aggregates which
 * T-codes customers delete, which F-codes they introduce, which
 * phrasings get cut → reports/edit-insights.md.
 *
 * REPORT ONLY (Rule 13): humans decide any FinalEditor/QualityGate
 * change. Run nightly (external scheduler or manually).
 *
 * Run: npx tsx scripts/edit-diff.ts [--limit 200]
 */

import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"
config({ path: resolve(process.cwd(), ".env.local") })

import { createClient } from "@supabase/supabase-js"
import { classifyWithAgent } from "../lib/swap/agent"
import { segmentSentences } from "../lib/swap/segment"

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase env missing")
  const db = createClient(url, key)

  const limitArg = process.argv.indexOf("--limit")
  const limit = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : 200

  const { data: rows, error } = await db
    .from("letter_edits")
    .select("id, delivered_text, final_text, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  if (!rows?.length) {
    console.log("No letter_edits rows yet.")
    return
  }

  const deletedTechniques: Record<string, number> = {}
  const introducedFailures: Record<string, number> = {}
  const cutPhrasings: string[] = []

  for (const row of rows) {
    const delivered = segmentSentences(row.delivered_text ?? "")
    const finalSet = new Set(
      segmentSentences(row.final_text ?? "").map((s) => s.text.toLowerCase())
    )
    const removed = delivered.filter((s) => !finalSet.has(s.text.toLowerCase()))
    if (removed.length === 0) continue

    const reindexed = removed.map((s, i) => ({ ...s, index: i }))
    try {
      const agent = await classifyWithAgent(reindexed)
      for (const label of agent.labels) {
        if (label.technique) {
          deletedTechniques[label.technique] =
            (deletedTechniques[label.technique] ?? 0) + 1
        }
        if (label.failure) {
          introducedFailures[label.failure] =
            (introducedFailures[label.failure] ?? 0) + 1
        }
      }
      // Cut phrasings: short leading fragments only, never full text.
      for (const s of removed.slice(0, 2)) {
        cutPhrasings.push(s.text.split(/\s+/).slice(0, 6).join(" ") + "…")
      }
    } catch (err) {
      console.warn(`row ${row.id}: ${(err as Error).message}`)
    }
  }

  const fmt = (h: Record<string, number>) =>
    Object.entries(h)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n") || "- (none)"

  const report = [
    `# Edit insights — ${new Date().toISOString().slice(0, 10)}`,
    "",
    `Rows analysed: ${rows.length}. REPORT ONLY (Rule 13) — any change`,
    "to FinalEditor/QualityGate/catalogues is a human decision.",
    "",
    "## Technique codes customers deleted",
    fmt(deletedTechniques),
    "",
    "## Failure codes present in deleted sentences",
    fmt(introducedFailures),
    "",
    "## Most-cut phrasings (first words only)",
    ...cutPhrasings.slice(0, 30).map((p) => `- ${p}`),
    "",
  ].join("\n")

  mkdirSync(resolve(process.cwd(), "reports"), { recursive: true })
  writeFileSync(resolve(process.cwd(), "reports/edit-insights.md"), report)
  console.log("wrote reports/edit-insights.md")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
