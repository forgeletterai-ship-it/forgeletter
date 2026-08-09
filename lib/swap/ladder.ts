import type { LadderDecision } from "@/lib/swap/types"
import type { SwapKV } from "@/lib/swap/ratelimit"

/**
 * The lifetime ladder (Rule 12 — totals are a human decision):
 * 1 anonymous scan per fingerprint + 2 per free account; paying
 * customers bypass. A per-IP daily ceiling of 25 sits on top so a
 * CGNAT block can't be exhausted by one household — or farmed by one
 * script (Part V).
 *
 * Storage: the anonymous counter lives in KV under a 30-day rolling
 * TTL (the fingerprint's GDPR retention bound). Account usage is
 * derived from swap_stats rows — durable, and no extra identifier
 * needs storing.
 */

export const ANON_MAX = 1
export const ACCT_MAX = 2
export const IP_DAILY_CEILING = 25

const ANON_TTL_SECONDS = 30 * 24 * 60 * 60
const IP_TTL_SECONDS = 48 * 60 * 60

function ipDayKey(ipHash: string): string {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  return `swap:ip:${ipHash}:${day}`
}

export async function checkLadder(opts: {
  kv: SwapKV
  fingerprint: string
  ipHash: string
  userId: string | null
  paying: boolean
  /** Count of this account's prior swap_stats rows (route supplies). */
  accountScansUsed: number
}): Promise<LadderDecision> {
  const { kv, fingerprint, ipHash, userId, paying, accountScansUsed } = opts

  const ipCountRaw = await kv.get(ipDayKey(ipHash))
  if (ipCountRaw && Number(ipCountRaw) >= IP_DAILY_CEILING) {
    return { allowed: false, ordinal: null, tier: userId ? "account" : "anon", reason: "rate" }
  }

  if (paying) {
    return { allowed: true, ordinal: null, tier: "paying" }
  }

  if (userId) {
    if (accountScansUsed >= ACCT_MAX) {
      return { allowed: false, ordinal: null, tier: "account", reason: "acct_limit" }
    }
    // Account scans occupy ladder positions 2 and 3.
    return { allowed: true, ordinal: 2 + accountScansUsed, tier: "account" }
  }

  const anonUsedRaw = await kv.get(`swap:anon:${fingerprint}`)
  if (anonUsedRaw && Number(anonUsedRaw) >= ANON_MAX) {
    return { allowed: false, ordinal: null, tier: "anon", reason: "anon_limit" }
  }
  return { allowed: true, ordinal: 1, tier: "anon" }
}

/** Burn the scan after a successful classification (not before —
 *  failed requests must not consume the ladder). */
export async function commitScan(opts: {
  kv: SwapKV
  fingerprint: string
  ipHash: string
  tier: LadderDecision["tier"]
}): Promise<void> {
  const { kv, fingerprint, ipHash, tier } = opts
  await kv.incr(ipDayKey(ipHash), IP_TTL_SECONDS)
  if (tier === "anon") {
    await kv.incr(`swap:anon:${fingerprint}`, ANON_TTL_SECONDS)
  }
}
