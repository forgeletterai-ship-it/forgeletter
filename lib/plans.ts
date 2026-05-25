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

export function getPlanUsageDetails(
  plan: unknown,
  usedCount: number,
  /** Optional override — when present, used instead of the static plan
   *  letter limit. The dashboard meter passes the fair cap here. */
  overrideLimit?: number
) {
  const storedPlan = normalizeStoredPlan(plan)
  const basePlan = getBasePlan(storedPlan)
  const period = getBillingPeriod(storedPlan)
  const config = planCatalog[basePlan]
  const planLimit = getPlanLetterLimit(storedPlan)
  const limit =
    typeof overrideLimit === "number" && overrideLimit >= 0
      ? Math.floor(overrideLimit)
      : planLimit
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
    /** The static, pre-proration plan limit. Useful for "your plan
     *  is rated at X letters / period" messaging. */
    planLimit,
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

// ---------------------------------------------------------------------------
// Fair-letter-cap helpers
// ---------------------------------------------------------------------------

const DAYS_PER_MONTH = 30
const DAYS_PER_YEAR = 365

/**
 * Letters per day a given stored plan grants. Used to prorate the
 * letter allowance the same way Stripe prorates the money: a customer
 * who was on Pro for 12 days then Ultra for 18 days gets
 * 12*ProDaily + 18*UltraDaily letters this period.
 */
export function getDailyLetterRate(plan: unknown): number {
  const stored = normalizeStoredPlan(plan)
  const basePlan = getBasePlan(stored)
  const period = getBillingPeriod(stored)
  const monthly = planCatalog[basePlan].monthlyLetters
  if (period === "annual") {
    return (monthly * 12) / DAYS_PER_YEAR
  }
  return monthly / DAYS_PER_MONTH
}

/**
 * Rank used by direction detection. Higher = more revenue per period.
 * Tier dominates interval, matching Mode A convention: if you change
 * tier, that determines direction regardless of monthly vs annual.
 */
export function getPlanRank(plan: unknown): number {
  const stored = normalizeStoredPlan(plan)
  const basePlan = getBasePlan(stored)
  const period = getBillingPeriod(stored)
  const tierWeight =
    basePlan === "ultra" ? 300 : basePlan === "pro" ? 200 : basePlan === "starter" ? 100 : 0
  const intervalWeight = period === "annual" ? 10 : 0
  return tierWeight + intervalWeight
}

export type SwitchDirection = "upgrade" | "downgrade" | "same"

/**
 * Mode A direction detection.
 *
 *  - Tier change always wins (lower → higher tier = upgrade; higher → lower = downgrade)
 *  - Same tier: monthly → annual = upgrade; annual → monthly = downgrade
 *  - Same tier + same interval = same (blocked)
 */
export function resolveSwitchDirection(
  fromPlan: unknown,
  toPlan: unknown
): SwitchDirection {
  const fromRank = getPlanRank(fromPlan)
  const toRank = getPlanRank(toPlan)
  if (toRank > fromRank) return "upgrade"
  if (toRank < fromRank) return "downgrade"
  return "same"
}

/**
 * Compute the user's fair letter cap for the current period.
 *
 *   fair_cap = accruedCapThisPeriod
 *            + (period_end − segment_start) × current_daily_rate
 *
 * Critical: the segment portion uses (period_end − segment_start),
 * NOT (now − segment_start). The customer paid upfront for the
 * period, so their full entitlement must be available from the
 * moment the segment begins — it doesn't grow over time.
 *
 * Example — fresh Ultra Monthly signup on day 0 of a 30-day cycle:
 *   accrued = 0
 *   segment_start = period_start
 *   period_end − segment_start = 30 days
 *   daily_rate = 35 / 30 = 1.17
 *   fair_cap = 0 + 30 × 1.17 = 35 ✓ (full Ultra cap on day 1)
 *
 * Example — Pro → Ultra at day 15:
 *   At switch time the API does:
 *     accrued += 15 × (20/30) = 10 letters from the Pro segment
 *     segment_start = now (day 15)
 *   Then fair_cap computed against:
 *     accrued = 10
 *     period_end − segment_start = 15 days
 *     daily_rate = 35/30 = 1.17
 *     fair_cap = 10 + 15 × 1.17 = 27.5 → floor 27
 *
 * Returns Math.floor of the result — letters are discrete units;
 * fractional entitlement drops to the customer's slight disadvantage
 * (< 1 letter, equivalent to a few cents of value).
 *
 * Pass currentPeriodEnd when you have it (from Stripe). Otherwise
 * we derive it from period start + the plan's period length, which
 * is accurate enough for the cap display (real billing math always
 * comes from Stripe directly).
 */
export function computeFairLetterCap(args: {
  plan: unknown
  accruedCapThisPeriod: number
  currentSegmentStartedAt: Date | string | null
  currentPeriodStart: Date | string | null
  currentPeriodEnd?: Date | string | null
  now?: Date
}): number {
  const periodStart = args.currentPeriodStart
    ? new Date(args.currentPeriodStart)
    : null
  let periodEnd: Date | null = null
  if (args.currentPeriodEnd) {
    periodEnd = new Date(args.currentPeriodEnd)
  } else if (periodStart) {
    const period = getBillingPeriod(args.plan)
    const days = period === "annual" ? DAYS_PER_YEAR : DAYS_PER_MONTH
    periodEnd = new Date(periodStart.getTime() + days * 86400000)
  }

  const rawSegmentStart = args.currentSegmentStartedAt
    ? new Date(args.currentSegmentStartedAt)
    : periodStart
  // Clamp segment start to the period boundary (defensive).
  const segmentStart =
    periodStart && rawSegmentStart && rawSegmentStart < periodStart
      ? periodStart
      : rawSegmentStart

  if (!segmentStart || !periodEnd) {
    // No anchoring data — fall back to the static plan limit so the
    // user is never locked out due to missing state.
    return getPlanLetterLimit(args.plan)
  }

  const segmentDurationMs = Math.max(0, periodEnd.getTime() - segmentStart.getTime())
  const segmentDays = segmentDurationMs / 86400000
  const dailyRate = getDailyLetterRate(args.plan)
  const segmentCap = segmentDays * dailyRate
  const accrued = Math.max(0, args.accruedCapThisPeriod || 0)
  const total = accrued + segmentCap
  return Math.max(0, Math.floor(total))
}
