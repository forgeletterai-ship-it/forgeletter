import { getCurrentAppUser } from "@/lib/app-data"
import { SecurityClient } from "./SecurityClient"

export default async function SecurityPage() {
  const { user, error } = await getCurrentAppUser()

  return (
    <SecurityClient
      displayName={user?.name || "ForgeLetter user"}
      email={user?.email || ""}
      setupError={error}
    />
  )
}
