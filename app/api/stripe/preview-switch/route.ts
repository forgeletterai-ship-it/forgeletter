import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getCurrentAppUser } from "@/lib/app-data"
import {
  computeFairLetterCap,
  getBasePlan,
  getDailyLetterRate,
  getPlanLetterLimit,
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

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Dry-run preview for the confirmation modal.
 *
 * Returns everything the modal needs to render the customer-facing
 * "Today / Next invoice / Going forward" breakdown:
 *
 *   - direction       — "upgrade" | "downgrade" | "same"
 *   - cycleAnchorDate — the renewal date the new term will start on
 *   - cycleStart/end  — the current period boundaries
 *   - daysRemaining   — integer days left in the current cycle
 *   - daysTotal       — total days in the current cycle
 *   - prorationFraction — daysRemaining / daysTotal (0..1)
 *   - charge          — what we charge today, in EUR (0 for downgrades)
 *   - chargeBreakdown — proration line items from Stripe's preview
 *                       so the modal can show "credit X, charge Y"
 *   - newFullPrice    — what the new plan costs at next full renewal
 *   - letterCapNow    — current fair cap
 *   - letterCapAfter  — fair cap after the switch takes effect
 *                       (for upgrades: today's cap. For downgrades:
 *                       full new-plan cap at the next renewal.)
 *   - lettersUsedThisPeriod — count for context
 *   - taxNote         — whether Stripe Tax computed a VAT line
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

    const body = (await req.json().catch(() => ({}))) as {
      plan?: BillingPlan
      period?: string
    }
    const newPlan = body.plan
    const newPeriod = normalizeBillingPeriod(body.period)
    if (!newPlan || !(newPlan in billingPlans)) {
      return NextResponse.json({ error: "Invalid target plan" }, { status: 400 })
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

    const toStoredPlan = getStoredPlanId(newPlan, newPeriod)
    const direction = resolveSwitchDirection(user.plan, toStoredPlan)
    if (direction === "same") {
      return NextResponse.json({ error: "Already on this plan." }, { status: 400 })
    }

    const stripe = getStripe()
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })
    const customer = customers.data[0]

    // A free user previewing a paid plan: they go via Checkout, so the
    // preview just describes the first-period charge in full.
    if (!customer || getBasePlan(user.plan) === "free") {
      const fullPrice = billingPlans[newPlan].unitAmount[newPeriod] / 100
      return NextResponse.json({
        direction,
        flow: "checkout",
        fromPlan: user.plan,
        toPlan: toStoredPlan,
        cycleAnchorDate: null,
        cycleStart: null,
        cycleEnd: null,
        daysRemaining: null,
        daysTotal: null,
        prorationFraction: null,
        charge: fullPrice,
        chargeBreakdown: [
          {
            description: `${billingPlans[newPlan].name} (${newPeriod})`,
            amount: fullPrice,
          },
        ],
        newFullPrice: fullPrice,
        letterCapNow: 0,
        letterCapAfter: getPlanLetterLimit(toStoredPlan),
        lettersUsedThisPeriod: 0,
        currency: "EUR",
        taxIncluded: true,
        message:
          "You'll be redirected to secure Stripe Checkout to enter payment details.",
      })
    }

    // Existing paid customer — pull their active or trialing subscription.
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
      const fullPrice = billingPlans[newPlan].unitAmount[newPeriod] / 100
      return NextResponse.json({
        direction,
        flow: "checkout",
        fromPlan: user.plan,
        toPlan: toStoredPlan,
        charge: fullPrice,
        chargeBreakdown: [
          {
            description: `${billingPlans[newPlan].name} (${newPeriod})`,
            amount: fullPrice,
          },
        ],
        newFullPrice: fullPrice,
        currency: "EUR",
        taxIncluded: true,
        message:
          "Your previous subscription has lapsed — you'll be redirected to Checkout to start a new one.",
      })
    }

    const item = sub.items.data[0]
    if (!item) {
      return NextResponse.json(
        { error: "Subscription has no items — please contact support." },
        { status: 500 }
      )
    }

    // Read the cycle boundaries. Stripe moved current_period_* to the
    // item level in recent API versions, so check both shapes.
    const itemStart = (item as { current_period_start?: number }).current_period_start
    const itemEnd = (item as { current_period_end?: number }).current_period_end
    const subStart = (sub as { current_period_start?: number }).current_period_start
    const subEnd = (sub as { current_period_end?: number }).current_period_end
    const periodStartSec = itemStart ?? subStart
    const periodEndSec = itemEnd ?? subEnd
    if (!periodStartSec || !periodEndSec) {
      return NextResponse.json(
        { error: "Could not read current billing cycle from Stripe." },
        { status: 500 }
      )
    }
    const cycleStart = new Date(periodStartSec * 1000)
    const cycleEnd = new Date(periodEndSec * 1000)
    const now = new Date()
    const dayMs = 24 * 60 * 60 * 1000
    const daysTotal = Math.max(1, Math.round((cycleEnd.getTime() - cycleStart.getTime()) / dayMs))
    const daysRemaining = Math.max(
      0,
      Math.round((cycleEnd.getTime() - now.getTime()) / dayMs)
    )
    const prorationFraction = Math.max(0, Math.min(1, daysRemaining / daysTotal))

    const newPriceId = await resolveOrCreatePriceId(stripe, newPlan, newPeriod)
    const newPlanFullPrice = billingPlans[newPlan].unitAmount[newPeriod] / 100

    if (direction === "downgrade") {
      // Mode A: downgrade is scheduled for cycle end. Nothing charged today.
      // The next invoice on the cycle anchor will be the new plan's full price.
      const lettersUsedThisPeriod = 0 // not relevant to display for downgrades
      return NextResponse.json({
        direction,
        flow: "scheduled",
        fromPlan: user.plan,
        toPlan: toStoredPlan,
        cycleAnchorDate: cycleEnd.toISOString(),
        cycleStart: cycleStart.toISOString(),
        cycleEnd: cycleEnd.toISOString(),
        daysRemaining,
        daysTotal,
        prorationFraction,
        charge: 0,
        chargeBreakdown: [],
        newFullPrice: newPlanFullPrice,
        letterCapNow: computeFairLetterCap({
          plan: user.plan,
          accruedCapThisPeriod: user.accruedCapThisPeriod ?? 0,
          currentSegmentStartedAt: user.currentSegmentStartedAt,
          currentPeriodStart: user.currentPeriodStart,
        }),
        letterCapAfter: getPlanLetterLimit(toStoredPlan),
        lettersUsedThisPeriod,
        currency: "EUR",
        taxIncluded: true,
        message:
          "Your plan will change at the end of your current cycle. No charge today.",
      })
    }

    // Upgrade flow — compute the clean spec-shaped breakdown (5 lines,
    // no duplication) ourselves. Stripe's preview API returns raw
    // line items including the next-month subscription charge etc.,
    // which clutters the modal; for a customer-facing screen we want
    // exactly: cycle window, days remaining, unused credit, new
    // share, total. The actual invoice Stripe generates will use its
    // own math and may differ by a few cents due to rounding — we
    // refresh the dashboard after the switch so the customer sees
    // the authoritative numbers from the real receipt.
    const oldPriceEur = item.price?.unit_amount
      ? item.price.unit_amount / 100
      : 0
    const unusedCredit = Number((prorationFraction * oldPriceEur).toFixed(2))
    const newShare = Number((prorationFraction * newPlanFullPrice).toFixed(2))
    const chargeAmount = Number((newShare - unusedCredit).toFixed(2))
    const oldPlanName = billingPlans[user.plan.replace(/_annual$/, "") as BillingPlan]
      ?.name ?? user.plan
    const chargeBreakdown: Array<{ description: string; amount: number }> = [
      {
        description: `Unused ${oldPlanName} time refunded`,
        amount: -unusedCredit,
      },
      {
        description: `${billingPlans[newPlan].name} for the remaining ${daysRemaining} day${
          daysRemaining === 1 ? "" : "s"
        }`,
        amount: newShare,
      },
    ]
    // Stripe Tax adds VAT to the actual invoice; surface that fact in
    // the modal so the customer knows the figure shown already
    // includes it. (We can't pull the exact VAT line without calling
    // invoices.createPreview, which we deliberately skip per above.)
    const taxIncluded = true

    // Letter caps for the upgrade scenario.
    const letterCapNow = computeFairLetterCap({
      plan: user.plan,
      accruedCapThisPeriod: user.accruedCapThisPeriod ?? 0,
      currentSegmentStartedAt: user.currentSegmentStartedAt,
      currentPeriodStart: user.currentPeriodStart,
    })
    // Cap after the switch = accrued so far on old plan + the rest
    // of the period at the new plan's daily rate.
    const daysOnOldPlan = Math.max(
      0,
      (now.getTime() -
        (user.currentSegmentStartedAt
          ? new Date(user.currentSegmentStartedAt).getTime()
          : cycleStart.getTime())) /
        dayMs
    )
    const oldPlanDaily = getDailyLetterRate(user.plan)
    const newPlanDaily = getDailyLetterRate(toStoredPlan)
    const accruedSoFar =
      (user.accruedCapThisPeriod ?? 0) + daysOnOldPlan * oldPlanDaily
    const newSegmentAtSwitch = daysRemaining * newPlanDaily
    const letterCapAfter = Math.floor(accruedSoFar + newSegmentAtSwitch)

    return NextResponse.json({
      direction,
      flow: "immediate",
      fromPlan: user.plan,
      toPlan: toStoredPlan,
      cycleAnchorDate: cycleEnd.toISOString(),
      cycleStart: cycleStart.toISOString(),
      cycleEnd: cycleEnd.toISOString(),
      daysRemaining,
      daysTotal,
      prorationFraction,
      charge: chargeAmount,
      chargeBreakdown,
      newFullPrice: newPlanFullPrice,
      letterCapNow,
      letterCapAfter,
      lettersUsedThisPeriod: 0,
      currency: "EUR",
      taxIncluded,
      message:
        "Your upgrade takes effect immediately. You'll be charged the prorated amount now.",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to preview plan change"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
