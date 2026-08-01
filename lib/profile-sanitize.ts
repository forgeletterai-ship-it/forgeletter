import {
  type ExperienceAchievement,
  type ExperienceBlock,
} from "@/lib/experience-types"
import type { UserProfile } from "@/lib/app-data"

/**
 * Write-path sanitizers for PUT /api/profile. Extracted from the
 * route file so they're unit-testable (route files may only export
 * HTTP handlers).
 *
 * REGRESSION NOTE: cleanAchievement is a whitelist — every field the
 * profile UI can produce MUST be listed here. The per-win
 * skills/tools fields (profile v3) were once missing from this list,
 * so customers typed them, hit Save, and found them empty after
 * reload: the API silently stripped them before the JSONB write.
 * tests/profile-sanitize.test.ts locks the full round-trip.
 */

export function cleanAchievement(input: unknown): ExperienceAchievement | null {
  if (!input || typeof input !== "object") return null
  const a = input as Record<string, unknown>
  const id = typeof a.id === "string" ? a.id : ""
  if (!id) return null
  // Accept BOTH the new (what / number / whyItMattered) and legacy
  // (col0 / col1 / col2) field names on the wire — useful while
  // clients migrate. We always WRITE the new names.
  const what = String(a.what ?? a.col0 ?? "").trim()
  const number = String(a.number ?? a.col1 ?? "").trim()
  const whyItMattered = String(a.whyItMattered ?? a.col2 ?? "").trim()
  // Per-win capabilities (profile v3).
  const skills = String(a.skills ?? "").trim().slice(0, 500)
  const tools = String(a.tools ?? "").trim().slice(0, 500)
  return { id, what, number, whyItMattered, skills, tools }
}

export function cleanBlock(input: unknown): ExperienceBlock | null {
  if (!input || typeof input !== "object") return null
  const b = input as Record<string, unknown>
  const type =
    b.type === "employer" || b.type === "internship" || b.type === "university"
      ? b.type
      : null
  if (!type) return null
  const id = typeof b.id === "string" ? b.id : ""
  if (!id) return null
  const achievementsRaw = Array.isArray(b.achievements) ? b.achievements : []
  const achievements = achievementsRaw
    .map(cleanAchievement)
    .filter((a): a is ExperienceAchievement => a !== null)
  return {
    id,
    type,
    company: String(b.company ?? "").trim(),
    title: String(b.title ?? "").trim(),
    employmentType: String(b.employmentType ?? "").trim(),
    sector: String(b.sector ?? "").trim(),
    size: String(b.size ?? "").trim(),
    role: String(b.role ?? "").trim(),
    duration: String(b.duration ?? "").trim(),
    name: String(b.name ?? "").trim(),
    degree: String(b.degree ?? "").trim(),
    achievements,
  }
}

export function cleanProfile(input: Partial<UserProfile>): UserProfile {
  const rawBlocks = Array.isArray(input.experience_blocks)
    ? input.experience_blocks
    : []
  const experience_blocks = rawBlocks
    .map(cleanBlock)
    .filter((b): b is ExperienceBlock => b !== null)

  return {
    professional_headline: String(input.professional_headline || "").trim(),
    target_roles: String(input.target_roles || "").trim(),
    industries: String(input.industries || "").trim(),
    key_achievements: String(input.key_achievements || "").trim(),
    strengths: String(input.strengths || "").trim(),
    tools: String(input.tools || "").trim(),
    experience_blocks,
    qualifications: String(input.qualifications || "").trim(),
    notes: String(input.notes || "").trim(),
    portfolio_link: String(input.portfolio_link || "").trim(),
  }
}
