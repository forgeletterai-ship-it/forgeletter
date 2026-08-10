import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { swapLogError } from "@/lib/swap/logscrub"
import { getSwapKV, slidingWindowAllow } from "@/lib/swap/ratelimit"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Share snapshot (Rule 1 exception a): explicit click only, 30-day
 * TTL (schema default + daily cleanup cron), payload is scores +
 * profile only — never letter text. UUIDv4 ids defeat enumeration.
 * (Not in the doc's file map, but the ShareButton→OG flow needs a
 * server write; noted in BUILDLOG.)
 */

const PROFILES = new Set(["TARGETED", "FLATTERY", "CREDENTIALS", "TEMPLATE_FILL", "BLANK_PAGE"])
const QUADRANTS = new Set(["TARGETED", "FLATTERY", "CREDENTIALS", "FILLER"])

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "0.0.0.0"
  if (!(await slidingWindowAllow(getSwapKV(), `swap:share:${ip}`, 10, 3600))) {
    return NextResponse.json({ error: "Too many shares." }, { status: 429 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    anchor?: number
    proof?: number
    quadrant?: string
    profile?: string
  }
  const anchor = Number(body.anchor)
  const proof = Number(body.proof)
  if (
    !Number.isFinite(anchor) || anchor < 0 || anchor > 100 ||
    !Number.isFinite(proof) || proof < 0 || proof > 100 ||
    !PROFILES.has(String(body.profile)) ||
    !QUADRANTS.has(String(body.quadrant))
  ) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 })
  }

  const id = randomUUID()
  const { error } = await supabaseAdmin.from("swap_shares").insert({
    id,
    payload: {
      anchor: Math.round(anchor),
      proof: Math.round(proof),
      quadrant: body.quadrant,
      profile: body.profile,
    },
  })
  if (error) {
    swapLogError("share.insert", { message: error.message })
    return NextResponse.json({ error: "Could not save the snapshot." }, { status: 500 })
  }
  return NextResponse.json({ id })
}
