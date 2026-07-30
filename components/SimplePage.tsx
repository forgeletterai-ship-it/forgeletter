import Link from "next/link"
import { PublicFooter, PublicNav } from "./PublicChrome"

type Card = {
  title: string
  body: string
}

type SimplePageProps = {
  kicker: string
  title: string
  intro: string
  cards: Card[]
  ctaLabel?: string
  ctaHref?: string
}

export function SimplePage({
  kicker,
  title,
  intro,
  cards,
  // Marketing pages are read overwhelmingly by logged-out visitors —
  // default the CTA to signup, not a dashboard route that bounces
  // them to the login form.
  ctaLabel = "Start free",
  ctaHref = "/auth/signup",
}: SimplePageProps) {
  return (
    <div className="page-shell">
      <PublicNav />
      <main>
        <section className="page-hero">
          <div className="container">
            <span className="section-kicker">{kicker}</span>
            <h1>{title}</h1>
            <p>{intro}</p>
          </div>
        </section>
        <section className="container page-grid">
          {cards.map((card) => (
            <article className="resource-card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </section>
        <section className="cta-band">
          <div className="container">
            <h2>Turn guidance into a real letter.</h2>
            <p>
              Create a free account, add your experience once, and let the
              AI pipeline turn it into role-specific cover letters.
            </p>
            <Link className="button" href={ctaHref}>
              {ctaLabel}
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
