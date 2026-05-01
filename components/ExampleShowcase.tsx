"use client"

import { useState } from "react"

const examples = [
  {
    role: "Product Manager",
    company: "Spotify Berlin",
    subtitle: "Compare how the same prompt is answered.",
    human:
      "I am applying because I believe I am a good fit. I am hardworking, motivated, and have many skills that match the role.",
    chatgpt:
      "I am excited about Spotify because of its innovation in music streaming and user experience. My product strategy background would help drive growth.",
    forge:
      "I am excited about this Product Manager role because it blends user discovery, commercial judgement, and cross-functional execution, areas where I have consistently delivered impact.\n\nIn my last role, I led a checkout improvement project that increased completion by 14% through data-backed experiments and close work with design and engineering.",
    insight: "Tailored to the role with measurable evidence and clear value.",
  },
  {
    role: "Marketing Manager",
    company: "Booking.com",
    subtitle: "Compare how the same brief changes with better context.",
    human:
      "I would like to apply for the Marketing Manager position. I am creative, organised, and good at working with teams.",
    chatgpt:
      "I am excited about Booking.com because I enjoy building campaigns that connect with customers and support brand objectives.",
    forge:
      "I am drawn to this Marketing Manager role because Booking.com needs campaigns that are commercially sharp and genuinely useful for travellers.\n\nAcross recent lifecycle campaigns, I increased qualified engagement by 22% by pairing audience research with channel-specific messaging and weekly performance reviews.",
    insight: "Connects marketing outcomes to customer behaviour and proof.",
  },
  {
    role: "Software Engineer",
    company: "ASML Eindhoven",
    subtitle: "Compare a generic application with a role-specific narrative.",
    human:
      "I am interested in the Software Engineer job because I like technology and solving problems. I have coding experience and learn quickly.",
    chatgpt:
      "I am excited to apply for ASML. My technical skills, teamwork, and passion for engineering make me a strong candidate.",
    forge:
      "I am excited by this Software Engineer role because ASML sits at the intersection of precision engineering, resilient software, and high-stakes collaboration.\n\nIn my recent work, I improved a production data pipeline by reducing processing failures by 31% and adding clearer diagnostics for engineering teams.",
    insight: "Turns technical experience into credible operating evidence.",
  },
] as const

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M11.5 10V7.8c0-1.2.9-2.1 2.1-2.1h4.8c1.2 0 2.1.9 2.1 2.1V10" />
      <rect x="5.5" y="10" width="21" height="15.5" rx="2.5" />
      <path d="M5.8 15.8h20.4" />
      <path d="M14 16.2h4" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="m16 4 2.8 8.1L27 15l-8.2 2.9L16 26l-2.8-8.1L5 15l8.2-2.9L16 4Z" />
      <path d="m7.5 22.5 1.2 3.1 3.1 1.2-3.1 1.2-1.2 3.1-1.2-3.1-3.1-1.2 3.1-1.2 1.2-3.1Z" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.8v5" />
      <path d="M12 7.4h.01" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.2 12.3 2.4 2.4 5.2-5.5" />
    </svg>
  )
}

export function ExampleShowcase() {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = examples[activeIndex]

  return (
    <div className="examples-showcase">
      <aside className="examples-role-list" aria-label="Example roles">
        <div className="examples-role-stack">
          {examples.map((example, index) => (
            <button
              aria-pressed={activeIndex === index}
              className={`examples-role-card${activeIndex === index ? " is-active" : ""}`}
              key={example.role}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <span>
                <strong>{example.role}</strong>
                <em>{example.company}</em>
              </span>
              <span className="examples-role-arrow">&rsaquo;</span>
            </button>
          ))}
        </div>

        <div className="examples-coming">
          <span className="examples-coming-icon">
            <SparkIcon />
          </span>
          <div>
            <strong>More roles coming soon.</strong>
            <p>We&apos;re adding new examples regularly.</p>
          </div>
        </div>
      </aside>

      <section className="examples-detail" aria-live="polite">
        <header className="examples-detail-head">
          <span className="examples-detail-icon">
            <BriefcaseIcon />
          </span>
          <div>
            <h3>
              {active.role} <span>at {active.company}</span>
            </h3>
            <p>{active.subtitle}</p>
          </div>
        </header>

        <div className="examples-comparison-grid">
          <article className="examples-response-card">
            <div className="examples-response-head">
              <h4>Human</h4>
              <span>Typical response</span>
            </div>
            <p>{active.human}</p>
            <div className="examples-note">
              <InfoIcon />
              <div>
                <strong>Too generic</strong>
                <span>Doesn&apos;t show specific value or impact.</span>
              </div>
            </div>
          </article>

          <article className="examples-response-card">
            <div className="examples-response-head">
              <h4>ChatGPT</h4>
              <span>Typical response</span>
            </div>
            <p>{active.chatgpt}</p>
            <div className="examples-note">
              <InfoIcon />
              <div>
                <strong>Better, but still broad</strong>
                <span>Lacks personal context and proof.</span>
              </div>
            </div>
          </article>

          <article className="examples-response-card examples-response-card--ai">
            <div className="examples-response-head">
              <h4>ForgeLetter AI</h4>
              <span>Our AI Engine</span>
            </div>
            {active.forge.split("\n\n").map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <div className="examples-note examples-note--success">
              <CheckIcon />
              <div>
                <strong>Specific, credible, and impactful</strong>
                <span>{active.insight}</span>
              </div>
            </div>
          </article>
        </div>

        <footer className="examples-footnote">
          <span>
            <CheckIcon />
          </span>
          All examples are generated in real-time using the same prompt.
        </footer>
      </section>
    </div>
  )
}
