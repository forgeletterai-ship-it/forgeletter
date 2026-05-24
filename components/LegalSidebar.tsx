"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CookiePreferencesLink } from "./CookiePreferencesLink"

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of service" },
  { href: "/cookies", label: "Cookie policy" },
  { href: "/acceptable-use", label: "Acceptable use" },
  { href: "/refund-policy", label: "Refund policy" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/imprint", label: "Imprint" },
] as const

export function LegalSidebar() {
  const pathname = usePathname()
  return (
    <aside className="legal-sidebar" aria-label="Legal documents">
      <div className="legal-sidebar__title">
        <span className="section-kicker">Legal</span>
        <h2>Documents</h2>
      </div>
      <nav className="legal-sidebar__links" aria-label="Legal navigation">
        {LEGAL_LINKS.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? "legal-sidebar__link legal-sidebar__link--active"
                  : "legal-sidebar__link"
              }
              aria-current={active ? "page" : undefined}
            >
              <span className="legal-sidebar__bullet" aria-hidden="true" />
              <span>{link.label}</span>
            </Link>
          )
        })}
        <CookiePreferencesLink className="legal-sidebar__link legal-sidebar__link--action">
          <span className="legal-sidebar__bullet" aria-hidden="true" />
          <span>Cookie preferences</span>
        </CookiePreferencesLink>
      </nav>
    </aside>
  )
}
