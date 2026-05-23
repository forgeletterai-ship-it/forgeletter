import { NextRequest, NextResponse } from "next/server"
import {
  dataErrorMessage,
  defaultProfile,
  getCurrentAppUser,
  getUserProfile,
  type ExperienceAchievement,
  type ExperienceBlock,
  type UserProfile,
} from "@/lib/app-data"
import { supabaseAdmin } from "@/lib/supabase"

function cleanAchievement(input: unknown): ExperienceAchievement | null {
  if (!input || typeof input !== "object") return null
  const a = input as Record<string, unknown>
  const id = typeof a.id === "string" ? a.id : ""
  if (!id) return null
  return {
    id,
    col0: String(a.col0 ?? "").trim(),
    col1: String(a.col1 ?? "").trim(),
    col2: String(a.col2 ?? "").trim(),
  }
}

function cleanBlock(input: unknown): ExperienceBlock | null {
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

function cleanProfile(input: Partial<UserProfile>): UserProfile {
  const rawBlocks = Array.isArray(input.experience_blocks) ? input.experience_blocks : []
  const experience_blocks = rawBlocks
    .map(cleanBlock)
    .filter((b): b is ExperienceBlock => b !== null)

  return {
    professional_headline: String(input.professional_headline || "").trim(),
    target_roles: String(input.target_roles || "").trim(),
    industries: String(input.industries || "").trim(),
    key_achievements: String(input.key_achievements || "").trim(),
    strengths: String(input.strengths || "").trim(),
    experience_blocks,
    qualifications: String(input.qualifications || "").trim(),
    notes: String(input.notes || "").trim(),
  }
}

export async function GET() {
  const { user, error } = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const { profile, setupError } = await getUserProfile(user.id)
  return NextResponse.json({ profile, setupError })
}

export async function PUT(req: NextRequest) {
  const { user, error } = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as Partial<UserProfile>
  const profile = cleanProfile({ ...defaultProfile, ...body })

  try {
    const { data, error: saveError } = await supabaseAdmin
      .from("user_profiles")
      .upsert(
        {
          user_id: user.id,
          professional_headline: profile.professional_headline,
          target_roles: profile.target_roles,
          industries: profile.industries,
          key_achievements: profile.key_achievements,
          strengths: profile.strengths,
          experience_blocks: profile.experience_blocks,
          qualifications: profile.qualifications,
          notes: profile.notes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select(
        "professional_headline,target_roles,industries,key_achievements,strengths,experience_blocks,qualifications,notes"
      )
      .single()

    if (saveError) {
      return NextResponse.json(
        { error: dataErrorMessage(saveError, "user_profiles") },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile: data })
  } catch (error) {
    return NextResponse.json(
      { error: dataErrorMessage(error, "user_profiles") },
      { status: 500 }
    )
  }
}
