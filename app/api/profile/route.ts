import { NextRequest, NextResponse } from "next/server"
import {
  dataErrorMessage,
  defaultProfile,
  getCurrentAppUser,
  getSupabaseSchemaCapabilities,
  getUserProfile,
  resetSchemaCapabilitiesCache,
  type ExperienceAchievement,
  type ExperienceBlock,
  type UserProfile,
} from "@/lib/app-data"
import { supabaseAdmin } from "@/lib/supabase"

export const runtime = "nodejs"

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

function looksLikeMissingColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  if (err.code === "42703" || err.code === "PGRST204") return true
  const m = err.message || ""
  return /column .* does not exist/i.test(m) || /could not find the .* column/i.test(m)
}

export async function GET() {
  const { user, error } = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const { profile, setupError } = await getUserProfile(user.id)
  const capabilities = await getSupabaseSchemaCapabilities()
  return NextResponse.json({
    profile,
    setupError,
    capabilities,
  })
}

export async function PUT(req: NextRequest) {
  const { user, error } = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as Partial<UserProfile>
  const profile = cleanProfile({ ...defaultProfile, ...body })

  const capabilities = await getSupabaseSchemaCapabilities()

  type Payload = Record<string, unknown>
  const basePayload: Payload = {
    user_id: user.id,
    professional_headline: profile.professional_headline,
    target_roles: profile.target_roles,
    industries: profile.industries,
    key_achievements: profile.key_achievements,
    strengths: profile.strengths,
    updated_at: new Date().toISOString(),
  }

  // Only include the new columns in the upsert if the schema actually
  // has them — otherwise Supabase rejects the request with
  // "column X does not exist" which would surface as a generic
  // workspace-action error to the user.
  const newPayloadBits: Payload = {}
  if (capabilities.userProfileExperienceBlocks) {
    newPayloadBits.experience_blocks = profile.experience_blocks
    newPayloadBits.qualifications = profile.qualifications
    newPayloadBits.notes = profile.notes
  }

  const fullCols =
    "professional_headline,target_roles,industries,key_achievements,strengths,experience_blocks,qualifications,notes"
  const legacyCols =
    "professional_headline,target_roles,industries,key_achievements,strengths"

  async function upsert(payload: Payload, returnCols: string) {
    return await supabaseAdmin
      .from("user_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select(returnCols)
      .single()
  }

  try {
    let saveError: { code?: string; message?: string } | null = null
    let data: Record<string, unknown> | null = null

    if (capabilities.userProfileExperienceBlocks) {
      const result = await upsert({ ...basePayload, ...newPayloadBits }, fullCols)
      data = result.data as Record<string, unknown> | null
      saveError = (result.error ?? null) as
        | { code?: string; message?: string }
        | null

      // Race condition: capabilities cache said the columns exist but
      // the actual upsert says otherwise. Reset cache and retry with
      // legacy columns so the save still succeeds.
      if (saveError && looksLikeMissingColumn(saveError)) {
        console.warn(
          "[PUT /api/profile] new columns missing at write time; falling back to legacy upsert:",
          saveError
        )
        resetSchemaCapabilitiesCache()
        const legacyResult = await upsert(basePayload, legacyCols)
        data = legacyResult.data as Record<string, unknown> | null
        saveError = (legacyResult.error ?? null) as
          | { code?: string; message?: string }
          | null
      }
    } else {
      const result = await upsert(basePayload, legacyCols)
      data = result.data as Record<string, unknown> | null
      saveError = (result.error ?? null) as
        | { code?: string; message?: string }
        | null
    }

    if (saveError) {
      return NextResponse.json(
        { error: dataErrorMessage(saveError, "user_profiles") },
        { status: 500 }
      )
    }

    // Always return a fully-shaped profile to the client (even fields
    // that aren't in the DB yet), so the UI can rehydrate state
    // without checking for undefined keys everywhere.
    const merged = {
      ...defaultProfile,
      ...(data ?? {}),
      experience_blocks: profile.experience_blocks,
      qualifications: profile.qualifications,
      notes: profile.notes,
    }

    return NextResponse.json({ profile: merged, capabilities })
  } catch (error) {
    return NextResponse.json(
      { error: dataErrorMessage(error, "user_profiles") },
      { status: 500 }
    )
  }
}
