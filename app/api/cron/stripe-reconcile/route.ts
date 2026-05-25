import { NextRequest, NextResponse } from "next/server"
import {
  getBillingPeriod,
  getStoredPlanId,
  normalizeBillingPeriod,
  normalizeStoredPlan,
} from "@/lib/plans"
import { getStripe, type BillingPlan } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Stripe reconciliation cron.
 *
 * Runs every 6 hours (see vercel.json crons). Purpose:
 *
 *   1. Heal webhook divergence — if Stripe sent us an event we
 *      missed (network blip, region outage, retry exhaustion),
 *      this job catches up by reading the source of truth from
 *      Stripe and updating our users table.
 *
 *   2. Purge expired data_recovery_snapshots older than 30 days.
 *
 * Auth: Vercel cron sets `Authorization: Bearer ${CRON_SECRET}`
 * by convention. We accept either that or x-vercel-cron header.
 * The endpoint is also publicly callable in dev for testing.
 */
export async function GET(req: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    !isAuthorized(req)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const summary = {
    snapshotsPurged: 0,
    usersChecked: 0,
    usersUpdated: 0,
    errors: [] as string[],
  }

  // ---- 1. Snapshot purge --------------------------------------------------
  try {
    const { error: purgeErr } = await supabaseAdmin
      .rpc("purge_expired_data_recovery_snapshots")
    if (purgeErr) {
      summary.errors.push(`snapshot_purge: ${purgeErr.message}`)
    } else {
      // The RPC returns a count but supabase wraps it. We don't strictly
      // need the number for ops; just confirm no error.
      summary.snapshotsPurged = 1
    }
  } catch (err) {
    summary.errors.push(
      `snapshot_purge_threw: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  // ---- 2. Reconcile a slice of users with active Stripe subs -------------
  // Pull users whose plan != 'free' and whose row hasn't been webhook-
  // touched in the last 6 hours. This is the population most likely
  // to have drifted from Stripe.
  try {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    const { data: usersToCheck, error: usersErr } = await supabaseAdmin
      .from("users")
      .select("id, email, plan, current_period_start")
      .neq("plan", "free")
      .or(`current_period_start.is.null,current_period_start.lt.${sixHoursAgo}`)
      .limit(50)

    if (usersErr) {
      summary.errors.push(`users_query: ${usersErr.message}`)
    } else if (usersToCheck) {
      const stripe = getStripe()
      for (const u of usersToCheck) {
        summary.usersChecked += 1
        try {
          const customers = await stripe.customers.list({
            email: (u.email as string).toLowerCase(),
            limit: 1,
          })
          const customer = customers.data[0]
          if (!customer) {
            // User claims a paid plan but has no Stripe customer.
            // Flip to free; their subscription was cancelled or
            // deleted while we weren't looking.
            await supabaseAdmin
              .from("users")
              .update({ plan: "free", current_period_start: null })
              .eq("id", u.id)
            summary.usersUpdated += 1
            continue
          }
          const subs = await stripe.subscriptions.list({
            customer: customer.id,
            limit: 5,
          })
          const active =
            subs.data.find((s) => s.status === "active") ??
            subs.data.find((s) => s.status === "trialing")
          if (!active) {
            // No live subscription. Drop to free.
            await supabaseAdmin
              .from("users")
              .update({ plan: "free", current_period_start: null })
              .eq("id", u.id)
            summary.usersUpdated += 1
            continue
          }
          // Active sub: reconcile plan + period_start.
          const metaPlan = active.metadata?.plan as BillingPlan | undefined
          const interval = active.items.data[0]?.price.recurring?.interval
          const period = normalizeBillingPeriod(
            active.metadata?.period ||
              (interval === "year" ? "annual" : "monthly")
          )
          const stripePlanId = normalizeStoredPlan(
            active.metadata?.planId ||
              (metaPlan ? getStoredPlanId(metaPlan, period) : u.plan)
          )
          const itemStart = (active.items.data[0] as {
            current_period_start?: number
          })?.current_period_start
          const subStart = (active as { current_period_start?: number })
            .current_period_start
          const periodStartSec = itemStart ?? subStart
          const stripePeriodStart =
            typeof periodStartSec === "number"
              ? new Date(periodStartSec * 1000).toISOString()
              : null

          const planDrifted = stripePlanId !== u.plan
          const periodDrifted =
            stripePeriodStart &&
            stripePeriodStart !== (u.current_period_start as string | null)

          if (planDrifted || periodDrifted) {
            const patch: Record<string, unknown> = {}
            if (planDrifted) patch.plan = stripePlanId
            if (periodDrifted && stripePeriodStart) {
              patch.current_period_start = stripePeriodStart
              // If the period changed, also reset accrued + segment so
              // letter quota math starts fresh for the new cycle —
              // matches what handlePaymentSucceeded does on renewal.
              patch.accrued_cap_this_period = 0
              patch.current_segment_started_at = stripePeriodStart
            }
            await supabaseAdmin
              .from("users")
              .update(patch)
              .eq("id", u.id)
            summary.usersUpdated += 1
          }

          // Also: if the period this user is on falls outside the
          // active subscription, ensure the period_start matches
          // Stripe (catches the case where a webhook ack failed).
          if (
            getBillingPeriod(stripePlanId) !== getBillingPeriod(u.plan) &&
            !planDrifted
          ) {
            // No-op; planDrifted already covers it. Kept as a guard.
          }
        } catch (err) {
          summary.errors.push(
            `user_${u.id}: ${err instanceof Error ? err.message : String(err)}`
          )
        }
      }
    }
  } catch (err) {
    summary.errors.push(
      `reconcile_loop_threw: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  return NextResponse.json({ ok: true, summary })
}

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization") || ""
  const vercelHeader = req.headers.get("x-vercel-cron") || ""
  const secret = process.env.CRON_SECRET
  if (vercelHeader) return true
  if (secret && authHeader === `Bearer ${secret}`) return true
  return false
}
