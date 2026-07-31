import Link from "next/link"
import { PublicFooter, PublicNav } from "@/components/PublicChrome"
import { getStripe } from "@/lib/stripe"

export const dynamic = "force-dynamic"

type BillingSuccessPageProps = {
  searchParams?: Promise<{
    session_id?: string
  }>
}

/**
 * Verify the checkout session with Stripe instead of statically
 * claiming "Payment confirmed" — direct navigation to this URL used to
 * render a fake confirmation. Three honest states:
 *   - paid: Stripe confirms payment_status=paid → confirmed copy
 *   - pending: session exists but isn't paid (async methods, aborted)
 *   - unknown: no/invalid session id, or Stripe unreachable → neutral
 *     copy that points at the billing page as the source of truth
 */
async function verifySession(
  sessionId: string | undefined
): Promise<"paid" | "pending" | "unknown"> {
  if (!sessionId || !sessionId.startsWith("cs_")) return "unknown"
  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status === "paid") return "paid"
    return "pending"
  } catch (err) {
    console.warn(
      "[/billing/success] session verification failed:",
      err instanceof Error ? err.message : err
    )
    return "unknown"
  }
}

export default async function BillingSuccessPage({
  searchParams,
}: BillingSuccessPageProps) {
  const params = await searchParams
  const state = await verifySession(params?.session_id)

  const heading =
    state === "paid"
      ? "Subscription active."
      : state === "pending"
        ? "Payment is processing."
        : "Checkout finished."
  const copy =
    state === "paid"
      ? "Stripe has confirmed your payment. Your workspace unlocks automatically — the receipt is on its way to your email."
      : state === "pending"
        ? "Stripe hasn't confirmed the payment yet. This usually resolves within a minute — your billing page will show the active plan as soon as it does."
        : "Check the billing page for your current plan status — it always reflects what Stripe has actually confirmed."

  return (
    <div className="page-shell">
      <PublicNav />
      <main>
        <section className="page-hero billing-result-hero">
          <div className="container">
            <span className="section-kicker">Billing</span>
            <span className={`status-pill${state === "paid" ? " active" : ""}`}>
              {state === "paid" ? "Payment confirmed" : "Status"}
            </span>
            <h1>{heading}</h1>
            <p>{copy}</p>
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
            <h3>{state === "paid" ? "Checkout complete" : "Checkout closed"}</h3>
            <p>
              {state === "paid"
                ? "Stripe accepted the payment and will email the receipt to the address used at checkout."
                : "No plan changes happen until Stripe confirms a successful payment."}
            </p>
          </article>
          <article className="billing-result-card">
            <span>02</span>
            <h3>Workspace unlocks automatically</h3>
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
