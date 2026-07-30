import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  billingPlans,
  getAppUrl,
  getCheckoutLineItem,
  getStripe,
  type BillingPlan,
} from "@/lib/stripe"
import { getStoredPlanId, normalizeBillingPeriod } from "@/lib/plans"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { plan, period: requestedPeriod } = (await req.json().catch(() => ({}))) as {
      plan?: BillingPlan
      period?: string
    }

    if (!plan || !(plan in billingPlans)) {
      return NextResponse.json({ error: "Invalid billing plan" }, { status: 400 })
    }

    const period = normalizeBillingPeriod(requestedPeriod)
    const planId = getStoredPlanId(plan, period)
    const user = session.user as {
      id?: string
      email?: string | null
      name?: string | null
    }

    // OAuth accounts created without an email get a synthetic
    // @no-email.local address. Stripe would accept it and then
    // black-hole every receipt, invoice, and dunning email forever.
    if (user.email?.endsWith("@no-email.local")) {
      return NextResponse.json(
        {
          error:
            "Your account has no email address for billing receipts. Contact support to add one before subscribing.",
        },
        { status: 400 }
      )
    }

    const appUrl = getAppUrl(req.nextUrl.origin)
    const stripe = getStripe()

    // Already-subscribed guard: a direct POST while on a paid plan
    // (or after a lost webhook left the DB stale) would create a
    // SECOND concurrently-billing subscription on a brand-new Stripe
    // customer. Route those users through the plan-switch flow.
    if (user.email) {
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 3,
      })
      for (const customer of existingCustomers.data) {
        const subs = await stripe.subscriptions.list({
          customer: customer.id,
          status: "active",
          limit: 1,
        })
        if (subs.data.length > 0) {
          return NextResponse.json(
            {
              error:
                "You already have an active subscription. Use the billing page to switch plans instead — this prevents double billing.",
            },
            { status: 409 }
          )
        }
      }
    }

    // EU Consumer Rights Directive Art. 16(m): the 14-day withdrawal
    // right is only waived with the consumer's EXPRESS consent to
    // immediate performance + acknowledgment of the loss. The refund
    // policy describes exactly this consent at checkout, so checkout
    // must actually capture it.
    //   - custom_text.submit states the waiver next to the pay button
    //     (always on — no dashboard dependency).
    //   - consent_collection.terms_of_service adds the required
    //     checkbox, but Stripe rejects it until the Terms URL is set
    //     in Dashboard → Settings → Business → Public details. Flip
    //     STRIPE_TOS_CONSENT=1 after configuring that (ops runbook).
    const collectTosConsent = process.env.STRIPE_TOS_CONSENT === "1"

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [getCheckoutLineItem(plan, period)],
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      ...(collectTosConsent
        ? {
            consent_collection: {
              terms_of_service: "required" as const,
            },
          }
        : {}),
      custom_text: {
        submit: {
          message:
            "By subscribing you agree to the ForgeLetter Terms and expressly request immediate access to the service. You acknowledge that once you use a generation feature, you lose the EU/UK 14-day right of withdrawal, as described in our Refund Policy.",
        },
      },
      metadata: {
        plan,
        period,
        planId,
        userId: user.id || "",
        email: user.email || "",
      },
      subscription_data: {
        metadata: {
          plan,
          period,
          planId,
          userId: user.id || "",
          email: user.email || "",
        },
      },
    })

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Unable to create Stripe checkout session" },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe checkout failed"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
