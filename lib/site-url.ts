/**
 * Canonical site origin used by metadata, sitemap, robots, and OG
 * image generation. Precedence:
 *
 *   1. NEXT_PUBLIC_APP_URL — explicit override set in Vercel env
 *   2. VERCEL_URL — auto-set by Vercel for every deployment
 *      (including preview deploys), without the protocol
 *   3. forgeletter.vercel.app — production fallback
 *
 * Returns the origin without a trailing slash so callers can
 * concatenate paths safely.
 */
export function getSiteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "https://forgeletter.vercel.app"
  return url.replace(/\/$/, "")
}
