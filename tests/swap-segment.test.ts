import { describe, expect, it } from "vitest"
import { countWords, segmentSentences } from "@/lib/swap/segment"

describe("segment.ts contract", () => {
  it("keeps abbreviations and decimals in one sentence", () => {
    const out = segmentSentences("Dr. Smith raised 6.1% (e.g. quarterly).")
    expect(out).toHaveLength(1)
    expect(out[0].text).toBe("Dr. Smith raised 6.1% (e.g. quarterly).")
  })

  it("preserves order and indexes", () => {
    const out = segmentSentences(
      "Dear Hiring Manager,\nFirst sentence here. Second sentence here. Third one!"
    )
    expect(out.map((s) => s.index)).toEqual([0, 1, 2, 3])
    expect(out[0].text).toBe("Dear Hiring Manager,")
    expect(out[3].text).toBe("Third one!")
  })

  it("returns [] for empty input", () => {
    expect(segmentSentences("")).toEqual([])
    expect(segmentSentences("   \n  ")).toEqual([])
  })

  it("counts words without counting bare punctuation", () => {
    expect(countWords("one two three")).toBe(3)
    expect(countWords("wins — losses")).toBe(2)
    expect(countWords("6.1% to 8.4%")).toBe(3)
    expect(countWords("")).toBe(0)
  })
})
