import { NextRequest, NextResponse } from "next/server"
import { swapLogError } from "@/lib/swap/logscrub"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Weekly k-anonymity purge (Phase 2): vocab_counts rows with cnt < 10
 * and anything outside the closed vocabulary shape are deleted so a
 * rare personal token can never survive in the aggregates.
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
  const { data, error } = await supabaseAdmin.rpc("purge_swap_vocab")
  if (error) {
    swapLogError("cron.vocab-purge", { message: error.message })
    return NextResponse.json({ error: "purge failed" }, { status: 500 })
  }
  return NextResponse.json({ deleted: data ?? 0 })
}
