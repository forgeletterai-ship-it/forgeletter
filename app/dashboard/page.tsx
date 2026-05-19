import {
  defaultProfile,
  defaultSettings,
  getApplicationBriefs,
  getCurrentPeriodBriefCount,
  getCurrentAppUser,
  getUserProfile,
  getUserSettings,
} from "@/lib/app-data"
import { DashboardClient } from "./DashboardClient"

export default async function DashboardPage() {
  const { user } = await getCurrentAppUser()
  const userId = user?.id || ""
  const plan = user?.plan || "free"
  const [
    { briefs, setupError: briefsError },
    { profile, setupError: profileError },
    { settings },
    { count: periodBriefCount, setupError: usageError },
  ] =
    userId
      ? await Promise.all([
          getApplicationBriefs(userId),
          getUserProfile(userId),
          getUserSettings(userId),
          getCurrentPeriodBriefCount(userId, plan),
        ])
      : [
          { briefs: [], setupError: "Authentication required" },
          { profile: defaultProfile, setupError: "Authentication required" },
          { settings: defaultSettings },
          { count: 0, setupError: "Authentication required" },
        ]

  return (
    <>
      <DashboardClient
        initialBriefs={briefs}
        initialPeriodBriefCount={periodBriefCount}
        plan={plan}
        profile={profile}
        settings={settings}
        setupError={briefsError || profileError || usageError}
      />
    </>
  )
}
