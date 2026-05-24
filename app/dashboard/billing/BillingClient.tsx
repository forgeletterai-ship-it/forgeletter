"use client"

import { useState } from "react"
import { PricingCards, type PlanKey } from "@/components/PricingCards"
import { getBasePlan, type BillingPeriod, type StoredPlanId } from "@/lib/plans"

type BillingClientProps = {
  currentPlan: StoredPlanId
}

export function BillingClient({ currentPlan }: BillingClientProps) {
  const [loadingPlan, setLoadingPlan] = useState<"" | PlanKey>("")
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const hasActiveSubscription = getBasePlan(currentPlan) !== "free"

  async function readJsonResponse(res: Response) {
    const text = await res.text()

    if (!text) {
      return {}
    }

    try {
      return JSON.parse(text) as {
        url?: string
        error?: string
        ok?: boolean
        message?: string
      }
    } catch {
      return {
        error: `Unexpected billing response (${res.status}). Please try again or contact support.`,
      }
    }
  }

  async function selectPlan(plan: PlanKey, period: BillingPeriod) {
    setError("")
    setMessage("")
    setLoadingPlan(plan)

    try {
      if (hasActiveSubscription) {
        const switchRes = await fetch("/api/stripe/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, period }),
        })

        if (switchRes.status !== 404) {
          const switchData = await readJsonResponse(switchRes)
          if (!switchRes.ok) {
            throw new Error(switchData.error || "Could not update subscription.")
          }
          setMessage(
            switchData.message ||
              "Subscription updated. Your next invoice will reflect the prorated change."
          )
          setLoadingPlan("")
          window.setTimeout(() => window.location.reload(), 1800)
          return
        }
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, period }),
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
    setMessage("")
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
      {message ? <div className="billing-success">{message}</div> : null}

      {hasActiveSubscription ? (
        <p className="billing-switch-hint">
          Picking a different plan upgrades or downgrades your active
          subscription immediately. Stripe prorates the remainder of your
          current period on your next invoice — no need to detour through
          the billing portal.
        </p>
      ) : null}

      <section className="dashboard-pricing-surface" aria-label="Subscription plans">
        <PricingCards
          currentPlan={currentPlan}
          loadingPlan={loadingPlan}
          onSelectPlan={selectPlan}
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
