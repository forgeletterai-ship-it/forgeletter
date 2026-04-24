import { BillingClient } from "./BillingClient"

export default function BillingPage() {
  return (
    <>
      <div className="dashboard-topbar">
        <div className="dashboard-title">
          <span className="section-kicker">Billing</span>
          <h1>Stripe subscriptions.</h1>
          <p>
            Upgrade customers through Stripe Checkout and manage subscriptions
            through the Stripe customer portal.
          </p>
        </div>
        <span className="status-pill active">Stripe ready</span>
      </div>

      <BillingClient />
    </>
  )
}
