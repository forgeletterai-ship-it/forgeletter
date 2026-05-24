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
    <article className="legal-document">
      <header className="legal-document__head">
        <span className="section-kicker">Legal</span>
        <h1>{title}</h1>
        <p>{intro}</p>
      </header>
      <div className="legal-stack">
        {sections.map((section) => (
          <section className="legal-card" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
            {section.points ? (
              <ul>
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  )
}
