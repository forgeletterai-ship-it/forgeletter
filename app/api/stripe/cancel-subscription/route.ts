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
 * In-app subscription cancellation. Schedules the cancellation for
 * the end of the current period so the customer keeps access for
 * what they've already paid for (same default as the Stripe Portal).
 *
 * Records the cancellation reason + (optional) save-offer outcome in
 * consent_log so we can analyse churn drivers later.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { user, error: userErr } = await getCurrentAppUser()
    if (!user) {
      return NextResponse.json(
        { error: userErr || "Account record not found" },
        { status: 401 }
      )
    }

    const body = (await req.json().catch(() => ({}))) as {
      reason?: string
      detail?: string
      acceptedSaveOffer?: boolean
    }
    const reason = (body.reason || "").trim().slice(0, 80)
    const detail = (body.detail || "").trim().slice(0, 1000)
    const acceptedSaveOffer = !!body.acceptedSaveOffer

    const stripe = getStripe()
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })
    const customer = customers.data[0]
    if (!customer) {
      return NextResponse.json(
        { error: "No active Stripe subscription to cancel." },
        { status: 404 }
      )
    }
    const sub = (
      await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 1,
      })
    ).data[0]
    if (!sub) {
      return NextResponse.json(
        { error: "No active subscription found." },
        { status: 404 }
      )
    }

    // If the user accepted the save offer, apply a 50% off coupon
    // for one cycle to the subscription and DO NOT cancel.
    if (acceptedSaveOffer) {
      try {
        // Use a known stable coupon id if you configure one in
        // Stripe Dashboard. Otherwise create on the fly. We try a
        // env-configured id first.
        const couponId =
          process.env.STRIPE_SAVE_OFFER_COUPON_ID ||
          (
            await stripe.coupons.create({
              percent_off: 50,
              duration: "once",
              name: "ForgeLetter retention offer",
            })
          ).id
        await stripe.subscriptions.update(sub.id, {
          discounts: [{ coupon: couponId }],
          metadata: { ...sub.metadata, save_offer_accepted: "true" },
        })
        await writeConsentLog({
          userId: user.id,
          action: "cancel_scheduled_change",
          fromPlan: user.plan,
          toPlan: user.plan,
          metadata: { saveOfferAccepted: true, reason, detail },
          req,
        })
        return NextResponse.json({
          ok: true,
          flow: "save_offer_applied",
          message:
            "A 50% discount has been applied to your next renewal. We're glad you're staying!",
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Save offer failed"
        return NextResponse.json({ error: message }, { status: 500 })
      }
    }

    // Otherwise: cancel at period end.
    const updated = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
      metadata: {
        ...sub.metadata,
        cancellation_reason: reason || "unspecified",
        cancellation_detail: detail || "",
      },
    })

    const updatedUnknown = updated as unknown as {
      current_period_end?: number
      cancel_at?: number
    }
    await writeConsentLog({
      userId: user.id,
      action: "cancel_subscription",
      fromPlan: user.plan,
      toPlan: "free",
      effectiveAt:
        typeof updatedUnknown.current_period_end === "number"
          ? new Date(updatedUnknown.current_period_end * 1000)
          : new Date(),
      metadata: { reason, detail, saveOfferAccepted: false },
      req,
    })

    return NextResponse.json({
      ok: true,
      flow: "scheduled_cancellation",
      cancelAt:
        typeof updatedUnknown.cancel_at === "number"
          ? new Date(updatedUnknown.cancel_at * 1000).toISOString()
          : null,
      message:
        "Your subscription will end at the close of your current billing period. You keep full access until then.",
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to cancel subscription"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function writeConsentLog(args: {
  userId: string
  action: "cancel_subscription" | "cancel_scheduled_change"
  fromPlan: string
  toPlan: string
  effectiveAt?: Date
  metadata?: Record<string, unknown>
  req: NextRequest
}): Promise<void> {
  try {
    const ipSalt = process.env.CONSENT_LOG_SALT || "forgeletter-consent-v1"
    const ipRaw =
      args.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      args.req.headers.get("x-real-ip") ||
      ""
    const ipHash = ipRaw
      ? createHash("sha256").update(ipRaw + ipSalt).digest("hex")
      : null
    const userAgent =
      args.req.headers.get("user-agent")?.slice(0, 500) || null

    await supabaseAdmin.from("consent_log").insert({
      user_id: args.userId,
      action: args.action,
      from_plan: args.fromPlan,
      to_plan: args.toPlan,
      effective_at: (args.effectiveAt ?? new Date()).toISOString(),
      consent_text_version: CONSENT_TEXT_VERSION,
      ip_hash: ipHash,
      user_agent: userAgent,
      metadata: args.metadata ?? null,
    })
  } catch (err) {
    console.warn(
      "[/api/stripe/cancel-subscription] consent_log failed:",
      customerSafeSupabaseError(err)
    )
  }
}
