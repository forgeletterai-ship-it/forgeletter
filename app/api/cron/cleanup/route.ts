import { NextRequest, NextResponse } from "next/server"
import { sendLaunchNotifications } from "@/lib/launch-notify"
import { swapLogError } from "@/lib/swap/logscrub"
import { supabaseAdmin } from "@/lib/supabase"

/** Daily share-snapshot TTL cleanup (30-day expiry, Phase 2). */

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return process.env.NODE_ENV !== "production" // DEV ONLY
  return req.headers.get("authorization") === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const { data: shares, error } = await supabaseAdmin.rpc("purge_expired_swap_shares")
  if (error) {
    swapLogError("cron.cleanup", { message: error.message })
    return NextResponse.json({ error: "purge failed" }, { status: 500 })
  }
  // Expired KV counters (Supabase KV backend) go with the same sweep.
  const { data: kvRows, error: kvError } = await supabaseAdmin.rpc(
    "purge_expired_swap_kv"
  )
  if (kvError) swapLogError("cron.cleanup.kv", { message: kvError.message })
  // Vocab k-anonymity purge folded in here: Vercel Hobby allows only
  // two daily crons, so the weekly job runs daily instead (the purge
  // is idempotent and cheap). /api/cron/vocab-purge stays for manual
  // runs; the warm cron is unregistered until prompt caching engages.
  const { data: vocabRows, error: vocabError } = await supabaseAdmin.rpc(
    "purge_swap_vocab"
  )
  if (vocabError) swapLogError("cron.cleanup.vocab", { message: vocabError.message })
  // Post-launch waitlist drain: no-op while isPrelaunch() and once
  // everyone is notified, so it costs nothing on ordinary days.
  const launch = await sendLaunchNotifications().catch(() => ({
    sent: 0,
    remaining: 0,
  }))
  return NextResponse.json({
    shares: shares ?? 0,
    kv: kvRows ?? 0,
    vocab: vocabRows ?? 0,
    launchEmails: launch.sent,
  })
}
