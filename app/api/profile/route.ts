import { NextRequest, NextResponse } from "next/server"
import {
  dataErrorMessage,
  defaultProfile,
  getCurrentAppUser,
  getSupabaseSchemaCapabilities,
  getUserProfile,
  resetSchemaCapabilitiesCache,
  type UserProfile,
} from "@/lib/app-data"
// Sanitizers live in lib/profile-sanitize.ts so they're unit-testable
// (route files may only export HTTP handlers).
import { cleanProfile } from "@/lib/profile-sanitize"
import { supabaseAdmin } from "@/lib/supabase"

export const runtime = "nodejs"

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
    newPayloadBits.portfolio_link = profile.portfolio_link
    newPayloadBits.tools = profile.tools
  }

  const fullCols =
    "professional_headline,target_roles,industries,key_achievements,strengths,tools,experience_blocks,qualifications,notes,portfolio_link"
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
      portfolio_link: profile.portfolio_link,
      tools: profile.tools,
    }

    return NextResponse.json({ profile: merged, capabilities })
  } catch (error) {
    return NextResponse.json(
      { error: dataErrorMessage(error, "user_profiles") },
      { status: 500 }
    )
  }
}
