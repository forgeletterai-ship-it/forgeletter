import { describe, expect, it } from "vitest"
import stoplistJson from "@/config/boilerplate-stoplist.json"
import { DEMO_LETTERS, demoFixture } from "@/lib/swap/demo-data"
import { buildFixes } from "@/lib/swap/fixes"
import { inferCompanyTokens, type Stoplist } from "@/lib/swap/idf"
import { applyRedaction, NOTHING_REMOVED, redactionSummary } from "@/lib/swap/redact"
import { classifySentences, quadrantFor, scoreLetter } from "@/lib/swap/score"

const stoplist = stoplistJson as unknown as Stoplist

function classifyDemo(id: "chatgpt" | "forgeletter") {
  const letter = DEMO_LETTERS.find((l) => l.id === id)!
  const { segmented, labels, fullText } = demoFixture(letter)
  return classifySentences(segmented, labels, {
    corpusSize: 0,
    stoplist,
    extraCompanyTokens: inferCompanyTokens(fullText, stoplist),
  })
}

describe("Appendix A regression — the rubric anchor (do not weaken)", () => {
  it("ChatGPT letter scores 0 / 25 / FILLER and redacts nothing", () => {
    const sentences = classifyDemo("chatgpt")
    const scores = scoreLetter(sentences)
    expect(scores.anchor).toBe(0)
    expect(scores.proof).toBe(25)
    expect(scores.quadrant).toBe("FILLER")
    expect(scores.youClaims).toBe(4)
    expect(scores.checkableClaims).toBe(1)
    expect(redactionSummary(applyRedaction(sentences))).toBe(NOTHING_REMOVED)
  })

  it("ForgeLetter letter scores 24±2 / 100 / TARGETED and redacts the opener", () => {
    const sentences = classifyDemo("forgeletter")
    const scores = scoreLetter(sentences)
    expect(Math.abs(scores.anchor - 24)).toBeLessThanOrEqual(2)
    expect(scores.proof).toBe(100)
    expect(scores.quadrant).toBe("TARGETED")
    const redacted = applyRedaction(sentences)
    expect(redacted.filter((s) => s.removed)).toHaveLength(1)
    expect(redacted.find((s) => s.removed)!.text).toContain("Daily Mix")
    expect(redactionSummary(redacted)).not.toBe(NOTHING_REMOVED)
  })
})

describe("quadrant bands", () => {
  it("uses passing 12 / healthy 35 / mixed 66", () => {
    expect(quadrantFor(12, 67)).toBe("TARGETED")
    expect(quadrantFor(12, 66)).toBe("FLATTERY")
    expect(quadrantFor(11, 67)).toBe("CREDENTIALS")
    expect(quadrantFor(11, 66)).toBe("FILLER")
    expect(quadrantFor(0, 0)).toBe("FILLER")
  })
})

describe("fixes — deterministic priority, max 3", () => {
  it("anchor 0 with them-sentences quotes the first boilerplate one", () => {
    const sentences = classifyDemo("chatgpt")
    const fixes = buildFixes(sentences, scoreLetter(sentences))
    expect(fixes.length).toBeGreaterThan(0)
    expect(fixes.length).toBeLessThanOrEqual(3)
    expect(fixes[0].key).toBe("F03")
    expect(fixes[0].quotedSentence).toContain("excited to apply")
    // Asserted you-claims fix carries the count (3 asserted claims).
    const f01 = fixes.find((f) => f.key === "F01")
    expect(f01?.count).toBe(3)
  })

  it("a targeted letter earns no anchor-zero fix", () => {
    const sentences = classifyDemo("forgeletter")
    const fixes = buildFixes(sentences, scoreLetter(sentences))
    expect(fixes.find((f) => f.key === "F03" || f.key === "ENGAGE")).toBeUndefined()
  })
})
