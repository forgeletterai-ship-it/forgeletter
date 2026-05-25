import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getCurrentAppUser } from "@/lib/app-data"
import { getStripe } from "@/lib/stripe"
import { customerSafeSupabaseError, supabaseAdmin } from "@/lib/supabase"
import { createHash } from "node:crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CONSENT_TEXT_VERSION = "v1-2026-06"

/**
 * Cancels a pending downgrade. The customer stays on their current
 * (higher) plan and continues to renew at that price.
 *
 * Behind the scenes we release the Stripe subscription_schedule we
 * created when the downgrade was confirmed; releasing reverts the
 * subscription to a normal (non-scheduled) state on its current
 * price.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { user, error: userError } = await getCurrentAppUser()
    if (!user) {
      return NextResponse.json(
        { error: userError || "Account record not found" },
        { status: 401 }
      )
    }

    const scheduled = user.scheduledPlanChange
    if (!scheduled) {
      return NextResponse.json(
        { error: "No scheduled plan change to cancel." },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })
    const customer = customers.data[0]
    if (!customer) {
      return NextResponse.json(
        { error: "No Stripe customer found." },
        { status: 404 }
      )
    }

    // Find the schedule. Prefer the schedule id stored on the user
    // row; fall back to the subscription's schedule if missing.
    const storedScheduleId = (scheduled as unknown as { scheduleId?: string }).scheduleId
    let scheduleId: string | null = storedScheduleId ?? null
    if (!scheduleId) {
      const sub = (await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 1,
      })).data[0]
      if (sub?.schedule) {
        scheduleId =
          typeof sub.schedule === "string" ? sub.schedule : sub.schedule.id
      }
    }

    if (scheduleId) {
      try {
        await stripe.subscriptionSchedules.release(scheduleId)
      } catch (err) {
        console.warn(
          "[/api/stripe/cancel-scheduled-change] release failed:",
          err instanceof Error ? err.message : err
        )
      }
    }

    const { error: persistErr } = await supabaseAdmin
      .from("users")
      .update({ scheduled_plan_change: null })
      .eq("id", user.id)
    if (persistErr) {
      console.warn(
        "[/api/stripe/cancel-scheduled-change] persist failed:",
        customerSafeSupabaseError(persistErr)
      )
    }

    // Audit trail.
    const ipSalt = process.env.CONSENT_LOG_SALT || "forgeletter-consent-v1"
    const ipRaw =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      ""
    const ipHash = ipRaw
      ? createHash("sha256").update(ipRaw + ipSalt).digest("hex")
      : null
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null

    try {
      await supabaseAdmin.from("consent_log").insert({
        user_id: user.id,
        action: "cancel_scheduled_change",
        from_plan: user.plan,
        to_plan: scheduled.toPlan,
        effective_at: new Date().toISOString(),
        consent_text_version: CONSENT_TEXT_VERSION,
        ip_hash: ipHash,
        user_agent: userAgent,
      })
    } catch (err) {
      console.warn(
        "[/api/stripe/cancel-scheduled-change] consent_log failed:",
        err instanceof Error ? err.message : err
      )
    }

    return NextResponse.json({
      ok: true,
      message:
        "Plan change cancelled. You'll continue on your current plan at the next renewal.",
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to cancel scheduled change"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
