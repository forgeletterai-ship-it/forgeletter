import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Phase 6 grep gates ⚙:
 * - Rule 6 (no authorship language) across the swap UI surfaces —
 *   `AI-written|written by AI|AI-generated|detected|detector|chatgpt|gpt`
 *   is allowed NOWHERE except the demo-data title (the demo letter is
 *   literally labelled with its source tool — that label is Appendix A
 *   verbatim and names the tool, not authorship detection).
 * - Rhythm (S5) never surfaced in UI: no swap component mentions it.
 */

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (/\.(tsx?|css)$/.test(name)) out.push(p)
  }
  return out
}

const roots = [
  resolve(process.cwd(), "components/swap"),
  resolve(process.cwd(), "app/swap-test"),
]

const files = roots.flatMap(walk)

describe("swap UI grep gates", () => {
  it("collects the UI surface", () => {
    expect(files.length).toBeGreaterThanOrEqual(10)
  })

  it("Rule 6: no authorship/detector language in the swap UI", () => {
    const banned = /(AI-written|written by AI|AI-generated|detected|detector|chatgpt|gpt)/i
    // Two verbatim-mandated copy blocks legitimately contain banned
    // tokens and are exempt: the Appendix A demo title (names the
    // tool that produced the example, not authorship detection) and
    // the Appendix C validity statement's Yale-study sentence
    // (Rule 10 ships it verbatim).
    const VERBATIM_EXEMPT = [
      "ChatGPT · generic prompt",
      "of AI-generated letters were submitted within a minute",
    ]
    for (const f of files) {
      const text = readFileSync(f, "utf-8")
      const stripped = VERBATIM_EXEMPT.reduce(
        (acc, v) => acc.split(v).join(" "),
        text
      )
      const hits = stripped.match(new RegExp(banned.source, "gi")) ?? []
      expect(
        hits.length,
        `${f} contains banned authorship language: ${hits.join(", ")}`
      ).toBe(0)
    }
  })

  it("rhythm signal is never surfaced in the UI", () => {
    for (const f of files) {
      const text = readFileSync(f, "utf-8")
      expect(/rhythm|\bcv\b/i.test(text), `${f} mentions the rhythm signal`).toBe(false)
    }
  })
})
