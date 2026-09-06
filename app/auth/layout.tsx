import { redirect } from "next/navigation"
import { isPrelaunch } from "@/lib/launch"

/* Pre-launch gate for every /auth/* page (login, signup, password
   flows, error): visitors are sent back to the splash until the
   LAUNCH_AT moment in lib/launch.ts. force-dynamic so the decision
   is made per request — statically prerendered, the redirect would
   be frozen at build time and launch day would change nothing. */
export const dynamic = "force-dynamic"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (isPrelaunch()) redirect("/")
  return children
}
