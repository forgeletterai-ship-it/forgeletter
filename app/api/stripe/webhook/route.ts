import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import {
  getStoredPlanId,
  normalizeBillingPeriod,
  normalizeStoredPlan,
  type StoredPlanId,
} from "@/lib/plans"
import { customerSafeSupabaseError, supabaseAdmin } from "@/lib/supabase"
import { getStripe, type BillingPlan } from "@/lib/stripe"

export const runtime = "nodejs"

// Subscription statuses that grant access to paid features. Anything
// outside this set falls back to the free plan.
const activeSubscriptionStatuses = new Set(["active", "trialing"])

// Events we handle. Any other event is acknowledged so Stripe stops
// retrying but no business logic runs.
const handledEventTypes = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "charge.dispute.created",
])

/**
 * Stripe webhook endpoint. The only callers should be Stripe itself —
 * humans hitting it directly get a 405 with no body so we do not leak
 * which events we listen for.
 */
export async function GET() {
  return new NextResponse(null, {
    status: 405,
    headers: { Allow: "POST" },
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

  // Skip events we do not care about, but acknowledge so Stripe stops
  // retrying.
  if (!handledEventTypes.has(event.type)) {
    return NextResponse.json({ received: true, skipped: true })
  }

  // Idempotency check. Stripe retries failed deliveries for up to 3
  // days; without this guard every retry would re-run the side
  // effects (double-credit one-time purchases, repeated plan flips).
  const alreadyProcessed = await recordEventProcessed(event.id, event.type)
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChange(event.data.object as Stripe.Subscription)
        break
      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      case "charge.dispute.created":
        await handleDisputeCreated(event.data.object as Stripe.Dispute)
        break
    }
  } catch (error) {
    // Roll the idempotency record back so Stripe's retry can have
    // another go after we fix whatever broke.
    await rollbackEventProcessed(event.id)
    return NextResponse.json(
      { error: customerSafeSupabaseError(error) },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}

/**
 * Insert the event id into stripe_processed_events. Returns true if
 * the row already existed (i.e. this is a duplicate delivery).
 */
async function recordEventProcessed(
  eventId: string,
  eventType: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("stripe_processed_events")
    .insert({ event_id: eventId, event_type: eventType })
    .select("event_id")
    .maybeSingle()

  if (error) {
    // Postgres unique-violation: duplicate delivery.
    if ((error as { code?: string }).code === "23505") return true
    throw error
  }

  return !data
}

async function rollbackEventProcessed(eventId: string) {
  try {
    await supabaseAdmin
      .from("stripe_processed_events")
      .delete()
      .eq("event_id", eventId)
  } catch {
    // best-effort; if rollback fails, Stripe will still retry and we
    // will skip via the idempotency check, which is the safe outcome.
  }
}

type UserLookup = { userId?: string | null; email?: string | null }

async function updateUsersRow(
  lookup: UserLookup,
  patch: Record<string, unknown>
) {
  const { userId, email } = lookup
  if (!userId && !email) return

  try {
    const query = supabaseAdmin.from("users").update(patch)
    const { error } = userId
      ? await query.eq("id", userId)
      : await query.eq("email", email!.toLowerCase())

    if (error) throw error
  } catch (error) {
    throw new Error(customerSafeSupabaseError(error))
  }
}

/**
 * Resolve the local user row. Prefers metadata.userId (immutable
 * stable id we set at checkout) over email (which a user can change
 * in our app, breaking the match). Email is the fallback only.
 */
async function updateUserPlan(lookup: UserLookup, plan: StoredPlanId) {
  return updateUsersRow(lookup, { plan })
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const plan = session.metadata?.plan as BillingPlan | undefined
  const period = normalizeBillingPeriod(session.metadata?.period)
  const planId = normalizeStoredPlan(
    session.metadata?.planId || (plan ? getStoredPlanId(plan, period) : "free")
  )

  // No outbound Stripe API call: take everything from the event
  // payload we already have. This keeps the webhook responsive even
  // when Stripe's read API is degraded.
  const userId = session.metadata?.userId || session.client_reference_id || null
  const email = session.metadata?.email || session.customer_details?.email || null

  if (!plan || (!userId && !email)) return

  await updateUserPlan({ userId, email }, planId)
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const plan = subscription.metadata?.plan as BillingPlan | undefined
  const recurringInterval = subscription.items.data[0]?.price.recurring?.interval
  const period = normalizeBillingPeriod(
    subscription.metadata?.period ||
      (recurringInterval === "year" ? "annual" : "monthly")
  )
  const planId = normalizeStoredPlan(
    subscription.metadata?.planId ||
      (plan ? getStoredPlanId(plan, period) : "free")
  )

  const userId = subscription.metadata?.userId || null
  const email = subscription.metadata?.email || null

  if (!userId && !email) return

  if (!activeSubscriptionStatuses.has(subscription.status)) {
    await updateUserPlan({ userId, email }, "free")
    return
  }

  if (plan) {
    await updateUserPlan({ userId, email }, planId)
  }
}

function lookupFromInvoice(invoice: Stripe.Invoice): UserLookup {
  const subscriptionMetadata =
    (invoice as { subscription_details?: { metadata?: Record<string, string> } })
      .subscription_details?.metadata
  const userId = invoice.metadata?.userId || subscriptionMetadata?.userId || null
  const email = invoice.customer_email || null
  return { userId, email }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Renewal payment cleared. If we had previously flagged the user
  // as past_due (after a failed renewal) clear that now.
  const lookup = lookupFromInvoice(invoice)
  if (!lookup.userId && !lookup.email) return
  await updateUsersRow(lookup, { past_due_since: null })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Renewal payment failed (expired card, insufficient funds, etc.).
  // Flag the user so the UI can prompt them to update their card and
  // a downgrade job can pick them up after the grace period expires.
  const lookup = lookupFromInvoice(invoice)
  if (!lookup.userId && !lookup.email) return
  await updateUsersRow(lookup, { past_due_since: new Date().toISOString() })
}

async function handleDisputeCreated(dispute: Stripe.Dispute) {
  // Someone has disputed a charge with their card issuer. Flag the
  // account for ops review so chargeback fraud (use the service then
  // dispute the charge) is detectable.
  const charge = dispute.charge
  const chargeId = typeof charge === "string" ? charge : charge?.id
  if (!chargeId) return

  // Charges carry the same metadata as the originating subscription.
  // We have to read the charge to get its metadata + customer email
  // since dispute objects do not include them directly.
  const stripe = getStripe()
  const chargeObj = await stripe.charges.retrieve(chargeId)

  const userId = chargeObj.metadata?.userId || null
  const email = chargeObj.billing_details?.email || chargeObj.receipt_email || null

  if (!userId && !email) return

  await updateUsersRow({ userId, email }, { disputed_at: new Date().toISOString() })
}
