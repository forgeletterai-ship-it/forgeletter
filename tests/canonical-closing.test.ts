import { describe, expect, it } from "vitest"
import {
  CANONICAL_CLOSINGS,
  enforceCanonicalClosing,
} from "@/lib/agents/agents/writer"

const LETTER = (closing: string) =>
  [
    "Dear Hiring Manager,",
    "",
    "In my work at Nordvik Trading, I cut order-to-ship time from 48 to 20 hours.",
    "",
    "Renegotiated carrier contracts saving EUR 210K annually, which funded two packing lines.",
    "",
    `My Lean Six Sigma Green Belt supports exactly this kind of work. ${closing}`,
    "",
    "Sincerely,",
    "Georgi Georgiev",
  ].join("\n")

describe("enforceCanonicalClosing (owner rule: 3 fixed invitations)", () => {
  it("replaces a non-canonical invitation with the tone's canonical closing", () => {
    const result = enforceCanonicalClosing(
      LETTER("I look forward to hearing from you."),
      "professional"
    )
    expect(result).toContain(CANONICAL_CLOSINGS.professional)
    expect(result).not.toContain("I look forward to hearing from you.")
    // The qualifications sentence in the same paragraph survives.
    expect(result).toContain("Lean Six Sigma Green Belt")
    // Greeting and signature untouched.
    expect(result).toContain("Dear Hiring Manager,")
    expect(result).toContain("Georgi Georgiev")
  })

  it("is idempotent when the canonical closing is already present", () => {
    const already = LETTER(CANONICAL_CLOSINGS.warm)
    expect(enforceCanonicalClosing(already, "warm")).toBe(already)
  })

  it("maps every tone to one of the three owner-approved closings", () => {
    expect(CANONICAL_CLOSINGS.professional).toMatch(/^I would welcome the opportunity/)
    expect(CANONICAL_CLOSINGS.confident).toMatch(/^I would be glad to arrange/)
    expect(CANONICAL_CLOSINGS.warm).toMatch(/^I'd be happy to connect/)
    // Concise reuses the confident/direct option (the shortest).
    expect(CANONICAL_CLOSINGS.concise).toBe(CANONICAL_CLOSINGS.confident)
  })

  it("appends the closing when the letter has no invitation at all", () => {
    const result = enforceCanonicalClosing(
      LETTER("The role matches the operations work described above."),
      "confident"
    )
    expect(result).toContain("The role matches the operations work described above.")
    expect(result.indexOf(CANONICAL_CLOSINGS.confident)).toBeGreaterThan(
      result.indexOf("operations work")
    )
  })

  it("keeps the warm closing's question mark as the letter's final body character", () => {
    const result = enforceCanonicalClosing(
      LETTER("I would love to discuss this further."),
      "warm"
    )
    const beforeSignoff = result.split(/\n\s*Sincerely,/i)[0].trim()
    expect(beforeSignoff.endsWith("When would be a good time for us to speak?")).toBe(true)
  })
})
