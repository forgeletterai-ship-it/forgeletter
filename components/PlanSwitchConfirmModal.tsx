"use client"

import { useEffect, useState } from "react"

export type SwitchPreview = {
  direction: "upgrade" | "downgrade" | "same"
  flow: "immediate" | "scheduled" | "checkout"
  fromPlan: string
  toPlan: string
  cycleAnchorDate: string | null
  cycleStart: string | null
  cycleEnd: string | null
  daysRemaining: number | null
  daysTotal: number | null
  prorationFraction: number | null
  charge: number
  chargeBreakdown: Array<{ description: string; amount: number }>
  newFullPrice: number
  letterCapNow: number
  letterCapAfter: number
  lettersUsedThisPeriod: number
  currency: string
  taxIncluded: boolean
  message: string
}

type Props = {
  preview: SwitchPreview
  toPlanLabel: string
  submitting: boolean
  errorMessage: string | null
  onConfirm: (args: { consented: boolean; waiveWithdrawalRight: boolean }) => void
  onCancel: () => void
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatEUR(amount: number): string {
  const sign = amount < 0 ? "-" : ""
  return `${sign}€${Math.abs(amount).toFixed(2)}`
}

export function PlanSwitchConfirmModal({
  preview,
  toPlanLabel,
  submitting,
  errorMessage,
  onConfirm,
  onCancel,
}: Props) {
  const [consented, setConsented] = useState(false)
  const [waiveWithdrawal, setWaiveWithdrawal] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onCancel()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onCancel, submitting])

  const isUpgrade = preview.direction === "upgrade"
  const isDowngrade = preview.direction === "downgrade"
  const isCheckout = preview.flow === "checkout"

  const canSubmit =
    consented &&
    (!isUpgrade || waiveWithdrawal) &&
    !submitting

  return (
    <div className="plan-switch-modal-root" role="dialog" aria-modal="true">
      <button
        type="button"
        className="plan-switch-modal-backdrop"
        aria-label="Close"
        onClick={() => !submitting && onCancel()}
      />
      <div className={`plan-switch-modal plan-switch-modal--${preview.direction}`}>
        <header className="plan-switch-modal__header">
          <p className="plan-switch-modal__kicker">
            {isCheckout
              ? "Start subscription"
              : isUpgrade
                ? "Upgrade plan"
                : "Downgrade plan"}
          </p>
          <h2>Switch to {toPlanLabel}?</h2>
        </header>

        {/* TODAY block */}
        <section className="plan-switch-modal__section">
          <h3 className="plan-switch-modal__section-title">
            Today{" "}
            <span className="plan-switch-modal__section-sub">
              ({new Date().toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })})
            </span>
          </h3>
          <ul className="plan-switch-modal__bullets">
            {isCheckout ? (
              <>
                <li>You'll be redirected to secure Stripe Checkout.</li>
                <li>
                  First charge: <strong>{formatEUR(preview.charge)}</strong>
                  {preview.taxIncluded ? " (VAT included)" : ""}
                </li>
              </>
            ) : isUpgrade ? (
              <>
                <li>Access to {toPlanLabel} starts immediately.</li>
                <li>
                  Your card will be charged{" "}
                  <strong>{formatEUR(preview.charge)}</strong>
                  {preview.taxIncluded ? " (VAT included)" : ""} right now.
                </li>
                <li>
                  Your letter cap goes from{" "}
                  <strong>{preview.letterCapNow}</strong> to{" "}
                  <strong>{preview.letterCapAfter}</strong> for the remainder of
                  the cycle.
                </li>
              </>
            ) : (
              <>
                <li>
                  <strong>No charge today.</strong> No change to your access
                  right now.
                </li>
                <li>
                  You keep your current plan and all its letters until your
                  cycle ends.
                </li>
              </>
            )}
          </ul>
        </section>

        {/* HOW WE CALCULATED (upgrades only) */}
        {isUpgrade && preview.cycleStart && preview.cycleEnd ? (
          <section className="plan-switch-modal__section plan-switch-modal__section--calc">
            <h3 className="plan-switch-modal__section-title">
              How we calculated this
            </h3>
            <ul className="plan-switch-modal__calc">
              <li>
                <span>Your current billing cycle</span>
                <strong>
                  {formatDate(preview.cycleStart)} → {formatDate(preview.cycleEnd)}
                </strong>
              </li>
              <li>
                <span>Days remaining</span>
                <strong>
                  {preview.daysRemaining} of {preview.daysTotal} (
                  {Math.round((preview.prorationFraction ?? 0) * 100)}% of the
                  cycle left)
                </strong>
              </li>
              {preview.chargeBreakdown.map((line, i) => (
                <li key={i}>
                  <span>{line.description}</span>
                  <strong className={line.amount < 0 ? "neg" : ""}>
                    {formatEUR(line.amount)}
                  </strong>
                </li>
              ))}
              <li className="plan-switch-modal__calc-total">
                <span>You pay today</span>
                <strong>
                  {formatEUR(preview.charge)}
                  {preview.taxIncluded ? " (VAT included)" : ""}
                </strong>
              </li>
            </ul>
            <p className="plan-switch-modal__calc-note">
              We prorate the same way Stripe does: we credit you for the days
              you haven't used on your old plan, then charge for the same days
              on your new plan. Money and letters move in step — each extra
              letter you unlock costs the same per letter as your new plan's
              full-price rate.
            </p>
          </section>
        ) : null}

        {/* NEXT INVOICE / RENEWAL block */}
        <section className="plan-switch-modal__section">
          <h3 className="plan-switch-modal__section-title">
            {isDowngrade ? "On your next renewal" : "Going forward"}
            {preview.cycleAnchorDate ? (
              <span className="plan-switch-modal__section-sub">
                {" "}
                ({formatDate(preview.cycleAnchorDate)})
              </span>
            ) : null}
          </h3>
          <ul className="plan-switch-modal__bullets">
            {isDowngrade ? (
              <>
                <li>
                  Your plan switches to <strong>{toPlanLabel}</strong>.
                </li>
                <li>
                  Your letter cap becomes{" "}
                  <strong>{preview.letterCapAfter}</strong> for the new cycle.
                </li>
                <li>
                  You'll be charged{" "}
                  <strong>{formatEUR(preview.newFullPrice)}</strong> for the
                  first {toPlanLabel} cycle.
                </li>
                <li>
                  You can cancel this scheduled change anytime before then from
                  your Billing page.
                </li>
              </>
            ) : (
              <>
                <li>
                  Next renewal price:{" "}
                  <strong>{formatEUR(preview.newFullPrice)}</strong>
                  {preview.taxIncluded ? " (VAT included)" : ""}
                </li>
                <li>
                  Your full {toPlanLabel} letter cap will apply.
                </li>
              </>
            )}
          </ul>
        </section>

        {errorMessage ? (
          <div className="plan-switch-modal__error" role="alert">
            {errorMessage}
          </div>
        ) : null}

        {/* CONSENT */}
        <section className="plan-switch-modal__consents">
          <label className="plan-switch-modal__consent">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              disabled={submitting}
            />
            <span>
              {isUpgrade
                ? `I understand I'll be charged ${formatEUR(preview.charge)} now and I agree to the prorated charge.`
                : isDowngrade
                  ? `I understand my plan will change on ${formatDate(preview.cycleAnchorDate)} and that I keep my current plan and letters until then.`
                  : `I agree to the terms shown.`}
            </span>
          </label>
          {isUpgrade ? (
            <label className="plan-switch-modal__consent">
              <input
                type="checkbox"
                checked={waiveWithdrawal}
                onChange={(e) => setWaiveWithdrawal(e.target.checked)}
                disabled={submitting}
              />
              <span>
                I waive my 14-day right of withdrawal because this upgrade
                takes effect and provides me access immediately.
              </span>
            </label>
          ) : null}
        </section>

        <footer className="plan-switch-modal__actions">
          <button
            type="button"
            className="plan-switch-modal__cancel"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="plan-switch-modal__confirm"
            disabled={!canSubmit}
            onClick={() =>
              onConfirm({ consented, waiveWithdrawalRight: waiveWithdrawal })
            }
          >
            {submitting
              ? "Working…"
              : isDowngrade
                ? "Confirm scheduled change"
                : isCheckout
                  ? "Go to checkout"
                  : "Confirm switch"}
          </button>
        </footer>
      </div>
    </div>
  )
}
