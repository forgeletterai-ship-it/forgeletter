"use client"

import { useEffect, useState } from "react"

export type SwitchPreview = {
  direction: "upgrade" | "downgrade" | "same"
  flow: "immediate" | "scheduled" | "checkout"
  fromPlan: string
  toPlan: string
  /** "month" or "year" — used to label the full-period cap in
   *  "Going forward" so customers know what 420 letters covers. */
  toPlanPeriodNoun?: "month" | "year"
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
  /** Letter cap for what remains of the CURRENT cycle after the
   *  switch (prorated). For mid-cycle upgrades this is a small
   *  number relative to the full plan cap. */
  letterCapAfter: number
  /** Full letter cap for the NEXT renewal cycle on the new plan.
   *  Critical for Monthly→Annual where the proration math gives a
   *  misleadingly low number for the rest-of-cycle. */
  nextCycleLetterCap?: number
  lettersUsedThisPeriod: number
  currency: string
  taxIncluded: boolean
  message: string
}

type Props = {
  preview: SwitchPreview
  toPlanLabel: string
  fromPlanLabel: string
  submitting: boolean
  errorMessage: string | null
  onConfirm: (args: { consented: boolean; waiveWithdrawalRight: boolean }) => void
  onCancel: () => void
}

function formatLongDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })
}

function formatEUR(amount: number): string {
  const sign = amount < 0 ? "−" : ""
  return `${sign}€${Math.abs(amount).toFixed(2)}`
}

export function PlanSwitchConfirmModal({
  preview,
  toPlanLabel,
  fromPlanLabel,
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
    consented && (!isUpgrade || waiveWithdrawal) && !submitting

  const todayDate = new Date().toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

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
            <span className="plan-switch-modal__section-sub">({todayDate})</span>
          </h3>
          <ul className="plan-switch-modal__bullets">
            {isCheckout ? (
              <>
                <li>You'll be redirected to secure Stripe Checkout.</li>
                <li>
                  First charge:{" "}
                  <strong>{formatEUR(preview.charge)}</strong>
                  {preview.taxIncluded ? " (VAT included)" : ""}.
                </li>
              </>
            ) : isUpgrade ? (
              <>
                <li>Access to {toPlanLabel} unlocks immediately.</li>
                <li>
                  <strong>{formatEUR(preview.charge)}</strong> charged to your
                  card now{preview.taxIncluded ? " (VAT included)" : ""}.
                </li>
                {preview.letterCapAfter > preview.letterCapNow ? (
                  <li>
                    You gain{" "}
                    <strong>
                      {preview.letterCapAfter - preview.letterCapNow} extra
                      letter{preview.letterCapAfter - preview.letterCapNow === 1 ? "" : "s"}
                    </strong>{" "}
                    for the rest of this cycle (cap is now{" "}
                    <strong>{preview.letterCapAfter}</strong>).
                  </li>
                ) : (
                  <li>
                    Letter cap for the rest of this cycle stays around{" "}
                    <strong>{preview.letterCapAfter}</strong> — the big change
                    arrives at your next renewal (below).
                  </li>
                )}
              </>
            ) : (
              <>
                <li>
                  <strong>No charge today.</strong>
                </li>
                <li>
                  You keep {fromPlanLabel} and all your letters until{" "}
                  <strong>{formatLongDate(preview.cycleAnchorDate)}</strong>.
                </li>
              </>
            )}
          </ul>
        </section>

        {/* HOW WE CALCULATED THIS — upgrades only, 5 clean rows */}
        {isUpgrade && preview.cycleStart && preview.cycleEnd ? (
          <section className="plan-switch-modal__section plan-switch-modal__section--calc">
            <h3 className="plan-switch-modal__section-title">
              How we calculated this
            </h3>
            <ul className="plan-switch-modal__calc">
              <li>
                <span>Your billing cycle</span>
                <strong>
                  {formatShortDate(preview.cycleStart)} →{" "}
                  {formatShortDate(preview.cycleEnd)} ({preview.daysTotal} days)
                </strong>
              </li>
              <li>
                <span>Days remaining</span>
                <strong>
                  {preview.daysRemaining} (
                  {Math.round((preview.prorationFraction ?? 0) * 100)}% of cycle
                  left)
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
                <span>You pay the difference</span>
                <strong>
                  {formatEUR(preview.charge)}
                  {preview.taxIncluded ? " (VAT included)" : ""}
                </strong>
              </li>
            </ul>
            <p className="plan-switch-modal__calc-note">
              <strong>What proration means in plain language:</strong> think of
              it like changing hotel rooms mid-stay. We refund the unused nights
              on your old plan at its rate, then charge for the same nights on
              your new plan at its rate. You pay only the difference — never
              the full new plan price on top of what you already paid. Your
              letter allowance moves in lockstep, so you're never overpaying or
              undergetting.
            </p>
          </section>
        ) : null}

        {/* NEXT RENEWAL / GOING FORWARD */}
        <section className="plan-switch-modal__section">
          <h3 className="plan-switch-modal__section-title">
            {isDowngrade ? "On your next renewal" : "Going forward"}
            {preview.cycleAnchorDate ? (
              <span className="plan-switch-modal__section-sub">
                {" "}
                ({formatLongDate(preview.cycleAnchorDate)})
              </span>
            ) : null}
          </h3>
          <ul className="plan-switch-modal__bullets">
            {isDowngrade ? (
              <>
                <li>
                  Plan switches to <strong>{toPlanLabel}</strong>.
                </li>
                <li>
                  Letter cap becomes{" "}
                  <strong>
                    {preview.nextCycleLetterCap ?? preview.letterCapAfter}
                  </strong>{" "}
                  per {preview.toPlanPeriodNoun ?? "cycle"}.
                </li>
                <li>
                  <strong>{formatEUR(preview.newFullPrice)}</strong> charged for
                  the first {toPlanLabel} cycle.
                </li>
                <li>
                  You can cancel this scheduled change anytime before then from
                  your Billing page.
                </li>
              </>
            ) : (
              <>
                <li>
                  Next renewal charge:{" "}
                  <strong>{formatEUR(preview.newFullPrice)}</strong>
                  {preview.taxIncluded ? " (VAT included)" : ""}, every{" "}
                  {preview.toPlanPeriodNoun ?? "cycle"}.
                </li>
                <li>
                  Full letter cap:{" "}
                  <strong>
                    {preview.nextCycleLetterCap ?? preview.letterCapAfter}{" "}
                    letters per {preview.toPlanPeriodNoun ?? "cycle"}
                  </strong>
                  .
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
                ? `I agree to the ${formatEUR(preview.charge)} charge today, calculated as shown above.`
                : isDowngrade
                  ? `I understand my plan changes to ${toPlanLabel} on ${formatLongDate(preview.cycleAnchorDate)} and I keep my current plan and letters until then.`
                  : `I agree to the terms shown above.`}
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
                gives me access immediately.
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
