import type { Metadata } from "next"
import Link from "next/link"
import { PublicFooter, PublicNav } from "@/components/PublicChrome"

export const metadata: Metadata = {
  title: "Page not found — ForgeLetter",
  description:
    "We couldn't find that page. Try the homepage or jump to one of our most-visited destinations.",
  robots: { index: false, follow: true },
}

const POPULAR_LINKS = [
  { href: "/", label: "Home", description: "Back to the landing page" },
  { href: "/#pricing", label: "Pricing", description: "Plans and what's included" },
  { href: "/blog", label: "Resources", description: "Cover-letter and job-search guides" },
  { href: "/cover-letter-tips", label: "Cover letter tips", description: "Writing principles that work" },
  { href: "/interview-prep", label: "Interview prep", description: "Get ready for the next round" },
  { href: "/contact", label: "Contact", description: "Reach the ForgeLetter team" },
] as const

export default function NotFound() {
  return (
    <div className="page-shell">
      <PublicNav />
      <main>
        <section className="not-found">
          <div className="container not-found__inner">
            <p className="not-found__kicker">404</p>
            <h1>We couldn&apos;t find that page.</h1>
            <p className="not-found__sub">
              The URL might have a typo, or the page was moved. Try one of
              the destinations below — or jump back home.
            </p>

            <div className="not-found__actions">
              <Link className="button" href="/">
                Back to home
              </Link>
              <Link className="button-secondary" href="/blog">
                Browse resources
              </Link>
            </div>

            <h2 className="not-found__section-title">Popular destinations</h2>
            <ul className="not-found__links">
              {POPULAR_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <strong>{link.label}</strong>
                    <span>{link.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
