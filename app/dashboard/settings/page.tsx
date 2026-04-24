import { defaultSettings, getCurrentAppUser, getUserSettings } from "@/lib/app-data"
import { SettingsClient } from "./SettingsClient"

export default async function SettingsPage() {
  const { user } = await getCurrentAppUser()
  const { settings, setupError } = user
    ? await getUserSettings(user.id)
    : { settings: defaultSettings, setupError: "Authentication required" }

  return (
    <>
      <div className="dashboard-topbar">
        <div className="dashboard-title">
          <span className="section-kicker">Settings</span>
          <h1>Account preferences.</h1>
          <p>Manage tone defaults, notifications, exports, and workspace data.</p>
        </div>
      </div>

      <SettingsClient initialSettings={settings} setupError={setupError} />
    </>
  )
}
