import Link from "next/link"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { auth, signOut } from "@/auth"
import { Brand } from "@/components/Brand"
import { getCurrentAppUser } from "@/lib/app-data"

const navItems = [
  { href: "/dashboard", label: "Workspace" },
  { href: "/dashboard/history", label: "History" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/settings", label: "Settings" },
]

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

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Brand dark />
        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          {navItems.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="dashboard-user">
          <strong>{appUser?.name || sessionUser.name || "LetterForge user"}</strong>
          <span>{appUser?.email || sessionUser.email || "No email on file"}</span>
          <span className="status-pill active">
            {plan === "free" ? "Starter plan" : `${plan.toUpperCase()} plan`}
          </span>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/auth/login" })
            }}
            style={{ marginTop: 14 }}
          >
            <button className="button-secondary" type="submit" style={{ width: "100%" }}>
              Log out
            </button>
          </form>
        </div>
      </aside>
      <section className="dashboard-main">{children}</section>
    </main>
  )
}
