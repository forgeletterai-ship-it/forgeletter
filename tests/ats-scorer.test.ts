import { describe, expect, it } from "vitest"
import { scoreATSDeterministic } from "@/lib/agents/agents/ats"
import type { JobAnalysis } from "@/lib/agents/types"

function makeJob(overrides: Partial<JobAnalysis>): JobAnalysis {
  return {
    jobTitle: "Product Manager",
    companyName: "Acme",
    industry: "SaaS",
    seniorityRequired: "mid",
    mustHaveSkills: [],
    niceToHaveSkills: [],
    keyResponsibilities: [],
    companyValues: [],
    atsKeywords: [],
    ...overrides,
  }
}

describe("scoreATSDeterministic", () => {
  it("scores a well-matched letter high even when must-have phrases never literally appear (regression: vocab-intersection bug capped scores at ~30)", () => {
    const job = makeJob({
      // Verbatim JD requirement phrases — the old scorer intersected
      // these with atsKeywords and got an empty set.
      mustHaveSkills: [
        "5+ years product management experience",
        "cross-functional collaboration",
      ],
      atsKeywords: ["sql", "roadmap", "a/b testing"],
    })
    const letter = [
      "In eight years of product management I have shipped roadmap",
      "initiatives with cross-functional teams, grounded in SQL-backed",
      "analysis and structured a/b testing programmes.",
    ].join(" ")

    const result = scoreATSDeterministic({ letter, job })

    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.verdict).toBe("ATS Ready")
    expect(result.missingKeywords).toHaveLength(0)
  })

  it("keeps genuinely mismatched candidates low and honest", () => {
    const job = makeJob({
      mustHaveSkills: [
        "registered nurse qualification",
        "acute care experience",
      ],
      atsKeywords: ["triage", "patient records", "icu"],
    })
    const letter =
      "As a growth marketer I scaled paid social campaigns and lifecycle email programmes for SaaS products."

    const result = scoreATSDeterministic({ letter, job })

    expect(result.score).toBeLessThan(40)
    expect(result.verdict).toBe("At Risk")
    // Missing must-have phrases lead the missing list for the
    // dashboard explainer.
    expect(result.missingKeywords[0]).toBe("registered nurse qualification")
  })

  it("gives keyword coverage full weight when the JD yields no must-have phrases", () => {
    const job = makeJob({
      atsKeywords: ["hubspot", "seo", "content marketing", "analytics"],
    })
    const letter =
      "I run content marketing end to end: SEO-led planning in HubSpot with weekly analytics reviews."

    const result = scoreATSDeterministic({ letter, job })

    expect(result.score).toBe(100)
    expect(result.verdict).toBe("ATS Ready")
  })

  it("returns a neutral Good instead of a false zero when the JD yields nothing to score against", () => {
    const job = makeJob({})
    const result = scoreATSDeterministic({ letter: "Any letter body.", job })

    expect(result.score).toBe(70)
    expect(result.verdict).toBe("Good")
    expect(result.coveredKeywords).toHaveLength(0)
    expect(result.missingKeywords).toHaveLength(0)
  })

  it("does not credit a must-have phrase on stopword overlap alone", () => {
    const job = makeJob({
      mustHaveSkills: ["proven experience with kubernetes orchestration"],
      atsKeywords: [],
    })
    // Contains "proven" and "experience" (stopwords) but nothing of
    // substance from the requirement.
    const letter =
      "I have proven experience delivering marketing campaigns under pressure."

    const result = scoreATSDeterministic({ letter, job })

    expect(result.score).toBe(0)
    expect(result.missingKeywords).toContain(
      "proven experience with kubernetes orchestration"
    )
  })
})
