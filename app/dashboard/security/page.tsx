import { requireAppUser } from "@/lib/app-data"
import { SecurityClient } from "./SecurityClient"

export default async function SecurityPage() {
  const user = await requireAppUser()

  return (
    <SecurityClient
      displayName={user.name || "ForgeLetter user"}
      email={user.email}
    />
  )
}
