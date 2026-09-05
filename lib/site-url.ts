/**
 * Canonical site origin used by metadata, sitemap, robots, and OG
 * image generation. Precedence:
 *
 *   1. Production → ALWAYS https://forgeletter.com. Nothing may
 *      override this: a stale NEXT_PUBLIC_APP_URL in the Vercel env
 *      (set before the custom domain existed) shipped
 *      vercel.app canonicals to Google — the exact bug this order
 *      now makes impossible.
 *   2. NEXT_PUBLIC_APP_URL — explicit override for preview/dev.
 *   3. Preview deploys → VERCEL_URL, so shares and OG images resolve
 *      to the preview being looked at.
 *   4. Local dev fallback → the production domain.
 *
 * Returns the origin without a trailing slash so callers can
 * concatenate paths safely.
 */
const PRODUCTION_SITE_URL = "https://forgeletter.com"

export function getSiteUrl(): string {
  if (process.env.VERCEL_ENV === "production") return PRODUCTION_SITE_URL
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    PRODUCTION_SITE_URL
  return url.replace(/\/$/, "")
}
