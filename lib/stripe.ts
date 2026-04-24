import Stripe from "stripe"

let stripeClient: Stripe | null = null

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY")
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })
  }

  return stripeClient
}

export type BillingPlan = "pro" | "premium"
export type OneTimeProduct = "single-letter-pack" | "cv-review" | "interview-prep"

export const billingPlans: Record<
  BillingPlan,
  {
    name: string
    priceIdEnv: string
    unitAmount: number
    lookupKey: string
  }
> = {
  pro: {
    name: "LetterForge Pro",
    priceIdEnv: "STRIPE_PRO_PRICE_ID",
    unitAmount: 900,
    lookupKey: "letterforge_pro_monthly",
  },
  premium: {
    name: "LetterForge Premium",
    priceIdEnv: "STRIPE_PREMIUM_PRICE_ID",
    unitAmount: 1900,
    lookupKey: "letterforge_premium_monthly",
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

export function getCheckoutLineItem(plan: BillingPlan): Stripe.Checkout.SessionCreateParams.LineItem {
  const config = billingPlans[plan]
  const price = process.env[config.priceIdEnv]

  if (price) {
    return { price, quantity: 1 }
  }

  return {
    quantity: 1,
    price_data: {
      currency: "eur",
      unit_amount: config.unitAmount,
      recurring: {
        interval: "month",
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
