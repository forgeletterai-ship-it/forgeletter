import { NextRequest, NextResponse } from "next/server"
import { classifyWithAgent } from "@/lib/swap/agent"
import { swapLog, swapLogError } from "@/lib/swap/logscrub"

/**
 * Hourly keep-warm (Phase 4): one-sentence letter through the agent
 * so the 1h-TTL prefix cache never goes cold (~$10/mo; break-even vs
 * cold cache writes ≈ 1,250 scans/mo).
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
  try {
    const result = await classifyWithAgent([
      { index: 0, text: "I improved onboarding at my current role.", words: 7 },
    ])
    swapLog("cron.warm", {
      cache_read: result.cacheReadTokens,
      cache_creation: result.cacheCreationTokens,
    })
    return NextResponse.json({
      ok: true,
      cacheRead: result.cacheReadTokens,
      cacheCreation: result.cacheCreationTokens,
    })
  } catch (error) {
    swapLogError("cron.warm", { message: (error as Error).message })
    return NextResponse.json({ error: "warm failed" }, { status: 502 })
  }
}
