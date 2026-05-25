import type { Metadata, Viewport } from "next"
import { BackToTopButton } from "@/components/BackToTopButton"
import { CookieConsentProvider } from "@/components/CookieConsent"
import { getSiteUrl } from "@/lib/site-url"
import "./globals.css"

const SITE_URL = getSiteUrl()
const SITE_NAME = "ForgeLetter"
const DEFAULT_TITLE = "ForgeLetter — AI Cover Letters That Get You Hired"
const DEFAULT_DESCRIPTION =
  "ForgeLetter uses a 12-agent AI pipeline to write, verify, and perfect your cover letter before you ever see it. Every letter passes a 95+ quality score."

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
  alternates: {
    canonical: "/",
  },
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
        url: "/hero-image.png",
        width: 1254,
        height: 1254,
        alt: "ForgeLetter — AI cover letter workspace illustration",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/hero-image.png"],
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
    <html lang="en">
      <body>
        {children}
        <BackToTopButton />
        <CookieConsentProvider />
      </body>
    </html>
  )
}
