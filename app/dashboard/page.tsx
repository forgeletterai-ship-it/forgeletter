import Link from "next/link"
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
      <div
        style={{
          maxWidth: 1180,
          margin: "20px auto 0",
          padding: "0 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            padding: "14px 18px",
            borderRadius: 10,
            border: "1px solid var(--line)",
            background:
              "linear-gradient(135deg, rgba(199,154,54,0.10), rgba(36,107,111,0.06))",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <strong style={{ fontSize: 15 }}>The 12-agent AI engine is live.</strong>
            <span style={{ color: "var(--muted)", marginLeft: 8 }}>
              Generate a quality-graded cover letter end-to-end in under 90 seconds.
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="button" href="/dashboard/generate">
              New letter →
            </Link>
            <Link className="button-secondary" href="/dashboard/letters">
              My letters
            </Link>
          </div>
        </div>
      </div>
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
