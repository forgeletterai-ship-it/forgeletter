/**
 * scripts/recalibrate.ts — post-launch: re-derive the FILLER-split
 * thresholds from ≥500 REAL FILLER scans (swap_stats), replacing the
 * provisional A-vs-B basis, and bump the version. Run when
 * TODO-POSTLAUNCH.md's counter trips; the change is human-reviewed
 * like any threshold change (Rule 13).
 *
 * Run: npx tsx scripts/recalibrate.ts
 */

import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"
config({ path: resolve(process.cwd(), ".env.local") })

import { createClient } from "@supabase/supabase-js"
import { percentile } from "./swap-eval-lib"

const MIN_FILLER_SCANS = 500

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase env missing")
  const db = createClient(url, key)

  const { data, error } = await db
    .from("swap_stats")
    .select("echo, affect_ratio, cv, had_jd")
    .eq("quadrant", "FILLER")
    .order("created_at", { ascending: false })
    .limit(5000)
  if (error) throw error

  const rows = data ?? []
  if (rows.length < MIN_FILLER_SCANS) {
    console.log(`Only ${rows.length} FILLER scans — need ${MIN_FILLER_SCANS}. Not recalibrating.`)
    process.exit(1)
  }

  const echo = rows.map((r) => r.echo).filter((v): v is number => v !== null)
  const affect = rows
    .map((r) => r.affect_ratio)
    .filter((v): v is number => v !== null)
  const cv = rows.map((r) => r.cv).filter((v): v is number => v !== null)

  const prevPath = resolve(process.cwd(), "config/swap-thresholds.json")
  const prev = JSON.parse(readFileSync(prevPath, "utf-8")) as { version: string }
  const prevN = Number(prev.version.match(/(\d+)$/)?.[1] ?? 1)

  const out = {
    version: `real-${prevN + 1}`,
    basis: `real FILLER scans (n=${rows.length})`,
    ranAt: new Date().toISOString(),
    echoHigh: echo.length >= 100 ? percentile(echo, 75) : null,
    affectHigh: affect.length >= 100 ? percentile(affect, 75) : null,
    cvLow: cv.length >= 100 ? percentile(cv, 25) : null,
    notes: [`replaces ${prev.version}`],
  }
  writeFileSync(prevPath, JSON.stringify(out, null, 2))
  console.log(JSON.stringify(out, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
