import { createHash } from "node:crypto"

/**
 * Log scrubber (Rule 2): letter text never appears in logs — lengths
 * and hashes only. The swap route logs exclusively through swapLog();
 * any string field longer than the cap is replaced by its scrub
 * summary automatically, so a refactor cannot accidentally leak a
 * letter into stdout.
 */

const MAX_LOGGED_STRING = 120

export function scrubText(text: string): { length: number; sha256_12: string } {
  return {
    length: text.length,
    sha256_12: createHash("sha256").update(text).digest("hex").slice(0, 12),
  }
}

function scrubValue(value: unknown): unknown {
  if (typeof value === "string" && value.length > MAX_LOGGED_STRING) {
    return scrubText(value)
  }
  if (Array.isArray(value)) return value.map(scrubValue)
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = scrubValue(v)
    }
    return out
  }
  return value
}

export function swapLog(event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ evt: `swap.${event}`, ...(scrubValue(fields) as object) }))
}

export function swapLogError(event: string, fields: Record<string, unknown> = {}): void {
  console.error(JSON.stringify({ evt: `swap.${event}`, ...(scrubValue(fields) as object) }))
}
