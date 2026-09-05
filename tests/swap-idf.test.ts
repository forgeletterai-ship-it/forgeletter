import { describe, expect, it } from "vitest"
import stoplistJson from "@/config/boilerplate-stoplist.json"
import {
  CORPUS_SWITCHOVER,
  inferCompanyTokens,
  phraseIsDistinctive,
  resolveMode,
  sentenceIsDistinctive,
  type Stoplist,
} from "@/lib/swap/idf"

const stoplist = stoplistJson as unknown as Stoplist

const stoplistCtx = { corpusSize: 0, stoplist, companyName: "Chorusline" }

describe("stoplist mode (bootstrap)", () => {
  it("uses stoplist mode under the 200-doc switchover", () => {
    expect(resolveMode(stoplistCtx)).toBe("stoplist")
    expect(
      resolveMode({ corpusSize: CORPUS_SWITCHOVER, stoplist, docFreqs: new Map() })
    ).toBe("corpus")
  })

  it("company name alone never makes a phrase distinctive", () => {
    expect(phraseIsDistinctive("Chorusline's platform", stoplistCtx)).toBe(false)
    expect(
      phraseIsDistinctive("the Senior Product Manager role at Chorusline", stoplistCtx)
    ).toBe(false)
  })

  it("stoplisted phrases are boilerplate", () => {
    expect(phraseIsDistinctive("your conversion challenges", stoplistCtx)).toBe(false)
    expect(phraseIsDistinctive("your commitment to excellence", stoplistCtx)).toBe(false)
  })

  it("a named product decision off-list is distinctive", () => {
    expect(
      phraseIsDistinctive(
        "move to bundle Daily Mix with the family plan",
        stoplistCtx
      )
    ).toBe(true)
  })

  it("a concrete figure is distinctive", () => {
    expect(phraseIsDistinctive("your 340-person Berlin office", stoplistCtx)).toBe(true)
  })

  it("bare geography is not distinctive", () => {
    expect(phraseIsDistinctive("your Berlin growth team", stoplistCtx)).toBe(false)
  })

  it("sentence is distinctive when any phrase is", () => {
    expect(
      sentenceIsDistinctive(
        ["your team", "move to bundle Daily Mix with the family plan"],
        stoplistCtx
      )
    ).toBe(true)
    expect(sentenceIsDistinctive(["your team"], stoplistCtx)).toBe(false)
    expect(sentenceIsDistinctive([], stoplistCtx)).toBe(false)
  })
})

describe("company inference (possessive-anchored)", () => {
  it("a possessively-used name is the employer", () => {
    const text =
      "Chorusline's roadmap impressed me. I want to join Chorusline in Berlin."
    expect(inferCompanyTokens(text, stoplist)).toContain("chorusline")
    expect(inferCompanyTokens(text, stoplist)).not.toContain("berlin")
  })

  it("a repeated PRODUCT name is never swallowed as the employer", () => {
    const text = "I use Daily Mix every morning. Daily Mix changed how I listen."
    expect(inferCompanyTokens(text, stoplist)).toEqual([])
  })

  it("multi-word possessives pull in the preceding name token", () => {
    expect(
      inferCompanyTokens("Nordvale Group's hiring push is impressive.", stoplist)
    ).toEqual(expect.arrayContaining(["group", "nordvale"]))
  })

  it("a bare mention with no possessive is not inferred", () => {
    expect(inferCompanyTokens("I admire Chorusline a lot.", stoplist)).toEqual([])
  })
})

describe("corpus mode", () => {
  it("max token IDF ≥ 2.5 over a ≥200-doc family is distinctive", () => {
    const docFreqs = new Map<string, number>([
      ["platform", 180],
      ["daily", 3],
      ["mix", 4],
    ])
    const ctx = { corpusSize: 200, docFreqs, stoplist, companyName: "Chorusline" }
    expect(phraseIsDistinctive("move to bundle Daily Mix", ctx)).toBe(true)
    expect(phraseIsDistinctive("your platform", ctx)).toBe(false)
  })
})
