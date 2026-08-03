"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  annualAmountCents,
  getBasePlan,
  getBillingPeriod,
  type BillingPeriod,
  type StoredPlanId,
} from "@/lib/plans"

const plans = [
  {
    name: "Starter",
    key: "starter",
    body: "For building your first applications with a focused monthly plan.",
    letters: 8,
    rewrites: 0,
    monthlyCents: 999,
    features: [
      "Both PDF templates",
      "Photo upload",
      "PDF download & copy",
    ],
    agents: [
      "Profile Analyst",
      "Job Analyst",
      "Match Analyst",
      "Example Retrieval",
      "Writer",
      "Final Editor",
      "Hallucination Check",
      "Quality Gate",
    ],
    rewriteCopy: "Tone rewrites use another letter from your allowance.",
    cta: "Choose Starter",
    href: "/auth/signup",
  },
  {
    name: "Pro",
    key: "pro",
    body: "For active job seekers who want a smoother weekly workflow.",
    letters: 20,
    rewrites: 1,
    monthlyCents: 1999,
    features: [
      "ATS score",
      "1 tone rewrite included",
      "Everything in Starter",
    ],
    agents: [
      "Profile Analyst",
      "Job Analyst",
      "Match Analyst",
      "Example Retrieval",
      "Writer",
      "ATS Agent",
      "Final Editor",
      "Hallucination Check",
      "Quality Gate",
    ],
    rewriteCopy: "1 different-tone rewrite is included before another letter is used.",
    cta: "Choose Pro",
    href: "/auth/signup",
    highlight: true,
  },
  {
    name: "Ultra",
    key: "ultra",
    body: "For high-volume applications and international searches.",
    letters: 35,
    rewrites: 3,
    monthlyCents: 3499,
    features: [
      "All 12 agents",
      "3 tone rewrites included",
      "Everything in Pro",
    ],
    agents: [
      "Input Cleaner",
      "Profile Analyst",
      "Job Analyst",
      "Match Analyst",
      "Example Retrieval",
      "Writer",
      "ATS Agent",
      "HM Critic",
      "Final Editor",
      "Hallucination Check",
      "Quality Gate",
      "Rewrite Agent",
    ],
    rewriteCopy: "3 different-tone rewrites are included before another letter is used.",
    cta: "Choose Ultra",
    href: "/auth/signup",
  },
] as const

export type PlanKey = (typeof plans)[number]["key"]

type PricingCardsProps = {
  currentPlan?: StoredPlanId
  loadingPlan?: "" | PlanKey
  onSelectPlan?: (plan: PlanKey, period: BillingPeriod) => void
}

const securityItems = [
  {
    icon: "shield",
    title: "Secure checkout",
    body: "Secure card payment flow",
  },
  {
    icon: "tag",
    title: "No hidden charges",
    body: "Clear plan pricing",
  },
  {
    icon: "sync",
    title: "Cancel anytime",
    body: "Subscription controls in billing settings",
  },
  {
    icon: "lock",
    title: "Private workspace",
    body: "Profile and application data are stored securely",
  },
] as const

function EnvelopeIcon() {
  return (
    <svg viewBox="0 0 28 22" aria-hidden="true">
      <rect x="2.5" y="3" width="23" height="16" rx="1.8" />
      <path d="m4 5 10 8 10-8" />
      <path d="m4 17 6.8-6" />
      <path d="m24 17-6.8-6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <span className="plux-check" aria-hidden="true">
      <svg viewBox="0 0 10 10" fill="none">
        <path d="M1.5 5.2 4 7.6 8.6 2.4" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function PricingSecurityIcon({ type }: { type: (typeof securityItems)[number]["icon"] }) {
  if (type === "shield") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 4.5 25 8v6.6c0 5.9-3.6 10.2-9 12.9-5.4-2.7-9-7-9-12.9V8l9-3.5Z" />
        <path d="m12.2 16.3 2.5 2.5 5.5-6" />
      </svg>
    )
  }

  if (type === "tag") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M5.5 17.2 17.2 5.5h7.3v7.3L12.8 24.5 5.5 17.2Z" />
        <circle cx="21.4" cy="10.6" r="1.8" />
      </svg>
    )
  }

  if (type === "sync") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M25.5 12.6A9.8 9.8 0 0 0 8.7 8.8L6 11.6" />
        <path d="M6 6.1v5.5h5.5" />
        <path d="M6.5 19.4a9.8 9.8 0 0 0 16.8 3.8l2.7-2.8" />
        <path d="M26 25.9v-5.5h-5.5" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="8" y="14" width="16" height="12" rx="2" />
      <path d="M11.5 14v-3.1a4.5 4.5 0 0 1 9 0V14" />
      <path d="M16 18.5v3.3" />
    </svg>
  )
}

function formatPrice(cents: number) {
  return (cents / 100).toFixed(2)
}

export function PricingCards({
  currentPlan,
  loadingPlan = "",
  onSelectPlan,
}: PricingCardsProps = {}) {
  const [periods, setPeriods] = useState<Record<PlanKey, BillingPeriod>>({
    starter: "monthly",
    pro: "monthly",
    ultra: "monthly",
  })
  const [openKey, setOpenKey] = useState<PlanKey | "">("")
  const dialogRef = useRef<HTMLDivElement | null>(null)

  // Escape closes the pop-up; focus moves into the dialog when it
  // opens so keyboard and screen-reader users land inside it.
  useEffect(() => {
    if (!openKey) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenKey("")
    }
    window.addEventListener("keydown", onKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener("keydown", onKey)
  }, [openKey])

  function setPlanPeriod(plan: PlanKey, period: BillingPeriod) {
    setPeriods((current) => ({ ...current, [plan]: period }))
  }

  function planView(plan: (typeof plans)[number]) {
    const period = periods[plan.key]
    const periodNoun = period === "annual" ? "year" : "month"
    const lettersForPeriod = period === "annual" ? plan.letters * 12 : plan.letters
    // Annual price must come from the same helper Stripe checkout
    // uses (lib/plans.ts annualAmountCents, 25% off) so the number
    // a customer sees is the number their card is charged.
    const price =
      period === "monthly" ? plan.monthlyCents : annualAmountCents(plan.monthlyCents)
    const cadence = period === "monthly" ? "/ month" : "/ year"
    const isCurrentPlan =
      getBasePlan(currentPlan) === plan.key && getBillingPeriod(currentPlan) === period
    return { period, periodNoun, lettersForPeriod, price, cadence, isCurrentPlan }
  }

  const open = plans.find((plan) => plan.key === openKey)

  return (
    <>
      <div className="plux-teaser-grid">
        {plans.map((plan) => {
          const isHighlighted = "highlight" in plan && plan.highlight
          const { lettersForPeriod, periodNoun, price, cadence } = planView(plan)
          const isCurrentBase = getBasePlan(currentPlan) === plan.key

          return (
            <div
              className={`plux-teaser${isHighlighted ? " plux-teaser--dark plux-teaser--featured" : ""}`}
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-label={`${plan.name} plan, EUR ${formatPrice(price)} ${cadence}, ${lettersForPeriod} letters per ${periodNoun}. Open details.`}
              key={plan.name}
              onClick={() => setOpenKey(plan.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  setOpenKey(plan.key)
                }
              }}
            >
              <div className="plux-head">
                <div>
                  <div className="plux-name">{plan.name}</div>
                  <div className="plux-rule" aria-hidden="true" />
                </div>
                {isHighlighted ? (
                  <div className="plux-popular">Most popular</div>
                ) : isCurrentBase ? (
                  <div className="plux-popular plux-popular--current">Current plan</div>
                ) : null}
              </div>

              <div className="plux-teaser__bottom">
                <div className="plux-price">
                  <span className="plux-price__cur">EUR</span>
                  <strong>{formatPrice(price)}</strong>
                  <em>{cadence} · excl. VAT</em>
                </div>
                <div className="plux-teaser__meta">
                  {lettersForPeriod} letters / {periodNoun} | tap to open
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {open ? (() => {
        const isHighlighted = "highlight" in open && open.highlight
        const { period, periodNoun, lettersForPeriod, price, cadence, isCurrentPlan } =
          planView(open)
        const actionClass = `plux-cta${isCurrentPlan ? " plux-cta--current" : ""}`
        const actionLabel = isCurrentPlan
          ? "Current plan"
          : loadingPlan === open.key
            ? "Opening Stripe..."
            : `${open.cta} — EUR ${formatPrice(price)} ${cadence}`

        return (
          <div
            className="plux-overlay"
            onClick={() => setOpenKey("")}
          >
            <div
              className={`plux-card plux-modal${isHighlighted ? " plux-card--dark plux-card--featured" : ""}`}
              role="dialog"
              aria-modal="true"
              aria-label={`${open.name} plan details`}
              tabIndex={-1}
              ref={dialogRef}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="plux-head">
                <div>
                  <div className="plux-name">
                    {open.name}
                    {isHighlighted ? <span className="plux-name__note"> · Most popular</span> : null}
                  </div>
                  <div className="plux-rule" aria-hidden="true" />
                </div>
                <button
                  className="plux-close"
                  type="button"
                  aria-label="Close plan details"
                  onClick={() => setOpenKey("")}
                >
                  ✕
                </button>
              </div>

              <div className="plux-price">
                <span className="plux-price__cur">EUR</span>
                <strong>{formatPrice(price)}</strong>
                <em>
                  {cadence} · excl. VAT
                  {period === "annual" ? " · billed annually, 25% off" : ""}
                </em>
              </div>

              <p className="plux-tagline">{open.body}</p>

              <div
                className="plux-pill"
                aria-label={`${lettersForPeriod} letters per ${periodNoun}`}
              >
                <EnvelopeIcon />
                <span>
                  {lettersForPeriod} letters / {periodNoun}
                </span>
              </div>

              <div
                className="plux-toggle"
                role="group"
                aria-label={`${open.name} billing period`}
              >
                <button
                  className={period === "monthly" ? "is-active" : ""}
                  type="button"
                  aria-pressed={period === "monthly"}
                  onClick={() => setPlanPeriod(open.key, "monthly")}
                >
                  Monthly
                </button>
                <button
                  className={period === "annual" ? "is-active" : ""}
                  type="button"
                  aria-pressed={period === "annual"}
                  onClick={() => setPlanPeriod(open.key, "annual")}
                >
                  Annual <span>-25%</span>
                </button>
              </div>

              <div className="plux-features">
                {open.features.map((feature) => (
                  <div className="plux-feature" key={feature}>
                    <CheckIcon /> {feature}
                  </div>
                ))}
              </div>

              <div className="plux-section-label">{open.agents.length} AI agents</div>

              <ul className="plux-agents" aria-label={`${open.name} included AI agents`}>
                {open.agents.map((agent) => (
                  <li key={agent}>{agent}</li>
                ))}
              </ul>

              <div className="plux-rewrite">
                <strong>
                  {open.rewrites === 0
                    ? "No included tone rewrites"
                    : `${open.rewrites} included tone ${open.rewrites === 1 ? "rewrite" : "rewrites"}`}
                </strong>
                <span>{open.rewriteCopy}</span>
              </div>

              {onSelectPlan ? (
                <button
                  className={actionClass}
                  type="button"
                  disabled={Boolean(loadingPlan) || isCurrentPlan}
                  onClick={() => onSelectPlan(open.key, period)}
                >
                  {actionLabel}
                </button>
              ) : (
                <Link className={actionClass} href={open.href}>
                  {actionLabel}
                </Link>
              )}
            </div>
          </div>
        )
      })() : null}

      <div className="pricing-security-bar" aria-label="Purchase security">
        {securityItems.map((item) => (
          <div className="pricing-security-item" key={item.title}>
            <div className="pricing-security-icon">
              <PricingSecurityIcon type={item.icon} />
            </div>
            <div>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
