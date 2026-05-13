import { PublicFooter, PublicNav } from "@/components/PublicChrome"
import { ContactClient } from "./ContactClient"

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
