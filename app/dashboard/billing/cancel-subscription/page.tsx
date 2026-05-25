import { redirect } from "next/navigation"
import { CancelSubscriptionClient } from "./CancelSubscriptionClient"
import { getCurrentAppUser } from "@/lib/app-data"
import { formatPlanLabel, getBasePlan } from "@/lib/plans"

export const dynamic = "force-dynamic"

export default async function CancelSubscriptionPage() {
  const { user } = await getCurrentAppUser()
  if (!user) redirect("/auth/login")
  if (getBasePlan(user.plan) === "free") {
    redirect("/dashboard/billing")
  }
  return (
    <CancelSubscriptionClient
      currentPlanLabel={formatPlanLabel(user.plan)}
    />
  )
}
