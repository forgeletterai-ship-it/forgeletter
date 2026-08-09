import { NextRequest, NextResponse } from "next/server"
import { getSiteUrl } from "@/lib/site-url"
import { swapLog, swapLogError } from "@/lib/swap/logscrub"
import { OUTCOME_EMAIL } from "@/lib/swap/templates"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Daily outcome-email cron (Phase 2). Sends the 30-day question via
 * Resend and deletes the queued plaintext address on send — after
 * this, no email exists anywhere in the swap stack.
 */

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return process.env.NODE_ENV !== "production" // DEV ONLY
  return req.headers.get("authorization") === `Bearer ${secret}`
}

const BATCH = 100

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return NextResponse.json({ sent: 0, skipped: "resend not configured" })
  }

  const { data: due, error } = await supabaseAdmin
    .from("swap_outcome_queue")
    .select("id, stat_id, email, consent_id")
    .lte("send_after", new Date().toISOString())
    .limit(BATCH)

  if (error) {
    swapLogError("cron.outcomes.query", { message: error.message })
    return NextResponse.json({ error: "query failed" }, { status: 500 })
  }

  let sent = 0
  for (const row of due ?? []) {
    try {
      const { data: stat } = await supabaseAdmin
        .from("swap_stats")
        .select("outcome_token")
        .eq("id", row.stat_id)
        .maybeSingle()
      if (!stat?.outcome_token) {
        await supabaseAdmin.from("swap_outcome_queue").delete().eq("id", row.id)
        continue
      }

      const base = `${getSiteUrl()}/api/outcome/${stat.outcome_token}`
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL,
          to: row.email,
          subject: OUTCOME_EMAIL.subject,
          html: [
            `<p>A month ago you scanned a cover letter with us. One question, three buttons — that's the whole email.</p>`,
            `<p><a href="${base}?r=interview">Got an interview</a> · <a href="${base}?r=none">No interview</a> · <a href="${base}?r=noapply">Didn't apply</a></p>`,
            `<p>We publish what we learn, including if our scores turn out not to matter. — ForgeLetter</p>`,
            `<p style="color:#888;font-size:12px"><a href="${base}?r=unsub">Unsubscribe</a></p>`,
          ].join("\n"),
        }),
      })

      if (res.ok) {
        // Plaintext address exists only until send (Part V).
        await supabaseAdmin.from("swap_outcome_queue").delete().eq("id", row.id)
        sent += 1
        swapLog("outcome_email_sent", { statId: row.stat_id })
      } else {
        swapLogError("cron.outcomes.send", { status: res.status })
      }
    } catch (err) {
      swapLogError("cron.outcomes.row", { message: (err as Error).message })
    }
  }

  return NextResponse.json({ due: due?.length ?? 0, sent })
}
