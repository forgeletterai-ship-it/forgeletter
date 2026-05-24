import type { NextConfig } from "next"

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "ambient-light-sensor=()",
      "autoplay=()",
      "battery=()",
      "camera=()",
      "display-capture=()",
      "encrypted-media=()",
      "fullscreen=(self)",
      "geolocation=()",
      "gyroscope=()",
      "interest-cohort=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=(self)",
      "picture-in-picture=()",
      "publickey-credentials-get=()",
      "screen-wake-lock=()",
      "sync-xhr=()",
      "usb=()",
      "xr-spatial-tracking=()",
    ].join(", "),
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self' https://checkout.stripe.com",
      "frame-ancestors 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.stripe.com https://accounts.google.com https://connect.facebook.net https://www.facebook.com",
      "script-src-attr 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self'",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.stripe.com https://m.stripe.com https://api.anthropic.com https://accounts.google.com https://graph.facebook.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://*.stripe.com https://accounts.google.com https://www.facebook.com",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
]

const indexingHeader =
  process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production"
    ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
    : []

const nextConfig: NextConfig = {
  // Next.js's file tracer can't statically detect fs.readFileSync calls
  // that build a path at runtime (path.resolve(process.cwd(), ...)).
  // Without this, the PDF font TTFs ship to local dev but not to
  // Vercel's serverless function bundle, and PDF generation fails.
  outputFileTracingIncludes: {
    "/api/letters/[id]/pdf": [
      "./lib/pdf/fonts/**/*",
      "./lib/pdf/assets/**/*",
    ],
  },
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...securityHeaders, ...indexingHeader],
      },
    ]
  },
}

export default nextConfig
