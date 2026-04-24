import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  billingPlans,
  getAppUrl,
  getCheckoutLineItem,
  getStripe,
  type BillingPlan,
} from "@/lib/stripe"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { plan } = (await req.json().catch(() => ({}))) as {
      plan?: BillingPlan
    }

    if (!plan || !(plan in billingPlans)) {
      return NextResponse.json({ error: "Invalid billing plan" }, { status: 400 })
    }

    const user = session.user as {
      id?: string
      email?: string | null
      name?: string | null
    }
    const appUrl = getAppUrl(req.nextUrl.origin)
    const stripe = getStripe()

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [getCheckoutLineItem(plan)],
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata: {
        plan,
        userId: user.id || "",
        email: user.email || "",
      },
      subscription_data: {
        metadata: {
          plan,
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
