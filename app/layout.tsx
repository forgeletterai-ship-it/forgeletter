import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "LetterForge - Ultra cover letter workspace",
  description:
    "A polished workspace for drafting, saving, and managing tailored cover letters.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
