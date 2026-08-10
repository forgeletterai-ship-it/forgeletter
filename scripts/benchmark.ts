/**
 * scripts/benchmark.ts — Phase 5.5: the product benchmark behind the
 * Wall's {benchmark_line} (Rule 7/8 — a REAL measured statistic,
 * never an invented average). Classifies ~100 exported generated
 * letters and writes median Anchor/Proof + n to config/benchmark.json.
 *
 * The export itself is human-gated (STOP AND ASK): place it at
 * data/benchmark-letters.json as {"letters":[{"id","body"}]}.
 * Until this has run, the Wall uses the verified single-example
 * fallback from templates.ts.
 *
 * Run: npx tsx scripts/benchmark.ts
 */

import { existsSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"
config({ path: resolve(process.cwd(), ".env.local") })

import { loadJson, mapLimit, median, scanLetter } from "./swap-eval-lib"

const CONCURRENCY = 4

async function main() {
  const path = resolve(process.cwd(), "data/benchmark-letters.json")
  if (!existsSync(path)) {
    console.log(
      "data/benchmark-letters.json missing — the ~100-letter export is human-gated (STOP AND ASK). Wall stays on the verified fallback."
    )
    process.exit(1)
  }
  const letters = loadJson<{ letters: { id: string; body: string }[] }>(
    "data/benchmark-letters.json"
  ).letters

  console.log(`Benchmarking ${letters.length} generated letters…`)
  const scans = await mapLimit(letters, CONCURRENCY, (l) => scanLetter(l.body))

  const out = {
    ranAt: new Date().toISOString(),
    n: letters.length,
    medianAnchor: Math.round(median(scans.map((s) => s.scores.anchor))),
    medianProof: Math.round(median(scans.map((s) => s.scores.proof))),
  }
  writeFileSync(
    resolve(process.cwd(), "config/benchmark.json"),
    JSON.stringify(out, null, 2)
  )
  console.log(JSON.stringify(out, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
