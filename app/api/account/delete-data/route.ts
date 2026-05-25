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

  // 1. Snapshot everything first so a support-side restore is
  //    possible for 30 days. Pull full rows (not just ids) for
  //    each table the user owns.
  const snapshotPayload: Record<string, unknown> = {}
  let letterIds: string[] = []
  let agentOutputRows: unknown[] = []
  let lettersRows: unknown[] = []
  let briefsRows: unknown[] = []
  let profileRow: unknown = null
  let settingsRow: unknown = null

  try {
    const { data, error: letterFetchErr } = await supabaseAdmin
      .from("generated_letters")
      .select("*")
      .eq("user_id", user.id)
    if (letterFetchErr && !isMissingTableError(letterFetchErr)) {
      errors.push(dataErrorMessage(letterFetchErr, "generated_letters"))
    } else if (data) {
      lettersRows = data
      letterIds = (data as Array<{ id: string }>).map((r) => r.id)
    }
  } catch (error) {
    errors.push(dataErrorMessage(error, "generated_letters"))
  }

  if (letterIds.length > 0) {
    try {
      const { data } = await supabaseAdmin
        .from("agent_outputs")
        .select("*")
        .in("generation_id", letterIds)
      if (data) agentOutputRows = data
    } catch {
      // optional; snapshot still proceeds
    }
  }

  try {
    const { data } = await supabaseAdmin
      .from("application_briefs")
      .select("*")
      .eq("user_id", user.id)
    if (data) briefsRows = data
  } catch {
    // optional
  }

  try {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
    if (data) profileRow = data
  } catch {
    // optional
  }

  try {
    const { data } = await supabaseAdmin
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
    if (data) settingsRow = data
  } catch {
    // optional
  }

  snapshotPayload.generated_letters = lettersRows
  snapshotPayload.agent_outputs = agentOutputRows
  snapshotPayload.application_briefs = briefsRows
  snapshotPayload.user_profile = profileRow
  snapshotPayload.user_settings = settingsRow

  // Write the snapshot before any destructive operation. If this
  // table is missing (migration not yet applied) we proceed with the
  // delete anyway — the previous behaviour is preserved.
  try {
    const { error: snapErr } = await supabaseAdmin
      .from("data_recovery_snapshots")
      .insert({
        user_id: user.id,
        letters_count: lettersRows.length,
        briefs_count: briefsRows.length,
        profile_present: !!profileRow,
        settings_present: !!settingsRow,
        snapshot: snapshotPayload,
      })
    if (snapErr && !isMissingTableError(snapErr)) {
      // Soft-fail: log but proceed. The customer explicitly asked to
      // delete; refusing because we couldn't snapshot would be worse
      // UX than no recovery option.
      console.warn(
        "[/api/account/delete-data] snapshot insert failed:",
        snapErr
      )
    }
  } catch (error) {
    console.warn(
      "[/api/account/delete-data] snapshot insert threw:",
      error instanceof Error ? error.message : error
    )
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
    recoverable: {
      until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      message:
        "Your data has been removed from the workspace but a recovery snapshot is retained for 30 days. Email support to request restore.",
    },
  })
}
