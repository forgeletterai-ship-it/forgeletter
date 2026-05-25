import { BillingClient } from "./BillingClient"
import { getCurrentAppUser } from "@/lib/app-data"
import { formatPlanLabel } from "@/lib/plans"

export default async function BillingPage() {
  const { user } = await getCurrentAppUser()

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
          {formatPlanLabel(user?.plan || "free")}
        </span>
      </div>

      <BillingClient
        currentPlan={user?.plan || "free"}
        scheduledPlanChange={user?.scheduledPlanChange ?? null}
      />
    </>
  )
}
