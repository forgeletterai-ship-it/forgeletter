/**
 * scripts/prevalence-report.ts — Phase 7.2 weekly job over
 * swap_stats: failure/technique histograms, opening/closing code
 * distribution, profile mix, per-family corpus progress toward the
 * 200-doc switchover. Report only.
 *
 * Run: npx tsx scripts/prevalence-report.ts
 */

import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"
config({ path: resolve(process.cwd(), ".env.local") })

import { createClient } from "@supabase/supabase-js"

function addHist(total: Record<string, number>, hist: unknown) {
  if (!hist || typeof hist !== "object") return
  for (const [k, v] of Object.entries(hist as Record<string, number>)) {
    total[k] = (total[k] ?? 0) + Number(v || 0)
  }
}

const fmt = (h: Record<string, number>) =>
  Object.entries(h)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n") || "- (none)"

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase env missing")
  const db = createClient(url, key)

  const { data: stats, error } = await db
    .from("swap_stats")
    .select(
      "technique_hist, failure_hist, opening_code, closing_code, profile, role_family, had_jd"
    )
    .order("created_at", { ascending: false })
    .limit(10000)
  if (error) throw error

  const techniques: Record<string, number> = {}
  const failures: Record<string, number> = {}
  const openings: Record<string, number> = {}
  const closings: Record<string, number> = {}
  const profiles: Record<string, number> = {}
  let jdCount = 0

  for (const row of stats ?? []) {
    addHist(techniques, row.technique_hist)
    addHist(failures, row.failure_hist)
    if (row.opening_code) openings[row.opening_code] = (openings[row.opening_code] ?? 0) + 1
    if (row.closing_code) closings[row.closing_code] = (closings[row.closing_code] ?? 0) + 1
    if (row.profile) profiles[row.profile] = (profiles[row.profile] ?? 0) + 1
    if (row.had_jd) jdCount += 1
  }

  const { data: corpus } = await db
    .from("vocab_counts")
    .select("role_family, cnt")
    .eq("gram", "__docs__")

  const n = stats?.length ?? 0
  const report = [
    `# Prevalence report — ${new Date().toISOString().slice(0, 10)}`,
    "",
    `Scans analysed: ${n} · JD supplied: ${n ? Math.round((100 * jdCount) / n) : 0}%`,
    "",
    "## Failure histogram",
    fmt(failures),
    "",
    "## Technique histogram",
    fmt(techniques),
    "",
    "## Opening codes",
    fmt(openings),
    "",
    "## Closing codes",
    fmt(closings),
    "",
    "## Profile mix",
    fmt(profiles),
    "",
    "## Corpus progress (docs per role family / 200 switchover)",
    ...(corpus ?? []).map((r) => `- ${r.role_family}: ${r.cnt}/200`),
    "",
  ].join("\n")

  mkdirSync(resolve(process.cwd(), "reports"), { recursive: true })
  writeFileSync(resolve(process.cwd(), "reports/prevalence.md"), report)
  console.log("wrote reports/prevalence.md")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
