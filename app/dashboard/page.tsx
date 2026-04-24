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
      <div className="dashboard-topbar">
        <div className="dashboard-title">
          <span className="section-kicker">Workspace</span>
          <h1>Prepare a polished cover letter brief.</h1>
          <p>
            A smoother, more professional workspace for individuals now and
            career-agency partnerships later. AI generation remains paused.
          </p>
        </div>
        <span className="status-pill active">Generator paused</span>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>{user?.plan === "free" ? "Starter plan" : `${user?.plan.toUpperCase()} plan`}</h3>
          <p>
            {user?.plan === "free"
              ? "Save briefs and prepare your profile before upgrading."
              : "Your paid workspace is active."}
          </p>
          <div className="usage-meter">
            <span />
          </div>
        </div>
        <div className="dashboard-card">
          <h3>Saved drafts</h3>
          <p>{briefs.length} saved {briefs.length === 1 ? "brief" : "briefs"} in history.</p>
        </div>
        <div className="dashboard-card">
          <h3>Partnership-ready</h3>
          <p>Profile, history, billing, and advisor-style workflow pages are in place.</p>
        </div>
      </div>

      <DashboardClient
        initialBriefs={briefs}
        profile={profile}
        settings={settings}
        setupError={briefsError || profileError}
      />
    </>
  )
}
