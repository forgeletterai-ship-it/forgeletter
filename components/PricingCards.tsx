"use client"

import { useState } from "react"
import Link from "next/link"
import {
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
      "Both templates",
      "Photo upload",
      "Basic history",
    ],
    agents: [
      "Resume Analyst",
      "Job Analyst",
      "Example Retrieval",
      "Writer Agent",
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
      "LinkedIn import",
      "1 tone rewrite included",
    ],
    agents: [
      "Resume Analyst",
      "Job Analyst",
      "Match Analyst",
      "Example Retrieval",
      "Writer Agent",
      "Tone Adapter",
      "ATS Agent",
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
      "Full pipeline",
    ],
    agents: [
      "Input Cleaner",
      "Resume Analyst",
      "Job Analyst",
      "Match Analyst",
      "Evidence Mapper",
      "Example Retrieval",
      "Writer Agent",
      "Tone Adapter",
      "ATS Agent",
      "HM Critic",
      "Final Editor",
      "Quality Gate",
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

function annualPrice(monthlyCents: number) {
  return Math.round(monthlyCents * 12 * 0.9)
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

  function setPlanPeriod(plan: PlanKey, period: BillingPeriod) {
    setPeriods((current) => ({ ...current, [plan]: period }))
  }

  return (
    <>
      <div className="pricing-arch-grid">
        {plans.map((plan) => {
          const isHighlighted = "highlight" in plan && plan.highlight
          const period = periods[plan.key]
          const periodNoun = period === "annual" ? "year" : "month"
          const lettersForPeriod = period === "annual" ? plan.letters * 12 : plan.letters
          const price = period === "monthly" ? plan.monthlyCents : annualPrice(plan.monthlyCents)
          const cadence = period === "monthly" ? "/ month" : "/ year"
          const currentBasePlan = getBasePlan(currentPlan)
          const currentPeriod = getBillingPeriod(currentPlan)
          const isCurrentPlan = currentBasePlan === plan.key && currentPeriod === period
          const features = plan.features.map((feature) =>
            feature.includes("letters per month")
              ? `${lettersForPeriod} letters per ${periodNoun}`
              : feature
          )
          const actionClass = `pricing-arch-button${
            isHighlighted ? " pricing-arch-button--gold" : ""
          }${isCurrentPlan ? " pricing-arch-button--current" : ""}`
          const actionLabel = isCurrentPlan
            ? "Current plan"
            : loadingPlan === plan.key
              ? "Opening Stripe..."
              : plan.cta

          return (
            <article
              className={`pricing-arch-card pricing-arch-card--${plan.key}${
                isHighlighted ? " pricing-arch-card--featured" : ""
              }`}
              key={plan.name}
            >
              <div className="pricing-arch-card__inner">
                {isHighlighted ? (
                <div className="pricing-popular">
                  <span aria-hidden="true">*</span>
                  Most popular
                </div>
                ) : null}

                <small>{plan.name}</small>

                <div className="pricing-arch-price">
                  <span>EUR</span>
                  <strong>{formatPrice(price)}</strong>
                  <em>{cadence}</em>
                </div>

                <p>{plan.body}</p>

                <div className="pricing-plan-limit" aria-label={`${lettersForPeriod} letters per ${periodNoun}`}>
                  <EnvelopeIcon />
                  <span>{lettersForPeriod} letters / {periodNoun}</span>
                </div>

                <div className="pricing-period-toggle" role="group" aria-label={`${plan.name} billing period`}>
                  <button
                    className={period === "monthly" ? "is-active" : ""}
                    type="button"
                    aria-pressed={period === "monthly"}
                    onClick={() => setPlanPeriod(plan.key, "monthly")}
                  >
                    Monthly
                  </button>
                  <button
                    className={period === "annual" ? "is-active" : ""}
                    type="button"
                    aria-pressed={period === "annual"}
                    onClick={() => setPlanPeriod(plan.key, "annual")}
                  >
                    Annual
                    <span>-10%</span>
                  </button>
                </div>

                <div className="pricing-arch-rule" aria-hidden="true">
                  <span />
                </div>

                <div className="pricing-ai-label">Included features</div>

                <ul className="pricing-arch-list">
                  {features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <div className="pricing-ai-label pricing-ai-label--agents">
                  AI agents included
                </div>

                <ul className="pricing-agent-list" aria-label={`${plan.name} included AI agents`}>
                  {plan.agents.map((agent) => (
                    <li key={agent}>{agent}</li>
                  ))}
                </ul>

                <div className="pricing-rewrite-note">
                  <strong>
                    {plan.rewrites === 0
                      ? "No included rewrites"
                      : `${plan.rewrites} included ${plan.rewrites === 1 ? "rewrite" : "rewrites"}`}
                  </strong>
                  <span>{plan.rewriteCopy}</span>
                </div>

                {onSelectPlan ? (
                  <button
                    className={actionClass}
                    type="button"
                    disabled={Boolean(loadingPlan) || isCurrentPlan}
                    onClick={() => onSelectPlan(plan.key, period)}
                  >
                    {actionLabel}
                  </button>
                ) : (
                  <Link className={actionClass} href={plan.href}>
                    {actionLabel}
                  </Link>
                )}
              </div>
            </article>
          )
        })}
      </div>

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
