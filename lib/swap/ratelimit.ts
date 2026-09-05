/**
 * Swap KV + rate windows (Phase 1/2 contract).
 *
 * Backing store is Upstash Redis REST (serverless-safe shared
 * counters). Without credentials we fall back to an in-process map —
 * DEV ONLY, asserted unreachable in production builds (Phase 0.3).
 *
 * Layers (Part V threat model):
 *  - sliding windows per fingerprint and per IP
 *  - per-IP daily ceiling (CGNAT safety, ladder.ts)
 *  - global daily circuit breaker (route budget, default 5,000)
 */

import { supabaseAdmin } from "@/lib/supabase"

export interface SwapKV {
  /** INCR with optional TTL refresh; returns the new value. */
  incr(key: string, ttlSeconds?: number): Promise<number>
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds?: number): Promise<void>
}

class UpstashKV implements SwapKV {
  constructor(
    private url: string,
    private token: string
  ) {}

  private async pipeline(cmds: (string | number)[][]): Promise<unknown[]> {
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cmds),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`Upstash pipeline failed: ${res.status}`)
    const rows = (await res.json()) as { result: unknown; error?: string }[]
    for (const row of rows) {
      if (row.error) throw new Error(`Upstash error: ${row.error}`)
    }
    return rows.map((r) => r.result)
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const cmds: (string | number)[][] = [["INCR", key]]
    if (ttlSeconds) cmds.push(["EXPIRE", key, ttlSeconds])
    const [count] = await this.pipeline(cmds)
    return Number(count)
  }

  async get(key: string): Promise<string | null> {
    const [value] = await this.pipeline([["GET", key]])
    return value === null || value === undefined ? null : String(value)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const cmd: (string | number)[] = ["SET", key, value]
    if (ttlSeconds) cmd.push("EX", ttlSeconds)
    await this.pipeline([cmd])
  }
}

/**
 * Supabase-backed KV — the DEFAULT production backend (owner's call:
 * no extra third-party service). Same pattern as lib/rate-limit.ts:
 * serverless instances share state through Postgres. swap_kv_incr is
 * an atomic upsert-increment RPC (docs/swap-test-schema.sql); the
 * cleanup cron purges expired rows daily. A few ms slower than Redis
 * per op — noise next to the 1.5–2.5s agent call. Upstash remains a
 * drop-in upgrade whenever its env vars appear.
 */
class SupabaseKV implements SwapKV {
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const { data, error } = await supabaseAdmin.rpc("swap_kv_incr", {
      p_key: key,
      p_ttl_seconds: ttlSeconds ?? null,
    })
    if (error) throw new Error(`swap_kv_incr failed: ${error.message}`)
    return Number(data)
  }

  async get(key: string): Promise<string | null> {
    const { data } = await supabaseAdmin
      .from("swap_kv")
      .select("value, expires_at")
      .eq("key", key)
      .maybeSingle()
    if (!data) return null
    if (data.expires_at && new Date(data.expires_at) < new Date()) return null
    return String(data.value)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const { error } = await supabaseAdmin.from("swap_kv").upsert({
      key,
      value,
      expires_at: ttlSeconds
        ? new Date(Date.now() + ttlSeconds * 1000).toISOString()
        : null,
    })
    if (error) throw new Error(`swap_kv set failed: ${error.message}`)
  }
}

// DEV ONLY — in-process fallback when neither Upstash nor Supabase
// env exists. Unreachable in production (assertion below).
class MemoryKV implements SwapKV {
  private store = new Map<string, { value: string; expiresAt: number | null }>()

  constructor() {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Swap KV: no backend — configure Supabase (default) or Upstash"
      )
    }
  }

  private live(key: string) {
    const row = this.store.get(key)
    if (!row) return null
    if (row.expiresAt !== null && Date.now() > row.expiresAt) {
      this.store.delete(key)
      return null
    }
    return row
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const row = this.live(key)
    const next = row ? Number(row.value) + 1 : 1
    this.store.set(key, {
      value: String(next),
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : (row?.expiresAt ?? null),
    })
    return next
  }

  async get(key: string): Promise<string | null> {
    return this.live(key)?.value ?? null
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    })
  }
}

let kv: SwapKV | null = null

export function getSwapKV(): SwapKV {
  if (kv) return kv
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (url && token) {
    kv = new UpstashKV(url, token)
  } else if (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
    (process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim())
  ) {
    kv = new SupabaseKV()
  } else {
    kv = new MemoryKV()
  }
  return kv
}

/** Test seam. */
export function setSwapKVForTests(replacement: SwapKV | null): void {
  kv = replacement
}

/** Fresh isolated store for unit tests (same DEV ONLY guard). */
export function createMemoryKVForTests(): SwapKV {
  return new MemoryKV()
}

/**
 * Sliding-window limiter (two-bucket approximation): the previous
 * fixed window contributes proportionally to how much of it still
 * overlaps the sliding window.
 */
export async function slidingWindowAllow(
  store: SwapKV,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const nowSec = Date.now() / 1000
  const bucket = Math.floor(nowSec / windowSeconds)
  const current = await store.incr(`${key}:${bucket}`, windowSeconds * 2)
  const prevRaw = await store.get(`${key}:${bucket - 1}`)
  const prev = prevRaw ? Number(prevRaw) : 0
  const prevOverlap = 1 - ((nowSec % windowSeconds) / windowSeconds)
  return current + prev * prevOverlap <= limit
}

/** Global daily route budget — the circuit breaker (Part V). */
export const DEFAULT_DAILY_BUDGET = 5000

export async function circuitBreakerCount(store: SwapKV): Promise<number> {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  return store.incr(`swap:global:${day}`, 60 * 60 * 48)
}

export function dailyBudget(): number {
  const raw = Number(process.env.SWAP_DAILY_BUDGET)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DAILY_BUDGET
}
