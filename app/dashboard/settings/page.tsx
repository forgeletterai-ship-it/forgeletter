import { getUserSettings, requireAppUser } from "@/lib/app-data"
import { SettingsClient } from "./SettingsClient"

export default async function SettingsPage() {
  const user = await requireAppUser()
  const { settings, setupError } = await getUserSettings(user.id)

  return <SettingsClient initialSettings={settings} setupError={setupError} />
}
