import type { Metadata, Viewport } from "next"
import { BackToTopButton } from "@/components/BackToTopButton"
import { CookieConsentProvider } from "@/components/CookieConsent"
import "./globals.css"

export const metadata: Metadata = {
  title: "ForgeLetter — AI Cover Letters That Get You Hired",
  description:
    "ForgeLetter uses a 12-agent AI pipeline to write, verify, and perfect your cover letter before you ever see it. Every letter passes a 95+ quality score.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
