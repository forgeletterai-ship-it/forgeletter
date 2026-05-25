"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

const REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "not_using_enough", label: "I'm not using it enough" },
  { value: "found_alternative", label: "Found a better alternative" },
  { value: "missing_feature", label: "Missing a feature I need" },
  { value: "got_the_job", label: "I got the job I needed letters for" },
  { value: "other", label: "Other" },
] as const

type Step = "reason" | "save_offer" | "final_confirm" | "submitting" | "done" | "saved"

export function CancelSubscriptionClient({
  currentPlanLabel,
}: {
  currentPlanLabel: string
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("reason")
  const [reason, setReason] = useState<string>("")
  const [detail, setDetail] = useState("")
  const [error, setError] = useState("")
  const [doneMessage, setDoneMessage] = useState("")
  const [savedMessage, setSavedMessage] = useState("")

  async function submitCancel(acceptedSaveOffer: boolean) {
    setError("")
    setStep("submitting")
    try {
      const res = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, detail, acceptedSaveOffer }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        flow?: string
        message?: string
        error?: string
      }
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not process the request.")
        setStep("final_confirm")
        return
      }
      if (data.flow === "save_offer_applied") {
        setSavedMessage(data.message || "Discount applied.")
        setStep("saved")
        return
      }
      setDoneMessage(data.message || "Cancellation scheduled.")
      setStep("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process the request.")
      setStep("final_confirm")
    }
  }

  return (
    <div className="cancel-page">
      <Link href="/dashboard/billing" className="cancel-page__back">
        ← Back to billing
      </Link>

      <header className="cancel-page__header">
        <p className="cancel-page__kicker">Cancel subscription</p>
        <h1>We're sorry to see you thinking about leaving.</h1>
        <p className="cancel-page__sub">
          You're on <strong>{currentPlanLabel}</strong>. Cancellation will
          take effect at the end of your current billing period — you keep
          full access until then. Let us know what's on your mind first.
        </p>
      </header>

      {step === "reason" || step === "submitting" || step === "final_confirm" ? (
        <section className="cancel-page__section">
          <h2>Why are you cancelling?</h2>
          <div className="cancel-page__reasons" role="radiogroup">
            {REASONS.map((r) => (
              <label
                key={r.value}
                className={`cancel-page__reason${
                  reason === r.value ? " is-active" : ""
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={step === "submitting"}
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>

          {reason ? (
            <div className="cancel-page__detail">
              <label htmlFor="cancel-detail">
                Anything else you'd like us to know? (optional)
              </label>
              <textarea
                id="cancel-detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={3}
                maxLength={1000}
                disabled={step === "submitting"}
                placeholder="What would have made you stay?"
              />
            </div>
          ) : null}

          {error ? <div className="alert">{error}</div> : null}

          <div className="cancel-page__actions">
            <Link className="button-secondary" href="/dashboard/billing">
              Never mind, keep my plan
            </Link>
            <button
              type="button"
              className="button"
              disabled={!reason || step === "submitting"}
              onClick={() => {
                // Reasons that suggest cost sensitivity get the save
                // offer; others go straight to confirm.
                if (
                  reason === "too_expensive" ||
                  reason === "not_using_enough"
                ) {
                  setStep("save_offer")
                } else {
                  setStep("final_confirm")
                }
              }}
              style={{ background: "var(--red, #b03a3a)" }}
            >
              Continue cancelling
            </button>
          </div>
        </section>
      ) : null}

      {step === "save_offer" ? (
        <section className="cancel-page__section cancel-page__section--offer">
          <h2>Before you go — would <strong>50% off your next month</strong> help?</h2>
          <p>
            We'll apply a one-time 50% discount to your next renewal so you
            have time to figure out if {currentPlanLabel} is right for you.
            You keep all features and your full letter cap.
          </p>
          <div className="cancel-page__actions">
            <button
              type="button"
              className="button"
              onClick={() => submitCancel(true)}
            >
              Yes, apply the 50% discount
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => setStep("final_confirm")}
            >
              No thanks, continue cancelling
            </button>
          </div>
        </section>
      ) : null}

      {step === "final_confirm" ? (
        <section className="cancel-page__section">
          <h2>Confirm cancellation</h2>
          <p>
            Your <strong>{currentPlanLabel}</strong> plan will end at the
            close of your current billing period. After that, new-letter
            generation is paused — your existing letters and outcome
            history stay accessible, and you can resubscribe anytime to
            resume generation.
          </p>
          {error ? <div className="alert">{error}</div> : null}
          <div className="cancel-page__actions">
            <Link className="button-secondary" href="/dashboard/billing">
              Keep my plan
            </Link>
            <button
              type="button"
              className="button"
              style={{ background: "var(--red, #b03a3a)" }}
              onClick={() => submitCancel(false)}
            >
              Cancel my subscription
            </button>
          </div>
        </section>
      ) : null}

      {step === "submitting" ? (
        <div className="cancel-page__working">Working…</div>
      ) : null}

      {step === "saved" ? (
        <section className="cancel-page__section cancel-page__section--success">
          <h2>You're staying! 🎉</h2>
          <p>{savedMessage}</p>
          <button
            type="button"
            className="button"
            onClick={() => router.push("/dashboard/billing")}
          >
            Back to billing
          </button>
        </section>
      ) : null}

      {step === "done" ? (
        <section className="cancel-page__section cancel-page__section--success">
          <h2>Cancellation scheduled</h2>
          <p>{doneMessage}</p>
          <p className="cancel-page__sub">
            Change your mind? You can resubscribe anytime from your
            billing page — your existing letters and outcomes stay
            attached to your account.
          </p>
          <button
            type="button"
            className="button"
            onClick={() => router.push("/dashboard/billing")}
          >
            Back to billing
          </button>
        </section>
      ) : null}
    </div>
  )
}
