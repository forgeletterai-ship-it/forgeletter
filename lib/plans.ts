export type BillingPeriod = "monthly" | "annual"
export type PaidPlanId = "starter" | "pro" | "ultra"
export type StoredPlanId = "free" | PaidPlanId | `${PaidPlanId}_annual`
export type BasePlanId = "free" | PaidPlanId

type PlanConfig = {
  label: string
  monthlyLetters: number
  copy: string
}

export const planCatalog: Record<BasePlanId, PlanConfig> = {
  free: {
    label: "Regular",
    monthlyLetters: 3,
    copy: "Your workspace is active. Create focused cover letter briefs and upgrade when you need more.",
  },
  starter: {
    label: "Starter",
    monthlyLetters: 8,
    copy: "Your Starter workspace is active. Build focused cover letters with a clean monthly workflow.",
  },
  pro: {
    label: "PRO",
    monthlyLetters: 20,
    copy: "Your Pro workspace is active. Build stronger letters with a smoother weekly workflow.",
  },
  ultra: {
    label: "ULTRA",
    monthlyLetters: 35,
    copy: "Your Ultra workspace is active. Generate premium cover letters with the full workflow.",
  },
}

export function normalizeBillingPeriod(period: unknown): BillingPeriod {
  return period === "annual" ? "annual" : "monthly"
}

export function normalizeStoredPlan(plan: unknown): StoredPlanId {
  if (
    plan === "starter" ||
    plan === "starter_annual" ||
    plan === "pro" ||
    plan === "pro_annual" ||
    plan === "ultra" ||
    plan === "ultra_annual"
  ) {
    return plan
  }

  return "free"
}

export function getBasePlan(plan: unknown): BasePlanId {
  const normalizedPlan = normalizeStoredPlan(plan)

  if (normalizedPlan.endsWith("_annual")) {
    return normalizedPlan.replace("_annual", "") as PaidPlanId
  }

  if (
    normalizedPlan === "starter" ||
    normalizedPlan === "pro" ||
    normalizedPlan === "ultra"
  ) {
    return normalizedPlan
  }

  return "free"
}

export function getBillingPeriod(plan: unknown): BillingPeriod {
  return String(normalizeStoredPlan(plan)).endsWith("_annual") ? "annual" : "monthly"
}

export function getStoredPlanId(plan: PaidPlanId, period: BillingPeriod): StoredPlanId {
  return period === "annual" ? `${plan}_annual` : plan
}

export function getPlanLetterLimit(plan: unknown) {
  const basePlan = getBasePlan(plan)
  const period = getBillingPeriod(plan)
  const monthlyLetters = planCatalog[basePlan].monthlyLetters

  return period === "annual" ? monthlyLetters * 12 : monthlyLetters
}

export function getCurrentPlanPeriodStart(period: BillingPeriod, now = new Date()) {
  return period === "annual"
    ? new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export function annualAmountCents(monthlyCents: number) {
  return Math.round(monthlyCents * 12 * 0.9)
}

export function getPlanUsageDetails(plan: unknown, usedCount: number) {
  const storedPlan = normalizeStoredPlan(plan)
  const basePlan = getBasePlan(storedPlan)
  const period = getBillingPeriod(storedPlan)
  const config = planCatalog[basePlan]
  const limit = getPlanLetterLimit(storedPlan)
  const used = Math.max(0, Math.min(usedCount, limit))
  const remaining = Math.max(0, limit - usedCount)
  const usedPercent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const periodNoun = period === "annual" ? "year" : "month"

  return {
    basePlan,
    period,
    label: config.label,
    copy: config.copy,
    limit,
    used,
    remaining,
    usedPercent,
    periodNoun,
    allowanceLabel: `${limit} letters / ${periodNoun}`,
  }
}

export function formatPlanLabel(plan: unknown) {
  const details = getPlanUsageDetails(plan, 0)
  return details.period === "annual" && details.basePlan !== "free"
    ? `${details.label} annual`
    : details.label
}
