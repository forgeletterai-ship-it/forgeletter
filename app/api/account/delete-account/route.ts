import { NextRequest, NextResponse } from "next/server"
import {
  dataErrorMessage,
  getCurrentAppUser,
  isMissingTableError,
} from "@/lib/app-data"
import { getBasePlan } from "@/lib/plans"
import { getStripe } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Full account deletion — the Art. 17 erasure path the Privacy Policy,
 * Terms §11, and the settings page promise. Distinct from
 * /api/account/delete-data (workspace-content wipe that keeps the
 * account usable).
 *
 * Flow:
 *   1. Refuse while a Stripe subscription is still active — the user
 *      must cancel first so we never delete an account that Stripe
 *      keeps billing.
 *   2. Snapshot everything into data_recovery_snapshots (30-day
 *      support-side recovery, purged after — same policy as the data
 *      wipe).
 *   3. Delete every user-scoped row, then the users row itself.
 *      consent_log is intentionally retained: it is the billing audit
 *      trail (proof of consent for past charges) kept under
 *      Art. 17(3)(e), and is disclosed in the Privacy Policy.
 *   4. The client signs the user out; their session dies server-side
 *      anyway because the users row is gone (requireAppUser fails).
 */
export async function POST(req: NextRequest) {
  const { user, error } = await getCurrentAppUser()
  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as { confirmation?: string }
  if (body.confirmation !== "DELETE MY ACCOUNT") {
    return NextResponse.json(
      { error: "Type DELETE MY ACCOUNT to confirm permanent account deletion." },
      { status: 400 }
    )
  }

  // 1. Active-subscription guard. Check Stripe directly (not just the
  //    plan column) so webhook drift can't let a billed account slip
  //    through deletion.
  if (getBasePlan(user.plan) !== "free") {
    return NextResponse.json(
      {
        error:
          "Cancel your subscription from the Billing page first. Your access continues until the period ends — you can delete the account after that.",
      },
      { status: 409 }
    )
  }
  try {
    const stripe = getStripe()
    const customers = await stripe.customers.list({ email: user.email, limit: 3 })
    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 1,
      })
      if (subs.data.length > 0) {
        return NextResponse.json(
          {
            error:
              "Stripe still shows an active subscription for this email. Cancel it from the Billing page (or the Stripe portal), then delete the account.",
          },
          { status: 409 }
        )
      }
    }
  } catch (err) {
    // Stripe unreachable — do NOT delete blind. A billed account must
    // never be deleted while we can't verify its subscription state.
    console.error("[/api/account/delete-account] Stripe check failed:", err)
    return NextResponse.json(
      { error: "Couldn't verify your billing state. Please try again in a moment." },
      { status: 502 }
    )
  }

  // 2. Snapshot everything (30-day recovery window).
  const snapshot: Record<string, unknown> = {}
  let letterIds: string[] = []
  try {
    const { data } = await supabaseAdmin
      .from("generated_letters")
      .select("*")
      .eq("user_id", user.id)
    snapshot.generated_letters = data ?? []
    letterIds = ((data ?? []) as Array<{ id: string }>).map((r) => r.id)
  } catch {
    snapshot.generated_letters = []
  }
  for (const table of ["application_briefs", "user_profiles", "user_settings", "user_feedback"]) {
    try {
      const { data } = await supabaseAdmin.from(table).select("*").eq("user_id", user.id)
      snapshot[table] = data ?? []
    } catch {
      snapshot[table] = []
    }
  }
  if (letterIds.length > 0) {
    try {
      const { data } = await supabaseAdmin
        .from("agent_outputs")
        .select("*")
        .in("generation_id", letterIds)
      snapshot.agent_outputs = data ?? []
    } catch {
      snapshot.agent_outputs = []
    }
  }
  try {
    const { data } = await supabaseAdmin
      .from("users")
      .select("id,email,name,plan,created_at")
      .eq("id", user.id)
      .maybeSingle()
    snapshot.user = data ?? null
  } catch {
    snapshot.user = null
  }

  try {
    const { error: snapErr } = await supabaseAdmin
      .from("data_recovery_snapshots")
      .insert({
        user_id: user.id,
        letters_count: letterIds.length,
        briefs_count: Array.isArray(snapshot.application_briefs)
          ? (snapshot.application_briefs as unknown[]).length
          : 0,
        profile_present:
          Array.isArray(snapshot.user_profiles) &&
          (snapshot.user_profiles as unknown[]).length > 0,
        settings_present:
          Array.isArray(snapshot.user_settings) &&
          (snapshot.user_settings as unknown[]).length > 0,
        snapshot,
      })
    if (snapErr && !isMissingTableError(snapErr)) {
      console.warn("[/api/account/delete-account] snapshot failed:", snapErr)
    }
  } catch (err) {
    console.warn(
      "[/api/account/delete-account] snapshot threw:",
      err instanceof Error ? err.message : err
    )
  }

  // 3. Delete user-scoped rows, then the users row.
  const errors: string[] = []
  if (letterIds.length > 0) {
    try {
      const { error: aoErr } = await supabaseAdmin
        .from("agent_outputs")
        .delete()
        .in("generation_id", letterIds)
      if (aoErr && !isMissingTableError(aoErr)) {
        errors.push(dataErrorMessage(aoErr, "agent_outputs"))
      }
    } catch (err) {
      errors.push(dataErrorMessage(err, "agent_outputs"))
    }
  }
  for (const table of [
    "generated_letters",
    "application_briefs",
    "user_profiles",
    "user_settings",
    "user_feedback",
    "password_reset_tokens",
  ]) {
    try {
      const { error: delErr } = await supabaseAdmin
        .from(table)
        .delete()
        .eq("user_id", user.id)
      if (delErr && !isMissingTableError(delErr)) {
        errors.push(dataErrorMessage(delErr, table))
      }
    } catch (err) {
      errors.push(dataErrorMessage(err, table))
    }
  }
  // Contact messages are keyed by email, not user_id.
  try {
    const { error: cmErr } = await supabaseAdmin
      .from("contact_messages")
      .delete()
      .eq("email", user.email)
    if (cmErr && !isMissingTableError(cmErr)) {
      errors.push(dataErrorMessage(cmErr, "contact_messages"))
    }
  } catch (err) {
    errors.push(dataErrorMessage(err, "contact_messages"))
  }

  if (errors.length) {
    // Data deletion partially failed — do NOT delete the users row,
    // or the orphaned rows become unfindable. Surface and let the
    // user retry.
    return NextResponse.json({ error: errors[0] }, { status: 500 })
  }

  const { error: userErr } = await supabaseAdmin
    .from("users")
    .delete()
    .eq("id", user.id)
  if (userErr) {
    return NextResponse.json(
      { error: dataErrorMessage(userErr, "users") },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    message:
      "Your account and data have been deleted. A recovery snapshot is retained for 30 days, then purged permanently.",
  })
}
