import { PublicFooter, PublicNav } from "./PublicChrome"

type Section = {
  title: string
  body: string
  points?: string[]
}

export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string
  intro: string
  sections: Section[]
}) {
  return (
    <div className="page-shell">
      <PublicNav />
      <main>
        <section className="page-hero">
          <div className="container">
            <span className="section-kicker">Legal</span>
            <h1>{title}</h1>
            <p>{intro}</p>
          </div>
        </section>
        <section className="container legal-stack">
          {sections.map((section) => (
            <article className="legal-card" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
              {section.points ? (
                <ul>
                  {section.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
