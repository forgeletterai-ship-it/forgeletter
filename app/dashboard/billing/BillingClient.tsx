"use client"

import { useState } from "react"
import { PricingCards, type PlanKey } from "@/components/PricingCards"

type BillingClientProps = {
  currentPlan: "free" | "pro" | "ultra"
}

export function BillingClient({ currentPlan }: BillingClientProps) {
  const [loadingPlan, setLoadingPlan] = useState<"" | PlanKey>("")
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
        error: `Unexpected billing response (${res.status}). Please try again or contact support.`,
      }
    }
  }

  async function startCheckout(plan: PlanKey) {
    if (plan === "starter") {
      setLoadingPlan("starter")
      await openPortal()
      setLoadingPlan("")
      return
    }

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

      <section className="dashboard-pricing-surface" aria-label="Subscription plans">
        <PricingCards
          currentPlan={currentPlan === "free" ? "starter" : currentPlan}
          loadingPlan={loadingPlan}
          onSelectPlan={startCheckout}
        />
      </section>

      <section className="dashboard-card" style={{ marginTop: 16 }}>
        <h3>Manage subscription</h3>
        <p>
          Update payment method, invoices, and cancellation inside the secure
          billing portal.
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
