import { describe, expect, it } from "vitest"
import { affectSignal } from "@/lib/swap/signals/affect"
import { echoOverlap } from "@/lib/swap/signals/echo"
import { rhythmCv } from "@/lib/swap/signals/rhythm"
import { resolveProfile } from "@/lib/swap/profile"
import type { Signals, SwapThresholds } from "@/lib/swap/types"

describe("signals/echo", () => {
  it("returns null without a JD", () => {
    expect(echoOverlap("some letter text here", null)).toBeNull()
    expect(echoOverlap("some letter text here", "   ")).toBeNull()
  })

  it("scores overlap of content trigrams", () => {
    const jd = "We need experience with consumer subscription apps and paywall testing."
    const high = echoOverlap("I have experience with consumer subscription apps.", jd)
    const low = echoOverlap("My bakery ships sourdough to gourmet restaurants nationwide.", jd)
    expect(high).toBeGreaterThan(0)
    expect(low).toBe(0)
  })
})

describe("signals/affect", () => {
  it("counts wordlist terms incl. phrases, ratio over max(checkable,1)", () => {
    const text =
      "I'm excited and thrilled to be the ideal candidate. I deeply admire your dream role."
    const { affectCount, ratio } = affectSignal(text, 0)
    expect(affectCount).toBeGreaterThanOrEqual(5)
    expect(ratio).toBe(affectCount)
  })

  it("divides by checkable claims when present", () => {
    const { ratio, affectCount } = affectSignal("I'm excited.", 4)
    expect(affectCount).toBe(1)
    expect(ratio).toBe(0.25)
  })
})

describe("signals/rhythm", () => {
  it("null under 4 sentences", () => {
    expect(rhythmCv([10, 12, 9])).toBeNull()
  })
  it("uniform lengths → CV 0; varied → CV > 0", () => {
    expect(rhythmCv([10, 10, 10, 10])).toBe(0)
    expect(rhythmCv([4, 30, 9, 18])!).toBeGreaterThan(0.4)
  })
})

describe("profile resolution (Rule 7 — no invented thresholds)", () => {
  const base: Signals = { echo: null, affectCount: 0, affectRatio: 0, cv: null }

  it("non-FILLER quadrants pass through at full confidence", () => {
    expect(resolveProfile("TARGETED", base, false, null)).toEqual({
      profile: "TARGETED",
      confidence: "full",
    })
    expect(resolveProfile("CREDENTIALS", base, true, null)).toEqual({
      profile: "CREDENTIALS",
      confidence: "full",
    })
  })

  it("pre-calibration FILLER defaults to BLANK_PAGE / reduced", () => {
    expect(resolveProfile("FILLER", base, true, null)).toEqual({
      profile: "BLANK_PAGE",
      confidence: "reduced",
    })
  })

  const thresholds: SwapThresholds = {
    version: "provisional-1",
    basis: "A-vs-B pre-launch",
    echoHigh: 0.3,
    affectHigh: 2,
    cvLow: 0.25,
  }

  it("with JD, echo decides at full confidence", () => {
    expect(
      resolveProfile("FILLER", { ...base, echo: 0.5 }, true, thresholds)
    ).toEqual({ profile: "TEMPLATE_FILL", confidence: "full" })
    expect(
      resolveProfile("FILLER", { ...base, echo: 0.1 }, true, thresholds)
    ).toEqual({ profile: "BLANK_PAGE", confidence: "full" })
  })

  it("without JD, affect+rhythm tiebreak at reduced confidence", () => {
    expect(
      resolveProfile(
        "FILLER",
        { ...base, affectRatio: 3, cv: 0.1 },
        false,
        thresholds
      )
    ).toEqual({ profile: "TEMPLATE_FILL", confidence: "reduced" })
    expect(
      resolveProfile(
        "FILLER",
        { ...base, affectRatio: 3, cv: 0.6 },
        false,
        thresholds
      )
    ).toEqual({ profile: "BLANK_PAGE", confidence: "reduced" })
  })

  it("a disabled signal (null threshold) does not vote", () => {
    const partial = { ...thresholds, cvLow: null }
    expect(
      resolveProfile("FILLER", { ...base, affectRatio: 3, cv: 0.9 }, false, partial)
    ).toEqual({ profile: "TEMPLATE_FILL", confidence: "reduced" })
  })
})
