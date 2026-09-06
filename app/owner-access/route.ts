import { NextRequest, NextResponse } from "next/server"
import { OWNER_DOOR_COOKIE, isPrelaunch } from "@/lib/launch"

/**
 * Owner side-door during prelaunch: visiting /owner-access sets the
 * cookie that lets the /auth pages render, then forwards to login.
 * Deliberately unlisted but not secret — anyone who finds it only
 * reaches the login form, where the NextAuth signIn callback rejects
 * every non-owner email until LAUNCH_AT. After launch it just
 * forwards to the login page.
 */
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/auth/login", req.nextUrl.origin))
  if (isPrelaunch()) {
    res.cookies.set(OWNER_DOOR_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })
  }
  return res
}
