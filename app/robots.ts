import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/site-url"

/**
 * /robots.txt — tells search-engine crawlers what they can crawl and
 * where the sitemap is. Next.js converts this file's export into a
 * proper robots.txt at /robots.txt automatically.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  // On Vercel preview environments we additionally send X-Robots-Tag:
  // noindex (set in next.config.ts). robots.txt here is the
  // production-style policy; the header overrides for non-prod.
  return {
    rules: [
      {
        userAgent: "*",
        // /api/og is intentionally allowed so social-share crawlers
        // (LinkedIn, Twitter, Slack) can fetch dynamic OG images.
        allow: ["/", "/api/og"],
        disallow: [
          "/api/",
          "/dashboard/",
          "/auth/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
