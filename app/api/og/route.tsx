import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"

export const runtime = "edge"

/**
 * Dynamic Open Graph image generator for blog posts and other public
 * pages. Called by blog/[slug]/page.tsx's generateMetadata as the
 * og:image URL.
 *
 * Renders a 1200x630 PNG with the title and category, styled to
 * match the ForgeLetter brand. Vercel caches the result at the edge
 * after first request so only the first share of any post pays the
 * generation cost.
 *
 * Query params:
 *   ?title=...      The post title (URL-encoded). Required.
 *   ?category=...   The category label (URL-encoded). Optional.
 *
 * Defaults are sensible so a missing query renders a generic
 * ForgeLetter card rather than crashing.
 */
export async function GET(req: NextRequest) {
  const reqUrl = new URL(req.url)
  const origin = `${reqUrl.protocol}//${reqUrl.host}`
  const title = (reqUrl.searchParams.get("title") || "ForgeLetter — AI cover letters")
    .slice(0, 140)
  const category = (reqUrl.searchParams.get("category") || "ForgeLetter")
    .slice(0, 40)
  // Absolute URL to the brand mark; Satori fetches it at render time.
  const logoUrl = `${origin}/letterforge-icon.png`

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "linear-gradient(135deg, #0c403e 0%, #105250 60%, #1b6b65 100%)",
          color: "#f9e8c4",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top row: kicker + brand mark */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              padding: "10px 22px",
              borderRadius: "999px",
              border: "1.5px solid rgba(245, 233, 200, 0.45)",
              fontSize: "20px",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(249, 232, 196, 0.85)",
            }}
          >
            {category}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              fontSize: "28px",
              fontWeight: 800,
              letterSpacing: "-0.01em",
            }}
          >
            {/* Real brand mark — fetched from the deployment origin
                at render time. Satori inlines the bytes into the PNG. */}
            <img
              src={logoUrl}
              width={56}
              height={56}
              alt="ForgeLetter"
              style={{
                borderRadius: "14px",
                display: "flex",
              }}
            />
            <span>
              Forge<span style={{ color: "#d9a644" }}>Letter</span>
            </span>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 80 ? "60px" : "76px",
            lineHeight: 1.1,
            letterSpacing: "-0.025em",
            fontWeight: 700,
            color: "#fffdf6",
            maxWidth: "1000px",
            display: "flex",
          }}
        >
          {title}
        </div>

        {/* Bottom row: gold rule + tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <div
            style={{
              width: "120px",
              height: "4px",
              borderRadius: "4px",
              background:
                "linear-gradient(90deg, #b8862b 0%, #d9a644 50%, #b8862b 100%)",
              display: "flex",
            }}
          />
          <div
            style={{
              fontSize: "26px",
              color: "rgba(249, 232, 196, 0.78)",
              letterSpacing: "0.01em",
            }}
          >
            AI cover letters, written by a 12-agent pipeline.
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // Cache aggressively at the edge — same query → same image.
        "Cache-Control":
          "public, immutable, no-transform, max-age=31536000",
      },
    }
  )
}
