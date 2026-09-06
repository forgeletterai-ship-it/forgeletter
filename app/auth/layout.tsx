import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { OWNER_DOOR_COOKIE, isPrelaunch } from "@/lib/launch"

/* Pre-launch gate for every /auth/* page (login, signup, password
   flows, error): visitors are sent back to the splash until the
   LAUNCH_AT moment in lib/launch.ts. Owners open the pages via
   /owner-access (cookie) — the actual sign-in allow-list lives in
   the NextAuth signIn callback, this only unhides the form.
   force-dynamic so the decision is made per request — statically
   prerendered, the redirect would be frozen at build time and launch
   day would change nothing. */
export const dynamic = "force-dynamic"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (isPrelaunch()) {
    const jar = await cookies()
    if (jar.get(OWNER_DOOR_COOKIE)?.value !== "1") redirect("/")
  }
  return children
}
