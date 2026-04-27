import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { auth, signOut } from "@/auth"
import { getCurrentAppUser } from "@/lib/app-data"
import { DashboardNavigation } from "./DashboardNavigation"

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!parts.length) {
    return "FL"
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/login")
  }

  const { user: appUser } = await getCurrentAppUser()
  const sessionUser = session.user as {
    name?: string | null
    email?: string | null
  }
  const plan = appUser?.plan || "free"
  const displayName = appUser?.name || sessionUser.name || "ForgeLetter user"
  const planTier = plan === "ultra" ? "ultra" : plan === "pro" ? "pro" : "regular"
  const planLabel =
    planTier === "regular" ? "Regular" : planTier === "pro" ? "PRO" : "ULTRA"

  async function logoutAction() {
    "use server"
    await signOut({ redirectTo: "/auth/login" })
  }

  return (
    <main className="dashboard-shell">
      <DashboardNavigation
        displayName={displayName}
        initials={getInitials(displayName)}
        logoutAction={logoutAction}
        planLabel={planLabel}
        planTier={planTier}
      />
      <section className="dashboard-main">{children}</section>
    </main>
  )
}
