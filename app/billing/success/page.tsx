import Link from "next/link"
import { PublicFooter, PublicNav } from "@/components/PublicChrome"

type BillingSuccessPageProps = {
  searchParams?: Promise<{
    type?: string
  }>
}

export default async function BillingSuccessPage({
  searchParams,
}: BillingSuccessPageProps) {
  const params = await searchParams
  const isOneTimePurchase = params?.type === "one-time"

  return (
    <div className="page-shell">
      <PublicNav />
      <main>
        <section className="page-hero billing-result-hero">
          <div className="container">
            <span className="section-kicker">Billing</span>
            <span className="status-pill active">Payment confirmed</span>
            <h1>
              {isOneTimePurchase ? "Payment complete." : "Subscription active."}
            </h1>
            <p>
              {isOneTimePurchase
                ? "Your purchase has been confirmed by Stripe. You can return to the workspace and continue preparing your next application."
                : "Your LetterForge plan is now ready. Stripe manages the payment securely, and your workspace will update automatically."}
            </p>
            <div className="billing-result-actions">
              <Link className="button" href="/dashboard">
                Open dashboard
              </Link>
              <Link className="button-secondary" href="/dashboard/billing">
                View billing
              </Link>
            </div>
          </div>
        </section>

        <section className="container billing-result-grid">
          <article className="billing-result-card">
            <span>01</span>
            <h3>Checkout complete</h3>
            <p>
              Stripe has accepted the checkout and will send the receipt or
              subscription confirmation to the email used at payment.
            </p>
          </article>
          <article className="billing-result-card">
            <span>02</span>
            <h3>Workspace unlocked</h3>
            <p>
              If the paid plan is not visible instantly, refresh billing in a
              moment. Stripe confirmations can take a few seconds to arrive.
            </p>
          </article>
          <article className="billing-result-card">
            <span>03</span>
            <h3>Manage anytime</h3>
            <p>
              Use the billing page to open the Stripe customer portal for
              invoices, card changes, and subscription management.
            </p>
          </article>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
