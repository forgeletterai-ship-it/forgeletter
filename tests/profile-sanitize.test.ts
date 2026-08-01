import { describe, expect, it } from "vitest"
import { cleanAchievement, cleanProfile } from "@/lib/profile-sanitize"
import { normalizeAchievement } from "@/lib/experience-types"

describe("profile save-path sanitizers", () => {
  it("preserves per-win skills and tools through a save round-trip (regression: they were silently stripped)", () => {
    const saved = cleanProfile({
      professional_headline: "Operations manager",
      qualifications: "Lean Six Sigma Green Belt",
      experience_blocks: [
        {
          id: "b1",
          type: "employer",
          company: "Nordvik Trading",
          title: "Operations Manager",
          employmentType: "Full time",
          sector: "Retail & Ecommerce",
          size: "201-1000",
          role: "",
          duration: "",
          name: "",
          degree: "",
          achievements: [
            {
              id: "a1",
              what: "Cut order-to-ship time",
              number: "48h to 20h",
              whyItMattered: "Complaints dropped by a third",
              skills: "process mapping, bottleneck analysis",
              tools: "Excel, Power BI",
            },
          ],
        },
      ],
    })

    const win = saved.experience_blocks[0].achievements[0]
    expect(win.skills).toBe("process mapping, bottleneck analysis")
    expect(win.tools).toBe("Excel, Power BI")
    expect(saved.qualifications).toBe("Lean Six Sigma Green Belt")

    // And the READ normalizer must round-trip the same fields.
    const reread = normalizeAchievement(win)
    expect(reread?.skills).toBe("process mapping, bottleneck analysis")
    expect(reread?.tools).toBe("Excel, Power BI")
  })

  it("defaults absent skills/tools to empty strings and caps runaway input", () => {
    const bare = cleanAchievement({ id: "a2", what: "Did a thing" })
    expect(bare).toMatchObject({ skills: "", tools: "" })

    const long = cleanAchievement({ id: "a3", what: "x", tools: "y".repeat(2000) })
    expect(long?.tools).toHaveLength(500)
  })

  it("still reads legacy col0/col1/col2 wire shapes", () => {
    const legacy = cleanAchievement({
      id: "a4",
      col0: "Renegotiated contracts",
      col1: "EUR 210K",
      col2: "Funded packing lines",
    })
    expect(legacy).toMatchObject({
      what: "Renegotiated contracts",
      number: "EUR 210K",
      whyItMattered: "Funded packing lines",
    })
  })
})
