import { NextRequest, NextResponse } from "next/server"
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
  const { data, error } = await supabaseAdmin.rpc("purge_expired_swap_shares")
  if (error) {
    swapLogError("cron.cleanup", { message: error.message })
    return NextResponse.json({ error: "purge failed" }, { status: 500 })
  }
  return NextResponse.json({ deleted: data ?? 0 })
}
