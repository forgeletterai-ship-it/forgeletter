import {
  defaultProfile,
  defaultSettings,
  getApplicationBriefs,
  getCurrentAppUser,
  getUserProfile,
  getUserSettings,
} from "@/lib/app-data"
import { DashboardClient } from "./DashboardClient"

export default async function DashboardPage() {
  const { user } = await getCurrentAppUser()
  const userId = user?.id || ""
  const [{ briefs, setupError: briefsError }, { profile, setupError: profileError }, { settings }] =
    userId
      ? await Promise.all([
          getApplicationBriefs(userId),
          getUserProfile(userId),
          getUserSettings(userId),
        ])
      : [
          { briefs: [], setupError: "Authentication required" },
          { profile: defaultProfile, setupError: "Authentication required" },
          { settings: defaultSettings },
        ]

  return (
    <>
      <DashboardClient
        initialBriefs={briefs}
        plan={user?.plan || "free"}
        profile={profile}
        settings={settings}
        setupError={briefsError || profileError}
      />
    </>
  )
}
