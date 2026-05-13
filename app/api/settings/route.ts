import { NextRequest, NextResponse } from "next/server"
import {
  defaultSettings,
  getCurrentAppUser,
  getUserSettings,
  isMissingTableError,
  setupMessage,
  type UserSettings,
} from "@/lib/app-data"
import { supabaseAdmin } from "@/lib/supabase"

const allowedTones = new Set(["Professional", "Warm", "Direct"])

export async function GET() {
  const { user, error } = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const { settings, setupError } = await getUserSettings(user.id)
  return NextResponse.json({ settings, setupError })
}

export async function PUT(req: NextRequest) {
  const { user, error } = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as Partial<UserSettings>
  const settings: UserSettings = {
    default_tone: allowedTones.has(String(body.default_tone))
      ? String(body.default_tone)
      : defaultSettings.default_tone,
    email_updates: Boolean(body.email_updates),
    product_updates: Boolean(body.product_updates),
  }

  const { data, error: saveError } = await supabaseAdmin
    .from("user_settings")
    .upsert(
      {
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("default_tone,email_updates,product_updates")
    .single()

  if (saveError) {
    return NextResponse.json(
      {
        error: isMissingTableError(saveError)
          ? setupMessage("user_settings")
          : saveError.message,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ settings: data })
}
