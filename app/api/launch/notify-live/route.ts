import { NextRequest, NextResponse } from "next/server"
import { sendLaunchNotifications } from "@/lib/launch-notify"

/**
 * Manual trigger for the "we're live" waitlist email — same
 * CRON_SECRET auth as the cron routes. The daily cleanup cron also
 * drains the list automatically after launch; this route exists so
 * launch day doesn't have to wait for the next cron window. Safe to
 * call repeatedly (notified_at makes sending idempotent).
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return process.env.NODE_ENV !== "production" // DEV ONLY
  return req.headers.get("authorization") === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const result = await sendLaunchNotifications()
  return NextResponse.json(result)
}
