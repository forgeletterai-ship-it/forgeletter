"use client"

import { useState } from "react"
import { PricingCards, type PlanKey } from "@/components/PricingCards"
import {
  PlanSwitchConfirmModal,
  type SwitchPreview,
} from "@/components/PlanSwitchConfirmModal"
import {
  formatPlanLabel,
  type BillingPeriod,
  type StoredPlanId,
} from "@/lib/plans"

type BillingClientProps = {
  currentPlan: StoredPlanId
  scheduledPlanChange?: {
    toPlan: string
    effectiveAt: string
  } | null
}

type ModalState =
  | { kind: "closed" }
  | {
      kind: "loading"
      plan: PlanKey
      period: BillingPeriod
    }
  | {
      kind: "open"
      plan: PlanKey
      period: BillingPeriod
      preview: SwitchPreview
    }
  | {
      kind: "submitting"
      plan: PlanKey
      period: BillingPeriod
      preview: SwitchPreview
    }

export function BillingClient({
  currentPlan,
  scheduledPlanChange = null,
}: BillingClientProps) {
  const [portalLoading, setPortalLoading] = useState(false)
  const [cancelScheduledLoading, setCancelScheduledLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [modalError, setModalError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>({ kind: "closed" })

  const loadingPlan: "" | PlanKey =
    modal.kind === "loading" || modal.kind === "submitting" ? modal.plan : ""

  async function readJsonResponse<T = Record<string, unknown>>(res: Response): Promise<T> {
    const text = await res.text()
    if (!text) return {} as T
    try {
      return JSON.parse(text) as T
    } catch {
      return {
        error: `Unexpected billing response (${res.status}). Please try again.`,
      } as T
    }
  }

  async function selectPlan(plan: PlanKey, period: BillingPeriod) {
    setError("")
    setMessage("")
    setModalError(null)
    setModal({ kind: "loading", plan, period })

    try {
      const res = await fetch("/api/stripe/preview-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, period }),
      })
      const data = await readJsonResponse<SwitchPreview & { error?: string }>(res)

      if (!res.ok || (data as { error?: string }).error) {
        // Not all errors are user fault: "Already on this plan" / 404 are
        // surfaced as a top-level alert rather than a modal.
        setModal({ kind: "closed" })
        setError(
          (data as { error?: string }).error || "Could not preview plan change."
        )
        return
      }

      setModal({ kind: "open", plan, period, preview: data as SwitchPreview })
    } catch (err) {
      setModal({ kind: "closed" })
      setError(err instanceof Error ? err.message : "Could not preview plan change.")
    }
  }

  async function confirmSwitch(args: {
    consented: boolean
    waiveWithdrawalRight: boolean
  }) {
    if (modal.kind !== "open") return
    const { plan, period, preview } = modal
    setModalError(null)
    setModal({ kind: "submitting", plan, period, preview })

    try {
      // Free customers skip the switch endpoint entirely — they need a
      // Stripe Checkout session.
      if (preview.flow === "checkout") {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, period }),
        })
        const data = await readJsonResponse<{ url?: string; error?: string }>(res)
        if (!res.ok || !data.url) {
          setModalError(data.error || "Could not start checkout.")
          setModal({ kind: "open", plan, period, preview })
          return
        }
        window.location.href = data.url
        return
      }

      const res = await fetch("/api/stripe/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          period,
          consented: args.consented,
          waiveWithdrawalRight: args.waiveWithdrawalRight,
        }),
      })
      const data = await readJsonResponse<{
        ok?: boolean
        flow?: string
        message?: string
        error?: string
      }>(res)

      if (!res.ok || !data.ok) {
        setModalError(data.error || "Could not change plan.")
        setModal({ kind: "open", plan, period, preview })
        return
      }

      setMessage(data.message || "Plan change confirmed.")
      setModal({ kind: "closed" })
      window.setTimeout(() => window.location.reload(), 1800)
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Could not change plan."
      )
      setModal({ kind: "open", plan, period, preview })
    }
  }

  async function cancelScheduledChange() {
    setError("")
    setMessage("")
    setCancelScheduledLoading(true)
    try {
      const res = await fetch("/api/stripe/cancel-scheduled-change", {
        method: "POST",
      })
      const data = await readJsonResponse<{ ok?: boolean; message?: string; error?: string }>(res)
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not cancel the scheduled change.")
        return
      }
      setMessage(data.message || "Scheduled change cancelled.")
      window.setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel the scheduled change.")
    } finally {
      setCancelScheduledLoading(false)
    }
  }

  async function openPortal() {
    setError("")
    setMessage("")
    setPortalLoading(true)
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      const data = await readJsonResponse<{ url?: string; error?: string }>(res)
      if (!res.ok || !data.url) {
        throw new Error(data.error || "No Stripe customer found yet.")
      }
      window.location.href = data.url
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not open the billing portal."
      )
      setPortalLoading(false)
    }
  }

  const showScheduledBanner =
    scheduledPlanChange &&
    new Date(scheduledPlanChange.effectiveAt).getTime() > Date.now()

  return (
    <>
      {error ? <div className="alert" style={{ marginBottom: 16 }}>{error}</div> : null}
      {message ? <div className="billing-success">{message}</div> : null}

      {showScheduledBanner && scheduledPlanChange ? (
        <div className="billing-scheduled-banner" role="status">
          <div className="billing-scheduled-banner__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div className="billing-scheduled-banner__copy">
            <strong>Scheduled plan change</strong>
            <p>
              Your plan will switch to{" "}
              <strong>{formatPlanLabel(scheduledPlanChange.toPlan)}</strong> on{" "}
              <strong>
                {new Date(scheduledPlanChange.effectiveAt).toLocaleDateString(
                  undefined,
                  { weekday: "long", day: "numeric", month: "long", year: "numeric" }
                )}
              </strong>
              . Until then you keep your current plan and full letter cap.
            </p>
          </div>
          <button
            type="button"
            className="billing-scheduled-banner__cancel"
            onClick={cancelScheduledChange}
            disabled={cancelScheduledLoading}
          >
            {cancelScheduledLoading ? "Cancelling…" : "Cancel change"}
          </button>
        </div>
      ) : null}

      <p className="billing-switch-hint">
        Picking a different plan opens a confirmation dialog with your exact
        prorated numbers. Upgrades take effect immediately; downgrades take
        effect at your next renewal so you keep what you paid for.
      </p>

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
          Update payment method, download invoices, and cancel inside the secure
          Stripe billing portal.
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

      {modal.kind === "open" || modal.kind === "submitting" ? (
        <PlanSwitchConfirmModal
          preview={modal.preview}
          toPlanLabel={formatPlanLabel(modal.preview.toPlan)}
          fromPlanLabel={formatPlanLabel(modal.preview.fromPlan)}
          submitting={modal.kind === "submitting"}
          errorMessage={modalError}
          onConfirm={confirmSwitch}
          onCancel={() => setModal({ kind: "closed" })}
        />
      ) : null}
    </>
  )
}
