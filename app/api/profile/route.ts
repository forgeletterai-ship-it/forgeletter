import { NextRequest, NextResponse } from "next/server"
import {
  dataErrorMessage,
  defaultProfile,
  getCurrentAppUser,
  getUserProfile,
  type UserProfile,
} from "@/lib/app-data"
import { supabaseAdmin } from "@/lib/supabase"

function cleanProfile(input: Partial<UserProfile>): UserProfile {
  return {
    professional_headline: String(input.professional_headline || "").trim(),
    target_roles: String(input.target_roles || "").trim(),
    industries: String(input.industries || "").trim(),
    key_achievements: String(input.key_achievements || "").trim(),
    strengths: String(input.strengths || "").trim(),
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
          ...profile,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select(
        "professional_headline,target_roles,industries,key_achievements,strengths"
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
