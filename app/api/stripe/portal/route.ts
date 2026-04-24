import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAppUrl, getStripe } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const stripe = getStripe()
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    })

    const customer = customers.data[0]

    if (!customer) {
      return NextResponse.json(
        { error: "No Stripe customer found yet" },
        { status: 404 }
      )
    }

    const appUrl = getAppUrl(req.nextUrl.origin)
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${appUrl}/dashboard/billing`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe portal failed"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
