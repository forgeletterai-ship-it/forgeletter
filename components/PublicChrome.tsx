import Link from "next/link"
import { auth, signOut } from "@/auth"
import { Brand } from "./Brand"
import { CookiePreferencesLink } from "./CookiePreferencesLink"
import { PublicAccountMenu } from "./PublicAccountMenu"

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "FL"
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

const productLinks = [
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#roadmap", label: "Roadmap" },
  { href: "/about", label: "About Us" },
]

export async function PublicNav() {
  const session = await auth()
  const sessionUser = session?.user as
    | { name?: string | null; email?: string | null }
    | undefined
  const isLoggedIn = Boolean(sessionUser)
  const displayName = sessionUser?.name || sessionUser?.email || "ForgeLetter user"

  async function logoutAction() {
    "use server"
    await signOut({ redirectTo: "/" })
  }

  return (
    <header className="site-nav">
      <div className="container site-nav__inner">
        <Brand />
        <nav className="nav-links" aria-label="Main navigation">
          {productLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          {isLoggedIn ? (
            <PublicAccountMenu
              displayName={displayName}
              initials={getInitials(displayName)}
              logoutAction={logoutAction}
            />
          ) : (
            /* One auth entry point only — Login and Get started led to
               the same flow, so the duplicate button is gone. */
            <Link className="button" href="/auth/login">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export function PublicFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Brand dark />
            <p>
              AI-verified cover letters for job seekers who refuse to send
              generic applications. Every letter passes a strict quality gate
              before you see it.
            </p>
          </div>
          <FooterColumn
            title="Product"
            links={[
              { href: "/#how-it-works", label: "How It Works" },
              { href: "/#pricing", label: "Pricing" },
              { href: "/about", label: "About us" },
              { href: "/contact", label: "Contact" },
            ]}
          />
          <FooterColumn
            title="Account"
            links={[
              { href: "/auth/signup", label: "Create an account" },
              { href: "/auth/login", label: "Sign in" },
              { href: "/dashboard", label: "Dashboard" },
            ]}
          />
          <FooterColumn
            title="Legal"
            links={[
              { href: "/privacy", label: "Privacy policy" },
              { href: "/terms", label: "Terms of service" },
              { href: "/cookies", label: "Cookie policy" },
              { href: "/acceptable-use", label: "Acceptable use" },
              { href: "/refund-policy", label: "Refund policy" },
              { href: "/accessibility", label: "Accessibility" },
              { href: "/imprint", label: "Imprint" },
            ]}
            extra={<CookiePreferencesLink>Cookie preferences</CookiePreferencesLink>}
          />
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} ForgeLetter. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  links,
  extra,
}: {
  title: string
  links: Array<{ href: string; label: string }>
  extra?: React.ReactNode
}) {
  return (
    <div>
      <h3>{title}</h3>
      <div className="footer-links">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        {extra}
      </div>
    </div>
  )
}
