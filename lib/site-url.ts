/**
 * Canonical site origin used by metadata, sitemap, robots, and OG
 * image generation. Precedence:
 *
 *   1. NEXT_PUBLIC_APP_URL — explicit override set in Vercel env
 *   2. Production → https://forgeletter.com (the canonical custom
 *      domain). VERCEL_URL must NOT win here: it is the per-deployment
 *      generated host (project-hash.vercel.app), and using it would
 *      emit canonicals/OG URLs for a host Google should never index.
 *   3. Preview deploys → VERCEL_URL, so shares and OG images resolve
 *      to the preview being looked at
 *   4. Local dev fallback → the production domain
 *
 * Returns the origin without a trailing slash so callers can
 * concatenate paths safely.
 */
const PRODUCTION_SITE_URL = "https://forgeletter.com"

export function getSiteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_ENV === "production"
      ? PRODUCTION_SITE_URL
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : null) ||
    PRODUCTION_SITE_URL
  return url.replace(/\/$/, "")
}
