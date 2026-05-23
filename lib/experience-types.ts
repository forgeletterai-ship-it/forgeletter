/**
 * Pure types + display helpers for the user's saved experience blocks.
 *
 * This file has ZERO runtime dependencies on other lib/* modules, so
 * it can be imported by client components, server routes, and unit
 * tests without dragging NextAuth/Supabase into the bundle.
 */

export type ExperienceBlockType = "employer" | "internship" | "university"

export type ExperienceAchievement = {
  id: string
  col0: string
  col1: string
  col2: string
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
