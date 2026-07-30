import { AccountStateBanner } from "@/components/AccountStateBanner"
import { BillingClient } from "./BillingClient"
import { requireAppUser } from "@/lib/app-data"
import { formatPlanLabel, getBasePlan } from "@/lib/plans"
import { getStripe } from "@/lib/stripe"

export const dynamic = "force-dynamic"

/**
 * Live subscription facts straight from Stripe, so the billing page is
 * honest about states the DB doesn't track: a pending cancellation
 * (cancel_at_period_end) and the next renewal date. Fails soft — if
 * Stripe is unreachable the page still renders without the strip.
 */
async function getSubscriptionInfo(email: string, hasPaidPlan: boolean) {
  if (!hasPaidPlan) return null
  try {
    const stripe = getStripe()
    const customers = await stripe.customers.list({ email, limit: 3 })
    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: "active",
        limit: 1,
      })
      const sub = subs.data[0]
      if (!sub) continue
      const item = sub.items.data[0] as
        | { current_period_end?: number }
        | undefined
      const subPeriodEnd = (sub as { current_period_end?: number })
        .current_period_end
      const periodEndSec = item?.current_period_end ?? subPeriodEnd
      return {
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
        periodEnd:
          typeof periodEndSec === "number"
            ? new Date(periodEndSec * 1000).toISOString()
            : null,
      }
    }
    return null
  } catch (err) {
    console.warn(
      "[/dashboard/billing] Stripe subscription lookup failed:",
      err instanceof Error ? err.message : err
    )
    return null
  }
}

export default async function BillingPage() {
  const user = await requireAppUser()
  const subscriptionInfo = await getSubscriptionInfo(
    user.email,
    getBasePlan(user.plan) !== "free"
  )

  return (
    <>
      <div className="dashboard-topbar">
        <div className="dashboard-title">
          <span className="section-kicker">Billing</span>
          <h1>Your plan and billing.</h1>
          <p>
            Upgrade through secure Stripe Checkout, then manage invoices,
            payment methods, and subscriptions in the customer portal.
          </p>
        </div>
        <span className="status-pill active">
          {formatPlanLabel(user.plan)}
        </span>
      </div>

      {/* The past-due banner's own CTA links here — it must also render
          here, not just on the workspace. */}
      <AccountStateBanner
        pastDueSince={user.pastDueSince ?? null}
        disputedAt={user.disputedAt ?? null}
      />

      <BillingClient
        currentPlan={user.plan}
        scheduledPlanChange={user.scheduledPlanChange ?? null}
        subscriptionInfo={subscriptionInfo}
      />
    </>
  )
}
