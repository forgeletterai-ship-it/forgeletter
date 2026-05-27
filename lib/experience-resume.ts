import {
  type ExperienceBlock,
  experienceBlockKind,
  experienceBlockLabel,
} from "@/lib/experience-types"

/**
 * Minimal profile shape needed to assemble the resume text fed to the
 * 12-agent pipeline. Defined locally to keep this module free of
 * NextAuth/Supabase imports — that way tests + client code can use it.
 */
export interface ResumeAssemblyProfile {
  professional_headline?: string
  strengths?: string
  qualifications?: string
  notes?: string
  key_achievements?: string
  experience_blocks: ExperienceBlock[]
}

/**
 * Builds the `resumeText` string fed to the 12-agent pipeline from
 * the user's profile + the experience block ids they selected in the
 * Draft Inputs multi-select.
 *
 * Only the selected experience blocks are included — unselected
 * entries are NOT sent to the writer/quality agents, so the
 * generated letter is grounded only in what the user opted in to.
 *
 * The "Qualifications & achievements" row in the multi-select is
 * forced-on and is represented here by always appending the
 * profile's `qualifications` + `strengths` + `notes` text, plus
 * the `professional_headline` so the candidate identity is set.
 */
export function buildResumeTextFromProfile(args: {
  profile: ResumeAssemblyProfile
  selectedExperienceIds: string[]
}): string {
  const { profile, selectedExperienceIds } = args
  const selectedSet = new Set(selectedExperienceIds)
  const selected = profile.experience_blocks.filter((b) => selectedSet.has(b.id))
  return serializeProfileForResume({ profile, blocks: selected })
}

/** All saved blocks selected = the default behaviour for the multi-select. */
export function defaultSelectedExperienceIds(profile: ResumeAssemblyProfile): string[] {
  return profile.experience_blocks.map((b) => b.id)
}

function serializeBlock(block: ExperienceBlock): string {
  const heading = `${experienceBlockKind(block)}: ${experienceBlockLabel(block)}`
  const meta: string[] = []
  if (block.type === "employer") {
    if (block.title || block.role) meta.push(`Role: ${block.title || block.role}`)
    if (block.employmentType) meta.push(`Type: ${block.employmentType}`)
  }
  if (block.type === "internship") {
    if (block.role) meta.push(`Role: ${block.role}`)
    if (block.duration) meta.push(`Duration: ${block.duration}`)
  }
  if (block.type === "university") {
    if (block.degree) meta.push(`Degree: ${block.degree}`)
  }
  if (block.sector) meta.push(`Sector: ${block.sector}`)
  if (block.size) meta.push(`Org size: ${block.size}`)

  const achievementLines = block.achievements
    .map((a) => [a.what, a.number, a.whyItMattered].filter(Boolean).join(" | "))
    .filter(Boolean)
    .map((line) => `  - ${line}`)

  return [heading, ...meta, ...achievementLines].filter(Boolean).join("\n")
}

export function serializeProfileForResume(args: {
  profile: ResumeAssemblyProfile
  blocks: ExperienceBlock[]
}): string {
  const { profile, blocks } = args

  const parts: string[] = []

  if (profile.professional_headline) {
    parts.push(`Candidate: ${profile.professional_headline}`)
  }

  if (blocks.length > 0) {
    parts.push("Experience:")
    for (const block of blocks) {
      parts.push(serializeBlock(block))
    }
  }

  // The "Qualifications & achievements" row in the multi-select is
  // always on — surface the user's saved qualifications + skills here.
  const qualBits: string[] = []
  if (profile.qualifications) qualBits.push(profile.qualifications)
  if (profile.strengths) qualBits.push(`Skills & tools: ${profile.strengths}`)
  if (profile.notes) qualBits.push(`Additional notes: ${profile.notes}`)
  if (qualBits.length > 0) {
    parts.push("Qualifications & achievements:")
    parts.push(qualBits.join("\n"))
  }

  // Fallback: if the user has no structured blocks AND no qualifications,
  // fall back to the legacy key_achievements text so old accounts that
  // never re-saved their profile still get something useful.
  if (parts.length <= 1 && profile.key_achievements) {
    parts.push(profile.key_achievements)
  }

  return parts.join("\n\n")
}
