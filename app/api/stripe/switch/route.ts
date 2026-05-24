import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  billingPlans,
  getStripe,
  resolveOrCreatePriceId,
  type BillingPlan,
} from "@/lib/stripe"
import { normalizeBillingPeriod } from "@/lib/plans"

/**
 * Switches the signed-in user's active Stripe subscription to a new
 * price. Used for in-app upgrades/downgrades (e.g. Pro monthly →
 * Ultra monthly) so the user does not have to detour through the
 * Stripe Customer Portal.
 *
 * Stripe handles proration automatically — the difference between
 * the old and new plan for the remainder of the billing period is
 * credited/charged on the next invoice via `proration_behavior:
 * 'create_prorations'`.
 *
 * If the user has no active subscription, this returns 404 and the
 * client should fall back to /api/stripe/checkout.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
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
      return NextResponse.json(
        { error: "Invalid target plan" },
        { status: 400 }
      )
    }

    const stripe = getStripe()

    // Locate the customer and their active subscription.
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    })
    const customer = customers.data[0]
    if (!customer) {
      return NextResponse.json(
        { error: "No Stripe customer found — start a new subscription instead." },
        { status: 404 }
      )
    }

    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    })
    const subscription = subs.data[0]
    if (!subscription) {
      // Try trialing too — same handling.
      const trialing = await stripe.subscriptions.list({
        customer: customer.id,
        status: "trialing",
        limit: 1,
      })
      if (!trialing.data[0]) {
        return NextResponse.json(
          { error: "No active subscription — start a new one via Checkout." },
          { status: 404 }
        )
      }
    }
    const sub = subscription || (await stripe.subscriptions.list({
      customer: customer.id,
      status: "trialing",
      limit: 1,
    })).data[0]

    const newPriceId = await resolveOrCreatePriceId(stripe, newPlan, newPeriod)

    const currentItem = sub.items.data[0]
    if (!currentItem) {
      return NextResponse.json(
        { error: "Subscription has no items — please contact support." },
        { status: 500 }
      )
    }

    if (currentItem.price.id === newPriceId) {
      return NextResponse.json(
        { error: "Already on this plan." },
        { status: 400 }
      )
    }

    const updated = await stripe.subscriptions.update(sub.id, {
      items: [{ id: currentItem.id, price: newPriceId }],
      proration_behavior: "create_prorations",
      metadata: {
        ...sub.metadata,
        plan: newPlan,
        period: newPeriod,
        planId:
          newPeriod === "annual" ? `${newPlan}_annual` : newPlan,
      },
    })

    return NextResponse.json({
      ok: true,
      subscriptionId: updated.id,
      status: updated.status,
      message:
        "Subscription updated. Your next invoice will reflect a prorated adjustment for the remainder of the current period.",
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to switch plan"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
