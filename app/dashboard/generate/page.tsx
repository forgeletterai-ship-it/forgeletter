import { redirect } from "next/navigation"
import { getCurrentAppUser } from "@/lib/app-data"
import { getBasePlan, getPlanUsageDetails } from "@/lib/plans"
import { supabaseAdmin } from "@/lib/supabase"
import {
  getBillingPeriod,
  getCurrentPlanPeriodStart,
} from "@/lib/plans"
import { GenerateClient } from "./GenerateClient"

export const dynamic = "force-dynamic"

export default async function GeneratePage() {
  const { user } = await getCurrentAppUser()
  if (!user) {
    redirect("/auth/login")
  }

  // Compute usage so the form shows "5 of 8 letters left this month"
  const period = getBillingPeriod(user.plan)
  const periodStart = getCurrentPlanPeriodStart(period).toISOString()
  const { count } = await supabaseAdmin
    .from("generated_letters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", periodStart)
    .in("generation_status", ["queued", "running", "passed"])

  const used = count || 0
  const usage = getPlanUsageDetails(user.plan, used)
  const basePlan = getBasePlan(user.plan)

  return (
    <GenerateClient
      planLabel={usage.label}
      basePlan={basePlan}
      lettersUsed={used}
      lettersLimit={usage.limit}
      periodNoun={usage.periodNoun}
      defaultName={user.name ?? ""}
    />
  )
}
