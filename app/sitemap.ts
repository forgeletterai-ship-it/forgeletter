import type { MetadataRoute } from "next"
import { resourceArticles } from "@/lib/resources"
import { getSiteUrl } from "@/lib/site-url"

/**
 * /sitemap.xml — every publicly indexable URL on the site.
 *
 * Auto-generated at build time from:
 *   - Top-level public routes (landing, contact, blog index, guides)
 *   - All blog post slugs (lib/resources.ts is the source of truth)
 *   - All 7 legal pages
 *
 * Deliberately excludes /api, /dashboard, /auth — those live in
 * robots.txt's Disallow list.
 *
 * Next.js converts this file's export into a real sitemap.xml at
 * the /sitemap.xml route, properly formatted for Google / Bing /
 * Yandex / DuckDuckGo to consume.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()
  const today = new Date()

  const topLevel: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: today, changeFrequency: "weekly", priority: 1.0 },
    { url: `${siteUrl}/blog`, lastModified: today, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/cover-letter-tips`, lastModified: today, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/interview-prep`, lastModified: today, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/job-search-guide`, lastModified: today, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/contact`, lastModified: today, changeFrequency: "monthly", priority: 0.5 },
  ]

  const blog: MetadataRoute.Sitemap = resourceArticles.map((article) => ({
    url: `${siteUrl}/blog/${article.slug}`,
    lastModified: today,
    changeFrequency: "monthly",
    priority: 0.6,
  }))

  const legalSlugs = [
    "terms",
    "privacy",
    "cookies",
    "imprint",
    "refund-policy",
    "acceptable-use",
    "accessibility",
  ]
  const legal: MetadataRoute.Sitemap = legalSlugs.map((slug) => ({
    url: `${siteUrl}/${slug}`,
    lastModified: today,
    changeFrequency: "yearly",
    priority: 0.3,
  }))

  return [...topLevel, ...blog, ...legal]
}
