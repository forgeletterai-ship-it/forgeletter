import { createHash } from "node:crypto"

/**
 * Anonymous-visitor fingerprint (Phase 1 contract):
 * sha256(salt + ip + coarse UA + platform + timezone).
 *
 * Fraud-prevention only (GDPR: legitimate interest, 30-day rolling
 * retention enforced by the KV TTL). Coarse UA keeps the input
 * stable across patch versions so the ladder can't be reset by an
 * auto-update.
 */

function requireSalt(): string {
  const salt = process.env.FINGERPRINT_SALT?.trim()
  if (salt) return salt
  if (process.env.NODE_ENV === "production") {
    throw new Error("FINGERPRINT_SALT is required in production")
  }
  return "dev-fingerprint-salt" // DEV ONLY
}

/** Browser family + major version + OS family. */
export function coarseUserAgent(ua: string | null | undefined): string {
  const s = ua || ""
  let browser = "other"
  let major = "0"
  const pick = (re: RegExp, name: string) => {
    const m = s.match(re)
    if (m) {
      browser = name
      major = m[1] ?? "0"
      return true
    }
    return false
  }
  // Order matters: Edge and Opera embed "Chrome"; Chrome embeds "Safari".
  pick(/Edg(?:e|A|iOS)?\/(\d+)/, "edge") ||
    pick(/OPR\/(\d+)/, "opera") ||
    pick(/Firefox\/(\d+)/, "firefox") ||
    pick(/Chrome\/(\d+)/, "chrome") ||
    pick(/Version\/(\d+).+Safari/, "safari")

  let os = "other"
  if (/Windows/i.test(s)) os = "windows"
  else if (/Android/i.test(s)) os = "android"
  else if (/iPhone|iPad|iOS/i.test(s)) os = "ios"
  else if (/Mac OS X|Macintosh/i.test(s)) os = "mac"
  else if (/Linux/i.test(s)) os = "linux"

  return `${browser}/${major} ${os}`
}

export function fingerprintFrom(parts: {
  ip: string
  userAgent: string | null | undefined
  platform: string | null | undefined
  timezone: string | null | undefined
}): string {
  const input = [
    requireSalt(),
    parts.ip.trim(),
    coarseUserAgent(parts.userAgent),
    (parts.platform || "").trim().toLowerCase(),
    (parts.timezone || "").trim(),
  ].join("|")
  return createHash("sha256").update(input).digest("hex")
}
