import type { Metadata } from "next"
import { PublicFooter, PublicNav } from "@/components/PublicChrome"
import { ContactClient } from "./ContactClient"

export const metadata: Metadata = {
  title: "Contact support",
  description:
    "Get help with your ForgeLetter account, billing, data requests, partnerships, or product feedback.",
  alternates: {
    canonical: "/contact",
  },
}

export default function ContactPage() {
  return (
    <div className="page-shell">
      <PublicNav />
      <main>
        <section className="page-hero">
          <div className="container">
            <span className="section-kicker">Contact</span>
            <h1>Talk to ForgeLetter.</h1>
            <p>
              Get help with accounts, billing, data, partnerships, or product
              feedback. Messages are stored securely and routed to the support
              team.
            </p>
          </div>
        </section>
        <ContactClient />
      </main>
      <PublicFooter />
    </div>
  )
}
