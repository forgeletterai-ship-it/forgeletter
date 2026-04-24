"use client"

import { useState } from "react"

type Plan = {
  id: "starter" | "pro" | "ultra"
  name: string
  price: string
  state: string
  points: string[]
  highlighted?: boolean
}

type OneTimeProduct = {
  id: "single-letter-pack" | "cv-review" | "interview-prep"
  name: string
  price: string
  description: string
}

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "Free",
    state: "Current",
    points: ["3 draft slots", "Basic workspace", "Manual copy"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "EUR 9 / month",
    state: "Most popular",
    highlighted: true,
    points: ["More saved letters", "Export controls", "Priority roadmap"],
  },
  {
    id: "ultra",
    name: "Ultra",
    price: "EUR 19 / month",
    state: "Partner-ready",
    points: ["Unlimited workspace", "Profile variants", "Priority support"],
  },
]

const oneTimeProducts: OneTimeProduct[] = [
  {
    id: "single-letter-pack",
    name: "Single Cover Letter Pack",
    price: "EUR 7",
    description: "One polished cover letter brief and export-ready draft.",
  },
  {
    id: "cv-review",
    name: "CV Review",
    price: "EUR 29",
    description: "A one-time CV review add-on for a stronger application package.",
  },
  {
    id: "interview-prep",
    name: "Interview Prep Session",
    price: "EUR 39",
    description: "A one-time interview preparation add-on.",
  },
]

export function BillingClient() {
  const [loadingPlan, setLoadingPlan] = useState<string>("")
  const [loadingProduct, setLoadingProduct] = useState<string>("")
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState("")

  async function readJsonResponse(res: Response) {
    const text = await res.text()

    if (!text) {
      return {}
    }

    try {
      return JSON.parse(text) as { url?: string; error?: string }
    } catch {
      return {
        error: `Unexpected server response (${res.status}). Check Stripe environment variables and deployment logs.`,
      }
    }
  }

  async function startCheckout(plan: "pro" | "ultra") {
    setError("")
    setLoadingPlan(plan)

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await readJsonResponse(res)

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not start checkout.")
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.")
      setLoadingPlan("")
    }
  }

  async function startOneTimeCheckout(product: OneTimeProduct["id"]) {
    setError("")
    setLoadingProduct(product)

    try {
      const res = await fetch("/api/stripe/checkout-one-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      })
      const data = await readJsonResponse(res)

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not start checkout.")
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.")
      setLoadingProduct("")
    }
  }

  async function openPortal() {
    setError("")
    setPortalLoading(true)

    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      const data = await readJsonResponse(res)

      if (!res.ok || !data.url) {
        throw new Error(data.error || "No Stripe customer found yet.")
      }

      window.location.href = data.url
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not open the billing portal."
      )
      setPortalLoading(false)
    }
  }

  return (
    <>
      {error ? <div className="alert" style={{ marginBottom: 16 }}>{error}</div> : null}

      <div className="price-grid">
        {plans.map((plan) => (
          <article
            className={`price-card${plan.highlighted ? " highlight" : ""}`}
            key={plan.id}
          >
            <small>{plan.state}</small>
            <h2>{plan.name}</h2>
            <div className="price">{plan.price}</div>
            <ul className="check-list">
              {plan.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            {plan.id === "starter" ? (
              <button className="button-secondary" type="button">
                Current plan
              </button>
            ) : (
              <button
                className={plan.highlighted ? "button" : "button-secondary"}
                type="button"
                onClick={() =>
                  startCheckout(plan.id === "pro" ? "pro" : "ultra")
                }
                disabled={Boolean(loadingPlan)}
              >
                {loadingPlan === plan.id ? "Opening Stripe..." : `Upgrade to ${plan.name}`}
              </button>
            )}
          </article>
        ))}
      </div>

      <section className="dashboard-card" style={{ marginTop: 16 }}>
        <h3>One-time add-ons</h3>
        <p>
          Use one-off Stripe Checkout for services that are not part of the
          monthly subscription.
        </p>
        <div className="table-list">
          {oneTimeProducts.map((product) => (
            <div className="table-row" key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <span>{product.description}</span>
              </div>
              <span className="status-pill">{product.price}</span>
              <button
                className="button-secondary"
                type="button"
                onClick={() => startOneTimeCheckout(product.id)}
                disabled={Boolean(loadingProduct)}
              >
                {loadingProduct === product.id ? "Opening Stripe..." : "Buy once"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-card" style={{ marginTop: 16 }}>
        <h3>Manage subscription</h3>
        <p>
          After a customer completes Stripe checkout, they can update payment
          method, invoices, and cancellation inside the Stripe customer portal.
        </p>
        <button
          className="button-soft"
          type="button"
          onClick={openPortal}
          disabled={portalLoading}
        >
          {portalLoading ? "Opening portal..." : "Open billing portal"}
        </button>
      </section>
    </>
  )
}
