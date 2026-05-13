import { defaultSettings, getCurrentAppUser, getUserSettings } from "@/lib/app-data"
import { SettingsClient } from "./SettingsClient"

export default async function SettingsPage() {
  const { user } = await getCurrentAppUser()
  const { settings, setupError } = user
    ? await getUserSettings(user.id)
    : { settings: defaultSettings, setupError: "Authentication required" }

  return <SettingsClient initialSettings={settings} setupError={setupError} />
}
