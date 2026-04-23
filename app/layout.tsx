import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LetterForge — AI Cover Letters That Get Interviews',
  description: 'Generate tailored cover letters in 5 seconds.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet"/>
      </head>
      <body>{children}</body>
    </html>
  )
}