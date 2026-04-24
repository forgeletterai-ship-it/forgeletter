import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getAppUrl,
  getOneTimeLineItem,
  getStripe,
  oneTimeProducts,
  type OneTimeProduct,
} from "@/lib/stripe"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { product } = (await req.json().catch(() => ({}))) as {
      product?: OneTimeProduct
    }

    if (!product || !(product in oneTimeProducts)) {
      return NextResponse.json({ error: "Invalid one-time product" }, { status: 400 })
    }

    const user = session.user as {
      id?: string
      email?: string | null
    }
    const appUrl = getAppUrl(req.nextUrl.origin)
    const stripe = getStripe()
    const config = oneTimeProducts[product]

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [getOneTimeLineItem(product)],
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}&type=one-time`,
      cancel_url: `${appUrl}/dashboard/billing?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata: {
        product,
        productName: config.name,
        userId: user.id || "",
        email: user.email || "",
        purchaseType: "one-time",
      },
      payment_intent_data: {
        metadata: {
          product,
          productName: config.name,
          userId: user.id || "",
          email: user.email || "",
          purchaseType: "one-time",
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
