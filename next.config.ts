import type { NextConfig } from "next"

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
}

export default nextConfig
