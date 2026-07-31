import { createHash } from "node:crypto"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * DB-backed sliding-window rate limiter for the auth surface.
 *
 * Why Supabase and not memory: Vercel serverless instances don't share
 * memory, so an in-process counter is trivially bypassed by parallel
 * requests landing on different instances. The auth endpoints already
 * pay a DB round-trip, so one more small count+insert is acceptable.
 *
 * Fails OPEN by design: if the auth_rate_limits table is missing
 * (migration not applied) or the query errors, the request is allowed
 * and a warning is logged. Rate limiting is defense-in-depth here —
 * an outage must never lock every customer out of login.
 *
 * Schema: docs/supabase-auth-hardening.sql.
 */

const RATE_LIMIT_SALT =
  process.env.CONSENT_LOG_SALT || "forgeletter-consent-v1"

/** Hash identifying values (IPs, emails) so the limit table never
 *  stores raw PII. */
export function rateLimitKey(scope: string, value: string): string {
  const digest = createHash("sha256")
    .update(value.trim().toLowerCase() + RATE_LIMIT_SALT)
    .digest("hex")
    .slice(0, 32)
  return `${scope}:${digest}`
}

export async function checkRateLimit(args: {
  key: string
  /** Max attempts inside the window. */
  max: number
  /** Window length in seconds. */
  windowSeconds: number
}): Promise<{ allowed: boolean }> {
  const windowStart = new Date(
    Date.now() - args.windowSeconds * 1000
  ).toISOString()

  try {
    const { count, error: countError } = await supabaseAdmin
      .from("auth_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("key", args.key)
      .gte("created_at", windowStart)

    if (countError) {
      warnOnce(countError)
      return { allowed: true }
    }

    if ((count ?? 0) >= args.max) {
      return { allowed: false }
    }

    const { error: insertError } = await supabaseAdmin
      .from("auth_rate_limits")
      .insert({ key: args.key })
    if (insertError) {
      warnOnce(insertError)
      return { allowed: true }
    }

    // Opportunistic cleanup: drop this key's rows older than a day so
    // the table stays small without needing a cron.
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    void supabaseAdmin
      .from("auth_rate_limits")
      .delete()
      .eq("key", args.key)
      .lt("created_at", dayAgo)
      .then(
        () => undefined,
        () => undefined
      )

    return { allowed: true }
  } catch (error) {
    warnOnce(error)
    return { allowed: true }
  }
}

let warned = false
function warnOnce(error: unknown) {
  if (warned) return
  warned = true
  console.warn(
    "[rate-limit] auth_rate_limits unavailable — rate limiting disabled (apply docs/supabase-auth-hardening.sql):",
    (error as { message?: string })?.message ?? error
  )
}

/** Extract the client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIpFrom(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  )
}
