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

  const errors: string[] = []

  // 1. Collect the user's letter IDs so we can clean up agent_outputs
  //    (which is FK'd by generation_id, not user_id directly).
  let letterIds: string[] = []
  try {
    const { data: letterRows, error: letterFetchErr } = await supabaseAdmin
      .from("generated_letters")
      .select("id")
      .eq("user_id", user.id)
    if (letterFetchErr && !isMissingTableError(letterFetchErr)) {
      errors.push(dataErrorMessage(letterFetchErr, "generated_letters"))
    } else if (letterRows) {
      letterIds = (letterRows as Array<{ id: string }>).map((r) => r.id)
    }
  } catch (error) {
    errors.push(dataErrorMessage(error, "generated_letters"))
  }

  // 2. Delete agent_outputs for those letters first. If the schema
  //    has ON DELETE CASCADE on generation_id this is redundant but
  //    harmless; if not, this guarantees no orphans.
  if (letterIds.length > 0) {
    try {
      const { error: aoErr } = await supabaseAdmin
        .from("agent_outputs")
        .delete()
        .in("generation_id", letterIds)
      if (aoErr && !isMissingTableError(aoErr)) {
        errors.push(dataErrorMessage(aoErr, "agent_outputs"))
      }
    } catch (error) {
      errors.push(dataErrorMessage(error, "agent_outputs"))
    }
  }

  // 3. Delete everything else owned by the user.
  //    consent_log is INTENTIONALLY kept — those rows are billing
  //    audit trail (proof of consent for charges), not workspace
  //    content. Subscription itself is also kept; the user must
  //    cancel via the billing portal separately.
  const userScopedTables = [
    "generated_letters",
    "application_briefs",
    "user_profiles",
    "user_settings",
  ]

  for (const table of userScopedTables) {
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

  return NextResponse.json({
    ok: true,
    deleted: {
      generatedLetters: letterIds.length,
      agentOutputsScope: letterIds.length,
    },
  })
}
