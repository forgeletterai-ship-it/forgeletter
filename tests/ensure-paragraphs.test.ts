import { describe, expect, it } from "vitest"
import { ensureParagraphs } from "@/lib/agents/agents/writer"

const SENTENCES = Array.from(
  { length: 9 },
  (_, i) => `This is sentence number ${i + 1} of the letter body.`
)

describe("ensureParagraphs", () => {
  it("re-flows a wall-of-text body into three paragraphs (the failure customers saw)", () => {
    const wall = ["Dear Hiring Manager,", "", SENTENCES.join(" "), "", "Sincerely,", "Jane Doe"].join(
      "\n"
    )
    const result = ensureParagraphs(wall)

    const body = result
      .split("\n")
      .slice(2, result.split("\n").findIndex((l) => /^sincerely,$/i.test(l.trim())))
      .join("\n")
    const paragraphs = body.split("\n\n").filter((p) => p.trim().length > 0)

    expect(paragraphs.length).toBe(3)
    expect(result).toContain("Dear Hiring Manager,")
    expect(result).toContain("Sincerely,")
    expect(result).toContain("Jane Doe")
    // No sentence lost in the re-flow.
    for (const s of SENTENCES) expect(result).toContain(s)
  })

  it("leaves a letter that already has paragraphs untouched", () => {
    const structured = [
      "Dear Hiring Manager,",
      "",
      "First paragraph with the hook. It has two sentences.",
      "",
      "Second paragraph with the proof. Also two sentences here.",
      "",
      "Closing paragraph inviting a conversation.",
      "",
      "Sincerely,",
      "Jane Doe",
    ].join("\n")

    expect(ensureParagraphs(structured)).toBe(structured)
  })

  it("does not mangle very short letters", () => {
    const short = ["Dear Hiring Manager,", "", "One sentence only.", "", "Sincerely,"].join("\n")
    expect(ensureParagraphs(short)).toBe(short)
  })
})
