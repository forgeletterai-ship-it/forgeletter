import { getSiteUrl } from "@/lib/site-url"
import { isPrelaunch } from "@/lib/launch"
import { supabaseAdmin } from "@/lib/supabase"

/** Emails sent per invocation — Resend-friendly; the daily cron (and
 *  the manual trigger) drain the rest in later runs. */
const BATCH = 50

/**
 * Send the one-time "ForgeLetter is live" email to every waitlist
 * signup not yet notified. No-op before LAUNCH_AT and without Resend
 * config. Idempotent: notified_at is stamped per address on success,
 * so repeated runs never double-mail.
 */
export async function sendLaunchNotifications(): Promise<{
  sent: number
  remaining: number
  skipped?: string
}> {
  if (isPrelaunch()) return { sent: 0, remaining: 0, skipped: "prelaunch" }
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return { sent: 0, remaining: 0, skipped: "resend not configured" }
  }

  const { data, error } = await supabaseAdmin
    .from("launch_signups")
    .select("id,email")
    .is("notified_at", null)
    .order("created_at", { ascending: true })
    .limit(BATCH)

  if (error || !data || data.length === 0) return { sent: 0, remaining: 0 }

  const siteUrl = getSiteUrl()
  let sent = 0
  for (const row of data) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: row.email,
        subject: "ForgeLetter is live",
        text: [
          "The doors are open.",
          "",
          "ForgeLetter — AI cover letters written, verified and refined by a 12-agent pipeline — is officially live. You asked to be first to know, so here it is:",
          "",
          siteUrl,
          "",
          "Create your account, generate your first letter, and tell us what you think.",
          "",
          "— The ForgeLetter team",
          "",
          "You're receiving this one-time email because you asked to be notified about the ForgeLetter launch. There's nothing to unsubscribe from — this is the only email this list will ever send.",
        ].join("\n"),
      }),
    }).catch(() => null)

    if (res?.ok) {
      await supabaseAdmin
        .from("launch_signups")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", row.id)
      sent++
    }
  }

  const { count } = await supabaseAdmin
    .from("launch_signups")
    .select("id", { count: "exact", head: true })
    .is("notified_at", null)

  return { sent, remaining: count ?? 0 }
}
