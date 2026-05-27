/**
 * Pure types + display helpers for the user's saved experience blocks.
 *
 * This file has ZERO runtime dependencies on other lib/* modules, so
 * it can be imported by client components, server routes, and unit
 * tests without dragging NextAuth/Supabase into the bundle.
 */

export type ExperienceBlockType = "employer" | "internship" | "university"

/**
 * An achievement / win row inside an experience block.
 *
 *  - what:           the action / impact statement
 *  - number:         the quantification (e.g. "30%", "$2M ARR", "12 → 40 SDRs")
 *  - whyItMattered:  context that makes the number persuasive
 *
 * Legacy data in JSONB still uses col0 / col1 / col2; the
 * normalizeAchievement() helper below converts either shape into
 * the new names. Writes always use the new names going forward.
 */
export type ExperienceAchievement = {
  id: string
  what: string
  number: string
  whyItMattered: string
}

/** Backwards-compat normalizer: reads both the new (what/number/
 *  whyItMattered) and legacy (col0/col1/col2) shapes from JSONB. */
export function normalizeAchievement(raw: unknown): ExperienceAchievement | null {
  if (!raw || typeof raw !== "object") return null
  const a = raw as Record<string, unknown>
  const id = typeof a.id === "string" ? a.id : ""
  if (!id) return null
  const what =
    typeof a.what === "string"
      ? a.what
      : typeof a.col0 === "string"
        ? a.col0
        : ""
  const number =
    typeof a.number === "string"
      ? a.number
      : typeof a.col1 === "string"
        ? a.col1
        : ""
  const whyItMattered =
    typeof a.whyItMattered === "string"
      ? a.whyItMattered
      : typeof a.col2 === "string"
        ? a.col2
        : ""
  return { id, what, number, whyItMattered }
}

export type ExperienceBlock = {
  id: string
  type: ExperienceBlockType
  company: string
  title: string
  employmentType: string
  sector: string
  size: string
  role: string
  duration: string
  name: string
  degree: string
  achievements: ExperienceAchievement[]
}

/** Display label for an experience block in the multi-select. */
export function experienceBlockLabel(block: ExperienceBlock): string {
  if (block.type === "university") {
    const parts = [block.name, block.degree].filter(Boolean)
    return parts.length ? parts.join(" - ") : "University"
  }
  const parts = [block.company, block.title || block.role].filter(Boolean)
  return parts.length
    ? parts.join(" - ")
    : block.type === "employer"
      ? "Employer"
      : "Internship"
}

/** Short tag shown on the right of each multi-select row. */
export function experienceBlockKind(
  block: ExperienceBlock
): "Employer" | "Internship" | "Academic" {
  if (block.type === "employer") return "Employer"
  if (block.type === "internship") return "Internship"
  return "Academic"
}
