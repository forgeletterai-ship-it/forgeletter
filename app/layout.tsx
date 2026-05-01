import type { Metadata, Viewport } from "next"
import { BackToTopButton } from "@/components/BackToTopButton"
import "./globals.css"

export const metadata: Metadata = {
  title: "LetterForge - Ultra cover letter workspace",
  description:
    "A polished workspace for drafting, saving, and managing tailored cover letters.",
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
      </body>
    </html>
  )
}
