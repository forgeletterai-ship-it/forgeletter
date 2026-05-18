import { NextRequest, NextResponse } from "next/server"
import {
  dataErrorMessage,
  getCurrentAppUser,
  isMissingTableError,
} from "@/lib/app-data"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const { user, error } = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { confirmation?: string }

  if (body.confirmation !== "DELETE") {
    return NextResponse.json(
      { error: "Type DELETE to confirm workspace data deletion." },
      { status: 400 }
    )
  }

  const tables = ["application_briefs", "user_profiles", "user_settings"]
  const errors: string[] = []

  for (const table of tables) {
    try {
      const { error: deleteError } = await supabaseAdmin
        .from(table)
        .delete()
        .eq("user_id", user.id)

      if (deleteError && !isMissingTableError(deleteError)) {
        errors.push(dataErrorMessage(deleteError, table))
      }
    } catch (error) {
      errors.push(dataErrorMessage(error, table))
    }
  }

  if (errors.length) {
    return NextResponse.json({ error: errors[0] }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
