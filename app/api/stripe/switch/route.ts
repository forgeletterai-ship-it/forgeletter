import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getCurrentAppUser } from "@/lib/app-data"
import {
  getDailyLetterRate,
  getStoredPlanId,
  normalizeBillingPeriod,
  resolveSwitchDirection,
} from "@/lib/plans"
import {
  billingPlans,
  getStripe,
  resolveOrCreatePriceId,
  type BillingPlan,
} from "@/lib/stripe"
import { customerSafeSupabaseError, supabaseAdmin } from "@/lib/supabase"
import { createHash } from "node:crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CONSENT_TEXT_VERSION = "v1-2026-06"

type SwitchRequestBody = {
  plan?: BillingPlan
  period?: string
  /** True when the user explicitly checked the confirmation
   *  checkbox(es) in the modal. We refuse to switch otherwise. */
  consented?: boolean
  /** True when the user checked the 14-day-right-of-withdrawal waiver
   *  on an upgrade. Required for upgrades; ignored for downgrades. */
  waiveWithdrawalRight?: boolean
}

/**
 * Executes a plan switch.
 *
 *   - Upgrades: subscriptions.update with proration_behavior =
 *     "always_invoice" — charges the card immediately for the
 *     prorated delta. No revenue can be left on the table by a
 *     subsequent cancel-at-period-end.
 *
 *   - Downgrades: a Stripe subscription_schedule is created from the
 *     current sub and a second phase is added at the cycle end with
 *     the cheaper price. Customer keeps full higher-plan access and
 *     letter cap through the cycle they already paid for.
 *
 * Both paths require explicit consented=true from the request body.
 * Upgrades additionally require waiveWithdrawalRight=true to satisfy
 * the EU Consumer Rights Directive (14-day withdrawal waiver).
 *
 * Every successful switch writes a consent_log row capturing what the
 * customer agreed to (action, plans, charge, consent version).
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

    if (user.disputedAt) {
      return NextResponse.json(
        {
          error:
            "Plan changes are paused while a charge dispute is under review. Please contact support.",
        },
        { status: 403 }
      )
    }

    const body = (await req.json().catch(() => ({}))) as SwitchRequestBody
    const newPlan = body.plan
    const newPeriod = normalizeBillingPeriod(body.period)
    if (!newPlan || !(newPlan in billingPlans)) {
      return NextResponse.json({ error: "Invalid target plan" }, { status: 400 })
    }

    if (!body.consented) {
      return NextResponse.json(
        { error: "Consent required. Please confirm the plan change in the dialog." },
        { status: 400 }
      )
    }

    const toStoredPlan = getStoredPlanId(newPlan, newPeriod)
    const direction = resolveSwitchDirection(user.plan, toStoredPlan)
    if (direction === "same") {
      return NextResponse.json({ error: "Already on this plan." }, { status: 400 })
    }

    if (direction === "upgrade" && !body.waiveWithdrawalRight) {
      return NextResponse.json(
        {
          error:
            "EU consumer law requires you to waive your 14-day right of withdrawal for the upgrade to take effect immediately.",
        },
        { status: 400 }
      )
    }

    // Idempotency: reject if the same user already confirmed a switch
    // in the last 60 seconds. Protects against double-clicks racing
    // through despite the client debounce, and against the page
    // mid-reload re-firing the request.
    const recencyWindowMs = 60_000
    try {
      const since = new Date(Date.now() - recencyWindowMs).toISOString()
      const { data: recent } = await supabaseAdmin
        .from("consent_log")
        .select("created_at, to_plan, action")
        .eq("user_id", user.id)
        .in("action", ["upgrade_confirm", "downgrade_confirm"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (recent) {
        // If the user already confirmed the SAME plan switch we treat
        // this as a duplicate and pretend it succeeded so the client
        // doesn't show a scary error.
        if (recent.to_plan === toStoredPlan) {
          return NextResponse.json({
            ok: true,
            flow: direction === "upgrade" ? "immediate" : "scheduled",
            duplicate: true,
            message: "This plan change was already confirmed.",
          })
        }
        // A different recent switch — block to prevent thrash.
        return NextResponse.json(
          {
            error:
              "You changed your plan very recently. Please wait a minute before making another change.",
          },
          { status: 429 }
        )
      }
    } catch (err) {
      console.warn(
        "[/api/stripe/switch] idempotency check failed:",
        err instanceof Error ? err.message : err
      )
      // Don't fail the request just because the audit log read errored —
      // continue with the normal flow.
    }

    const stripe = getStripe()
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })
    const customer = customers.data[0]
    if (!customer) {
      return NextResponse.json(
        { error: "No Stripe customer found — start a new subscription instead." },
        { status: 404 }
      )
    }

    let sub = (await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    })).data[0]
    if (!sub) {
      sub = (await stripe.subscriptions.list({
        customer: customer.id,
        status: "trialing",
        limit: 1,
      })).data[0]
    }
    if (!sub) {
      return NextResponse.json(
        { error: "No active subscription — start a new one via Checkout." },
        { status: 404 }
      )
    }

    const item = sub.items.data[0]
    if (!item) {
      return NextResponse.json(
        { error: "Subscription has no items — please contact support." },
        { status: 500 }
      )
    }
    if (item.price.id === (await resolveOrCreatePriceId(stripe, newPlan, newPeriod))) {
      // The price IDs match — duplicate call.
      return NextResponse.json({ error: "Already on this plan." }, { status: 400 })
    }

    // The reusable hash for the consent_log IP fingerprint. SHA-256 of
    // the IP + a build-time salt keeps the IP unidentifiable while
    // still letting us spot abusive patterns.
    const ipSalt = process.env.CONSENT_LOG_SALT || "forgeletter-consent-v1"
    const ipRaw =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      ""
    const ipHash = ipRaw ? createHash("sha256").update(ipRaw + ipSalt).digest("hex") : null
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null

    const newPriceId = await resolveOrCreatePriceId(stripe, newPlan, newPeriod)

    // Read the cycle boundaries (used for segment math + downgrade
    // schedule anchor).
    const itemStart = (item as { current_period_start?: number }).current_period_start
    const itemEnd = (item as { current_period_end?: number }).current_period_end
    const subStart = (sub as { current_period_start?: number }).current_period_start
    const subEnd = (sub as { current_period_end?: number }).current_period_end
    const cycleStartSec = itemStart ?? subStart
    const cycleEndSec = itemEnd ?? subEnd
    if (!cycleStartSec || !cycleEndSec) {
      return NextResponse.json(
        { error: "Could not read current billing cycle from Stripe." },
        { status: 500 }
      )
    }

    if (direction === "upgrade") {
      // --------------------- UPGRADE PATH ---------------------
      // Charge immediately for the prorated delta. Stripe creates a
      // real invoice and attempts the card charge synchronously.
      const updated = await stripe.subscriptions.update(sub.id, {
        items: [{ id: item.id, price: newPriceId }],
        proration_behavior: "always_invoice",
        metadata: {
          ...sub.metadata,
          plan: newPlan,
          period: newPeriod,
          planId: toStoredPlan,
          userId: user.id,
        },
      })

      // Snapshot the segment so the fair-cap math stays accurate.
      // Days the user spent on the previous plan during this period
      // are converted to "accrued" letters; the new segment starts now.
      const segmentStart = user.currentSegmentStartedAt
        ? new Date(user.currentSegmentStartedAt)
        : new Date(cycleStartSec * 1000)
      const now = new Date()
      const daysOnOldPlan = Math.max(
        0,
        (now.getTime() - segmentStart.getTime()) / (24 * 60 * 60 * 1000)
      )
      const oldDailyRate = getDailyLetterRate(user.plan)
      const addedAccrued = daysOnOldPlan * oldDailyRate
      const newAccrued = (user.accruedCapThisPeriod ?? 0) + addedAccrued

      // Persist segment snapshot. plan + current_period_start come from
      // the webhook (also fires for the update). We only own the
      // accrued + segment_started fields here.
      const { error: persistErr } = await supabaseAdmin
        .from("users")
        .update({
          accrued_cap_this_period: newAccrued,
          current_segment_started_at: now.toISOString(),
          // Clear any prior scheduled change — an upgrade overrides
          // a pending downgrade.
          scheduled_plan_change: null,
        })
        .eq("id", user.id)
      if (persistErr) {
        console.warn(
          "[/api/stripe/switch] segment snapshot persist failed:",
          customerSafeSupabaseError(persistErr)
        )
      }

      await writeConsentLog({
        userId: user.id,
        action: "upgrade_confirm",
        fromPlan: user.plan,
        toPlan: toStoredPlan,
        effectiveAt: now,
        ipHash,
        userAgent,
      })

      return NextResponse.json({
        ok: true,
        flow: "immediate",
        subscriptionId: updated.id,
        status: updated.status,
        message:
          "Subscription upgraded. Your card has been charged for the prorated amount; an invoice is on its way.",
      })
    }

    // --------------------- DOWNGRADE PATH ---------------------
    // Mode A: schedule the price change for the end of the current
    // cycle via Stripe subscription_schedules. The customer keeps the
    // current (higher) plan and letter cap until the cycle anchor.
    const cycleEndDate = new Date(cycleEndSec * 1000)

    type ScheduleWithRelease = typeof stripe.subscriptionSchedules
    const subscriptionSchedules = stripe.subscriptionSchedules as ScheduleWithRelease

    // If a schedule already exists for this subscription, release it
    // so we can recreate a clean one with the new target.
    if (sub.schedule) {
      try {
        await subscriptionSchedules.release(
          typeof sub.schedule === "string" ? sub.schedule : sub.schedule.id
        )
      } catch (err) {
        console.warn(
          "[/api/stripe/switch] could not release prior schedule:",
          err instanceof Error ? err.message : err
        )
      }
    }

    const schedule = await subscriptionSchedules.create({
      from_subscription: sub.id,
    })

    // Build the two-phase schedule:
    //   Phase 1: current price, ends at cycle anchor (Stripe inferred
    //            from the from_subscription).
    //   Phase 2: new lower price, starts at the cycle anchor,
    //            proration_behavior: 'none' because we're rolling
    //            cleanly over a renewal.
    const phase1Items = schedule.phases[0]?.items?.map((i) => ({
      price: typeof i.price === "string" ? i.price : i.price?.id,
      quantity: i.quantity ?? 1,
    })) ?? [{ price: item.price.id, quantity: 1 }]

    const updatedSchedule = await subscriptionSchedules.update(schedule.id, {
      end_behavior: "release",
      phases: [
        {
          items: phase1Items as Array<{ price: string; quantity: number }>,
          start_date: schedule.phases[0]?.start_date,
          end_date: cycleEndSec,
          proration_behavior: "none",
        },
        {
          items: [{ price: newPriceId, quantity: 1 }],
          start_date: cycleEndSec,
          proration_behavior: "none",
          metadata: {
            plan: newPlan,
            period: newPeriod,
            planId: toStoredPlan,
            userId: user.id,
          },
        },
      ],
      metadata: {
        userId: user.id,
        scheduledDowngradeTo: toStoredPlan,
      },
    })

    const { error: persistErr } = await supabaseAdmin
      .from("users")
      .update({
        scheduled_plan_change: {
          toPlan: toStoredPlan,
          effectiveAt: cycleEndDate.toISOString(),
          scheduleId: updatedSchedule.id,
        },
      })
      .eq("id", user.id)
    if (persistErr) {
      console.warn(
        "[/api/stripe/switch] scheduled_plan_change persist failed:",
        customerSafeSupabaseError(persistErr)
      )
    }

    await writeConsentLog({
      userId: user.id,
      action: "downgrade_confirm",
      fromPlan: user.plan,
      toPlan: toStoredPlan,
      effectiveAt: cycleEndDate,
      ipHash,
      userAgent,
    })

    return NextResponse.json({
      ok: true,
      flow: "scheduled",
      subscriptionId: sub.id,
      scheduleId: updatedSchedule.id,
      effectiveAt: cycleEndDate.toISOString(),
      message:
        "Downgrade scheduled. You keep your current plan and letters until your next renewal, then automatically switch to the new plan.",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to switch plan"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function writeConsentLog(args: {
  userId: string
  action:
    | "upgrade_confirm"
    | "downgrade_confirm"
    | "cancel_scheduled_change"
  fromPlan: string
  toPlan: string
  effectiveAt: Date
  chargeEur?: number
  ipHash: string | null
  userAgent: string | null
}): Promise<void> {
  try {
    await supabaseAdmin.from("consent_log").insert({
      user_id: args.userId,
      action: args.action,
      from_plan: args.fromPlan,
      to_plan: args.toPlan,
      effective_at: args.effectiveAt.toISOString(),
      charge_eur: args.chargeEur ?? null,
      consent_text_version: CONSENT_TEXT_VERSION,
      ip_hash: args.ipHash,
      user_agent: args.userAgent,
    })
  } catch (err) {
    // Non-fatal: the customer's switch still succeeded. We log so we
    // can investigate, but don't fail the request.
    console.warn(
      "[/api/stripe/switch] consent_log insert failed:",
      err instanceof Error ? err.message : err
    )
  }
}
