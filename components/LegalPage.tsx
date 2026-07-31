import type { ReactNode } from "react"

type Section = {
  title: string
  body: string
  points?: string[]
  table?: {
    headers: string[]
    rows: string[][]
  }
}

/**
 * Linkify emails and URLs inside plain legal prose. Legal pages store
 * their content as strings; without this, the ODR-platform URL, DPA
 * links, and every contact address rendered as dead text the reader
 * had to copy by hand.
 */
const LINK_PATTERN =
  /(https?:\/\/[^\s,;)]+[^\s.,;)])|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g

function linkify(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  const re = new RegExp(LINK_PATTERN)
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.includes("@") && !token.startsWith("http")) {
      nodes.push(
        <a key={`${token}-${match.index}`} href={`mailto:${token}`}>
          {token}
        </a>
      )
    } else {
      nodes.push(
        <a
          key={`${token}-${match.index}`}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
        >
          {token}
        </a>
      )
    }
    lastIndex = match.index + token.length
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }
  return nodes
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
        <p>{linkify(intro)}</p>
      </header>
      <div className="legal-stack">
        {sections.map((section) => (
          <section className="legal-card" key={section.title}>
            <h2>{section.title}</h2>
            <p>{linkify(section.body)}</p>
            {section.points ? (
              <ul>
                {section.points.map((point) => (
                  <li key={point}>{linkify(point)}</li>
                ))}
              </ul>
            ) : null}
            {section.table ? (
              <div className="legal-table__scroll">
                <table className="legal-table">
                  <thead>
                    <tr>
                      {section.table.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row, rowIndex) => (
                      <tr key={`${section.title}-row-${rowIndex}`}>
                        {row.map((cell, cellIndex) => (
                          <td key={`${section.title}-cell-${rowIndex}-${cellIndex}`}>
                            {linkify(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  )
}
