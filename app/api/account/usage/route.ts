import { NextResponse } from "next/server"
import {
  dataErrorMessage,
  getCurrentAppUser,
  getCurrentPeriodLetterCount,
} from "@/lib/app-data"
import { getPlanUsageDetails } from "@/lib/plans"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Returns the authenticated user's current-period letter consumption.
 * The dashboard polls this on tab focus + after every generation to
 * keep the meter accurate without a full page reload.
 */
export async function GET() {
  const { user, error } = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json(
      { error: error || "Authentication required" },
      { status: 401 }
    )
  }

  const { count, setupError } = await getCurrentPeriodLetterCount(
    user.id,
    user.plan,
    user.currentPeriodStart
  )

  if (setupError) {
    return NextResponse.json(
      { error: dataErrorMessage(setupError, "generated_letters") },
      { status: 500 }
    )
  }

  // Meter shows the nominal plan cap — matches what we marketed
  // on the pricing cards. Fair-cap proration still runs in
  // /api/generate for enforcement.
  return NextResponse.json({
    plan: user.plan,
    usage: getPlanUsageDetails(user.plan, count),
    scheduledPlanChange: user.scheduledPlanChange,
  })
}
