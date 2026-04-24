import Link from "next/link"
import { auth } from "@/auth"
import { Brand } from "./Brand"

const productLinks = [
  { href: "/#workspace", label: "Workspace" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/blog", label: "Resources" },
]

export async function PublicNav() {
  const session = await auth()
  const isLoggedIn = Boolean(session?.user)

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
            <>
              <span className="status-pill active">Logged in</span>
              <Link className="button" href="/dashboard">
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link className="button-ghost" href="/auth/login">
                Login
              </Link>
              <Link className="button" href="/auth/signup">
                Start free
              </Link>
            </>
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
              A polished workspace for writing stronger applications without the
              blank page panic. Built for job seekers who want speed and taste.
            </p>
          </div>
          <FooterColumn
            title="Product"
            links={[
              { href: "/#workspace", label: "Workspace" },
              { href: "/#pricing", label: "Pricing" },
              { href: "/dashboard", label: "Dashboard" },
              { href: "/contact", label: "Contact" },
            ]}
          />
          <FooterColumn
            title="Resources"
            links={[
              { href: "/blog", label: "Blog" },
              { href: "/cover-letter-tips", label: "Cover letter tips" },
              { href: "/job-search-guide", label: "Job search guide" },
              { href: "/interview-prep", label: "Interview prep" },
            ]}
          />
          <FooterColumn
            title="Legal"
            links={[
              { href: "/privacy", label: "Privacy policy" },
              { href: "/terms", label: "Terms of service" },
              { href: "/cookies", label: "Cookie policy" },
              { href: "/refund-policy", label: "Refund policy" },
            ]}
          />
        </div>
        <div className="footer-bottom">
          <span>Copyright 2026 LetterForge. All rights reserved.</span>
          <span>Stripe-ready billing. Supabase-ready accounts.</span>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: Array<{ href: string; label: string }>
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
      </div>
    </div>
  )
}
