import Stripe from "stripe"
import {
  annualAmountCents,
  type BillingPeriod,
  type PaidPlanId,
} from "@/lib/plans"

let stripeClient: Stripe | null = null

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY")
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Pinned to the latest stable Stripe API version at time of
      // writing. Cast: the SDK's typed LatestApiVersion lags Stripe's
      // released versions; the API accepts any version Stripe has
      // shipped.
      apiVersion: "2024-11-20.acacia" as Stripe.LatestApiVersion,
      typescript: true,
      maxNetworkRetries: 2,
      timeout: 20_000,
    })
  }

  return stripeClient
}

export type BillingPlan = PaidPlanId
export type OneTimeProduct = "single-letter-pack" | "cv-review" | "interview-prep"

export const billingPlans: Record<
  BillingPlan,
  {
    name: string
    priceIdEnv: Record<BillingPeriod, string>
    unitAmount: Record<BillingPeriod, number>
    lookupKey: string
  }
> = {
  starter: {
    name: "ForgeLetter Starter",
    priceIdEnv: {
      monthly: "STRIPE_STARTER_PRICE_ID",
      annual: "STRIPE_STARTER_ANNUAL_PRICE_ID",
    },
    unitAmount: {
      monthly: 999,
      annual: annualAmountCents(999),
    },
    lookupKey: "forgeletter_starter_monthly",
  },
  pro: {
    name: "ForgeLetter Pro",
    priceIdEnv: {
      monthly: "STRIPE_PRO_PRICE_ID",
      annual: "STRIPE_PRO_ANNUAL_PRICE_ID",
    },
    unitAmount: {
      monthly: 1999,
      annual: annualAmountCents(1999),
    },
    lookupKey: "forgeletter_pro_monthly",
  },
  ultra: {
    name: "ForgeLetter Ultra",
    priceIdEnv: {
      monthly: "STRIPE_ULTRA_PRICE_ID",
      annual: "STRIPE_ULTRA_ANNUAL_PRICE_ID",
    },
    unitAmount: {
      monthly: 3499,
      annual: annualAmountCents(3499),
    },
    lookupKey: "forgeletter_ultra_monthly",
  },
}

export const oneTimeProducts: Record<
  OneTimeProduct,
  {
    name: string
    description: string
    priceIdEnv: string
    unitAmount: number
  }
> = {
  "single-letter-pack": {
    name: "Single Cover Letter Pack",
    description: "One polished cover letter brief and export-ready draft.",
    priceIdEnv: "STRIPE_SINGLE_LETTER_PACK_PRICE_ID",
    unitAmount: 700,
  },
  "cv-review": {
    name: "CV Review",
    description: "One-time CV review add-on for a stronger application package.",
    priceIdEnv: "STRIPE_CV_REVIEW_PRICE_ID",
    unitAmount: 2900,
  },
  "interview-prep": {
    name: "Interview Prep Session",
    description: "One-time interview preparation add-on.",
    priceIdEnv: "STRIPE_INTERVIEW_PREP_PRICE_ID",
    unitAmount: 3900,
  },
}

export function getCheckoutLineItem(
  plan: BillingPlan,
  period: BillingPeriod = "monthly"
): Stripe.Checkout.SessionCreateParams.LineItem {
  const config = billingPlans[plan]
  const price = process.env[config.priceIdEnv[period]]

  if (price) {
    return { price, quantity: 1 }
  }

  return {
    quantity: 1,
    price_data: {
      currency: "eur",
      unit_amount: config.unitAmount[period],
      recurring: {
        interval: period === "annual" ? "year" : "month",
      },
      product_data: {
        name: config.name,
      },
    },
  }
}

export function getOneTimeLineItem(
  product: OneTimeProduct
): Stripe.Checkout.SessionCreateParams.LineItem {
  const config = oneTimeProducts[product]
  const price = process.env[config.priceIdEnv]

  if (price) {
    return { price, quantity: 1 }
  }

  return {
    quantity: 1,
    price_data: {
      currency: "eur",
      unit_amount: config.unitAmount,
      product_data: {
        name: config.name,
        description: config.description,
      },
    },
  }
}

export function getAppUrl(requestOrigin?: string) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    requestOrigin ||
    "http://localhost:3000"
  ).replace(/\/$/, "")
}
