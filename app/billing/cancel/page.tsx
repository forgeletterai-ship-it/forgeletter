import Link from "next/link"
import { PublicFooter, PublicNav } from "@/components/PublicChrome"

export default function BillingCancelPage() {
  return (
    <div className="page-shell">
      <PublicNav />
      <main>
        <section className="page-hero billing-result-hero">
          <div className="container">
            <span className="section-kicker">Billing</span>
            <span className="status-pill">Checkout closed</span>
            <h1>No payment was taken.</h1>
            <p>
              You left Stripe before confirming the checkout. Your current
              LetterForge plan has not changed.
            </p>
            <div className="billing-result-actions">
              <Link className="button" href="/dashboard/billing">
                Return to billing
              </Link>
              <Link className="button-secondary" href="/dashboard">
                Open dashboard
              </Link>
            </div>
          </div>
        </section>

        <section className="container billing-result-grid">
          <article className="billing-result-card">
            <span>01</span>
            <h3>Nothing changed</h3>
            <p>
              A closed checkout session does not activate a paid plan or charge
              a card.
            </p>
          </article>
          <article className="billing-result-card">
            <span>02</span>
            <h3>Try again when ready</h3>
            <p>
              You can restart checkout from the billing page whenever you want
              to upgrade.
            </p>
          </article>
          <article className="billing-result-card">
            <span>03</span>
            <h3>Keep using Starter</h3>
            <p>
              The free workspace remains available while you continue testing
              the product.
            </p>
          </article>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
