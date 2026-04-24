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
  ctaLabel = "Open dashboard",
  ctaHref = "/dashboard",
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
            <h2>Keep the product moving.</h2>
            <p>
              The shell is ready for the next layer: real generation,
              persistence, exports, and checkout.
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
