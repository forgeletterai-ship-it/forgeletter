/**
 * scripts/reliability.ts — Phase 5: A+B+F twice each. Gates:
 * anchor MAD ≤4 · proof MAD ≤6 · quadrant agreement ≥95% ·
 * per-binary Cohen's κ ≥0.75. Writes achieved agreement to
 * config/reliability.json (the FAQ renders it).
 *
 * Run: npx tsx scripts/reliability.ts
 */

import { existsSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"
config({ path: resolve(process.cwd(), ".env.local") })

import {
  cohensKappa,
  loadGold,
  loadJson,
  mapLimit,
  pairedMad,
  scanLetter,
} from "./swap-eval-lib"

const CONCURRENCY = 4

async function main() {
  const letters: { id: string; body: string }[] = [...loadGold()]
  for (const name of ["data/set-b.json", "data/set-f.json"]) {
    if (existsSync(resolve(process.cwd(), name))) {
      const set = loadJson<{ letters: { id: string; body: string }[] }>(name)
      letters.push(...set.letters)
    } else {
      console.log(`${name} missing — run the gen script first`)
      process.exit(1)
    }
  }

  console.log(`Scanning ${letters.length} letters twice…`)
  const run1 = await mapLimit(letters, CONCURRENCY, (l) => scanLetter(l.body))
  const run2 = await mapLimit(letters, CONCURRENCY, (l) => scanLetter(l.body))

  const anchorMad = pairedMad(
    run1.map((s) => s.scores.anchor),
    run2.map((s) => s.scores.anchor)
  )
  const proofMad = pairedMad(
    run1.map((s) => s.scores.proof),
    run2.map((s) => s.scores.proof)
  )
  const quadrantAgreement =
    run1.filter((s, i) => s.scores.quadrant === run2[i].scores.quadrant).length /
    run1.length

  const binaries = ["structural", "aboutThem", "aboutYou", "checkable"] as const
  const kappa: Record<string, number> = {}
  for (const key of binaries) {
    const a: boolean[] = []
    const b: boolean[] = []
    for (let i = 0; i < run1.length; i++) {
      const n = Math.min(run1[i].sentences.length, run2[i].sentences.length)
      for (let j = 0; j < n; j++) {
        a.push(Boolean(run1[i].sentences[j][key]))
        b.push(Boolean(run2[i].sentences[j][key]))
      }
    }
    kappa[key] = cohensKappa(a, b)
  }

  const gates = {
    anchorMad: anchorMad <= 4,
    proofMad: proofMad <= 6,
    quadrantAgreement: quadrantAgreement >= 0.95,
    kappa: Object.values(kappa).every((k) => k >= 0.75),
  }
  const pass = Object.values(gates).every(Boolean)

  const out = {
    ranAt: new Date().toISOString(),
    n: letters.length,
    anchorMad,
    proofMad,
    quadrantAgreement: Math.round(quadrantAgreement * 1000) / 10, // percent, 1dp
    kappa,
    gates,
  }
  writeFileSync(
    resolve(process.cwd(), "config/reliability.json"),
    JSON.stringify(out, null, 2)
  )
  console.log(JSON.stringify(out, null, 2))
  console.log(pass ? "RELIABILITY GATES PASS" : "RELIABILITY GATES FAILED")
  process.exit(pass ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
