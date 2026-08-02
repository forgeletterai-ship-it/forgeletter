import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { BackToTopButton } from "@/components/BackToTopButton"
import { CookieConsentProvider } from "@/components/CookieConsent"
import { getSiteUrl } from "@/lib/site-url"
import "./globals.css"

// Self-hosted via next/font: the font files are downloaded at BUILD
// time and served from our own origin — no runtime request to Google
// Fonts (which is both render-blocking and a documented GDPR problem
// for EU visitors; German courts have ruled against direct embedding).
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-jakarta",
})

const SITE_URL = getSiteUrl()
const SITE_NAME = "ForgeLetter"
const DEFAULT_TITLE = "ForgeLetter — AI Cover Letters That Get You Hired"
const DEFAULT_DESCRIPTION =
  "ForgeLetter uses up to a 12-agent AI pipeline to write, verify and auto-improve your cover letter before you see it. Every letter is quality-checked and refined at no extra cost."

export const metadata: Metadata = {
  // metadataBase lets every page resolve relative OG/icon URLs to
  // absolute production URLs. Required for social-share previews to
  // load images correctly.
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s — ForgeLetter",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "AI cover letter",
    "cover letter generator",
    "job application",
    "ATS optimization",
    "cover letter writer",
    "career tools",
  ],
  authors: [{ name: "ForgeLetter" }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  // NOTE: no `alternates.canonical` here. Next merges metadata
  // per-field, so a root canonical of "/" would cascade to every page
  // that doesn't override it — telling crawlers that /contact
  // and all legal pages are duplicates of the homepage. Each page
  // declares its own canonical instead (homepage in app/page.tsx).
  // Social previews — LinkedIn, Slack, iMessage, Discord all pull
  // these tags. Without them you get a bare URL with no image or
  // description.
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    locale: "en_US",
    images: [
      {
        // The dynamic 1200×630 generator (edge-cached) — the previous
        // square 1254×1254 hero cropped badly on LinkedIn/Twitter.
        url: "/api/og?title=AI%20cover%20letters%20that%20get%20you%20hired&category=ForgeLetter",
        width: 1200,
        height: 630,
        alt: "ForgeLetter — AI cover letters that get you hired",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      "/api/og?title=AI%20cover%20letters%20that%20get%20you%20hired&category=ForgeLetter",
    ],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/letterforge-icon.svg", type: "image/svg+xml" },
    ],
    apple: "/letterforge-icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0c403e",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        {children}
        <BackToTopButton />
        <CookieConsentProvider />
      </body>
    </html>
  )
}
