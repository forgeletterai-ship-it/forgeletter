/**
 * Unit tests for the helper that turns a user's saved profile +
 * the multi-select's chosen experience ids into the `resumeText`
 * string fed to the 12-agent pipeline.
 *
 * Verifies the load-bearing contract: unselected experience blocks
 * MUST NOT appear in the assembled resume text — that's what makes
 * the "Experiences to include" multi-select actually mean what it
 * says.
 */
import { describe, expect, it } from "vitest"
import type { ExperienceBlock } from "@/lib/experience-types"
import {
  buildResumeTextFromProfile,
  defaultSelectedExperienceIds,
  type ResumeAssemblyProfile,
} from "@/lib/experience-resume"

function block(
  overrides: Partial<ExperienceBlock> & Pick<ExperienceBlock, "id" | "type">
): ExperienceBlock {
  return {
    company: "",
    title: "",
    employmentType: "",
    sector: "",
    size: "",
    role: "",
    duration: "",
    name: "",
    degree: "",
    achievements: [],
    ...overrides,
  }
}

const sampleBlocks: ExperienceBlock[] = [
  block({
    id: "emp-helix",
    type: "employer",
    company: "Helix Systems",
    title: "Senior Engineer",
    achievements: [
      { id: "a1", what: "Cut p99 latency", number: "380ms -> 42ms", whyItMattered: "Customer satisfaction +18%" },
    ],
  }),
  block({
    id: "emp-plinth",
    type: "employer",
    company: "Plinth Labs",
    title: "Software Engineer",
    achievements: [
      { id: "a2", what: "Built billing service", number: "EUR40M ARR", whyItMattered: "Passed SOC2 type II" },
    ],
  }),
  block({
    id: "uni-kth",
    type: "university",
    name: "KTH",
    degree: "BSc Computer Science",
  }),
]

const sampleProfile: ResumeAssemblyProfile = {
  professional_headline: "Senior engineer in payments",
  strengths: "Distributed systems, API design",
  tools: "Go, Postgres, Kafka",
  qualifications: "SOC2 lead, ISTQB certified",
  experience_blocks: sampleBlocks,
}

describe("defaultSelectedExperienceIds", () => {
  it("returns every saved block id (default = all selected)", () => {
    const ids = defaultSelectedExperienceIds(sampleProfile)
    expect(ids).toEqual(["emp-helix", "emp-plinth", "uni-kth"])
  })

  it("returns empty array if there are no saved blocks", () => {
    expect(defaultSelectedExperienceIds({ experience_blocks: [] })).toEqual([])
  })
})

describe("buildResumeTextFromProfile", () => {
  it("includes ONLY the selected experiences — unselected entries are not in the output", () => {
    const text = buildResumeTextFromProfile({
      profile: sampleProfile,
      selectedExperienceIds: ["emp-helix"],
    })
    expect(text).toMatch(/Helix Systems/)
    expect(text).toMatch(/Senior Engineer/)
    expect(text).toMatch(/Cut p99 latency/)

    // Crucial: Plinth Labs (unselected) must NOT appear anywhere
    expect(text).not.toMatch(/Plinth Labs/)
    expect(text).not.toMatch(/Built billing service/)
    expect(text).not.toMatch(/SOC2 type II/) // achievement text from Plinth
    // Crucial: KTH (unselected) must NOT appear either
    expect(text).not.toMatch(/KTH/)
    expect(text).not.toMatch(/BSc Computer Science/)
  })

  it("always includes qualifications + skills + headline (forced-on row)", () => {
    const text = buildResumeTextFromProfile({
      profile: sampleProfile,
      selectedExperienceIds: [], // no experiences selected
    })
    expect(text).toMatch(/Senior engineer in payments/) // headline
    expect(text).toMatch(/Qualifications & achievements/) // section heading
    expect(text).toMatch(/SOC2 lead, ISTQB certified/) // qualifications
    expect(text).toMatch(/Skills: Distributed systems, API design/) // strengths
    expect(text).toMatch(/Tools & software: Go, Postgres, Kafka/) // tools

    // No experience sections when nothing selected
    expect(text).not.toMatch(/Helix Systems/)
    expect(text).not.toMatch(/Plinth Labs/)
  })

  it("falls back to legacy key_achievements only when there's nothing else", () => {
    const profile: ResumeAssemblyProfile = {
      experience_blocks: [],
      key_achievements: "Legacy serialised text from before the migration",
    }
    const text = buildResumeTextFromProfile({
      profile,
      selectedExperienceIds: [],
    })
    expect(text).toMatch(/Legacy serialised text/)
  })
})
