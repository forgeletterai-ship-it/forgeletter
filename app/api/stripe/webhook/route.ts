import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { supabaseAdmin } from "@/lib/supabase"
import { getStripe, type BillingPlan } from "@/lib/stripe"

export const runtime = "nodejs"

const activeSubscriptionStatuses = new Set(["active", "trialing"])

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "Stripe webhook endpoint",
    expectedMethod: "POST",
    events: [
      "checkout.session.completed",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ],
  })
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 }
    )
  }

  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 })
  }

  let event: Stripe.Event
  const stripe = getStripe()

  try {
    const rawBody = await req.text()
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChange(event.data.object as Stripe.Subscription)
        break
      default:
        break
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const plan = session.metadata?.plan as BillingPlan | undefined
  const email = session.metadata?.email || session.customer_details?.email

  if (!plan || !email) return

  await updateUserPlan(email, plan)
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const plan = subscription.metadata?.plan as BillingPlan | undefined
  const email = subscription.metadata?.email || (await getCustomerEmail(subscription.customer))

  if (!email) return

  if (!activeSubscriptionStatuses.has(subscription.status)) {
    await updateUserPlan(email, "free")
    return
  }

  if (plan) {
    await updateUserPlan(email, plan)
  }
}

async function getCustomerEmail(customer: string | Stripe.Customer | Stripe.DeletedCustomer) {
  if (typeof customer !== "string") {
    return "email" in customer ? customer.email : null
  }

  const stripeCustomer = await getStripe().customers.retrieve(customer)

  if ("deleted" in stripeCustomer && stripeCustomer.deleted) {
    return null
  }

  return stripeCustomer.email
}

async function updateUserPlan(email: string, plan: BillingPlan | "free") {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ plan })
    .eq("email", email)

  if (error) {
    throw new Error(error.message)
  }
}
