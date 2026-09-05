/**
 * scripts/calibrate.ts — Phase 5: derive the FILLER-split thresholds
 * from A-vs-B distributions (Rule 7 — measured, never invented):
 *   echoHigh  = P75(B echo)   (B letters carry their generated JDs)
 *   affectHigh= P75(B affect)
 *   cvLow     = P25(A cv)
 * A signal whose A/B IQRs overlap is disabled (null) and noted.
 * Writes config/swap-thresholds.json {version:'provisional-1'}.
 *
 * Run: npx tsx scripts/calibrate.ts
 */

import { existsSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"
config({ path: resolve(process.cwd(), ".env.local") })

import { loadGold, loadJson, mapLimit, percentile, scanLetter } from "./swap-eval-lib"

const CONCURRENCY = 4

function iqrOverlap(a: number[], b: number[]): boolean {
  const a25 = percentile(a, 25)
  const a75 = percentile(a, 75)
  const b25 = percentile(b, 25)
  const b75 = percentile(b, 75)
  return Math.max(a25, b25) <= Math.min(a75, b75)
}

async function main() {
  if (!existsSync(resolve(process.cwd(), "data/set-b.json"))) {
    console.log("data/set-b.json missing — run gen-set-b.ts first")
    process.exit(1)
  }
  const gold = loadGold()
  const setB = loadJson<{ letters: { id: string; jd: string; body: string }[] }>(
    "data/set-b.json"
  ).letters

  console.log(`Scanning A (${gold.length}) and B (${setB.length})…`)
  const aScans = await mapLimit(gold, CONCURRENCY, (l) => scanLetter(l.body))
  const bScans = await mapLimit(setB, CONCURRENCY, (l) => scanLetter(l.body, l.jd))

  const bEcho = bScans.map((s) => s.echo).filter((e): e is number => e !== null)
  const aAffect = aScans.map((s) => s.affectRatio)
  const bAffect = bScans.map((s) => s.affectRatio)
  const aCv = aScans.map((s) => s.cv).filter((c): c is number => c !== null)
  const bCv = bScans.map((s) => s.cv).filter((c): c is number => c !== null)

  const notes: string[] = []

  // Echo has no A distribution (gold letters ship without JDs), so
  // the overlap check cannot disqualify it — it is B-calibrated.
  const echoHigh = bEcho.length >= 10 ? percentile(bEcho, 75) : null
  if (echoHigh === null) notes.push("echo disabled: too few B echo values")

  let affectHigh: number | null = percentile(bAffect, 75)
  if (iqrOverlap(aAffect, bAffect)) {
    affectHigh = null
    notes.push("affect disabled: A/B IQRs overlap")
  }

  let cvLow: number | null = percentile(aCv, 25)
  if (iqrOverlap(aCv, bCv)) {
    cvLow = null
    notes.push("cv disabled: A/B IQRs overlap")
  }

  const out = {
    version: "provisional-1",
    basis: "A-vs-B pre-launch",
    ranAt: new Date().toISOString(),
    echoHigh,
    affectHigh,
    cvLow,
    notes,
  }
  writeFileSync(
    resolve(process.cwd(), "config/swap-thresholds.json"),
    JSON.stringify(out, null, 2)
  )
  console.log(JSON.stringify(out, null, 2))
  console.log(
    "Recalibration obligation: re-derive at 500 real FILLER scans (scripts/recalibrate.ts) — recorded in TODO-POSTLAUNCH.md"
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
