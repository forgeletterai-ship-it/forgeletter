"use client"

import type { ReactNode } from "react"
import { useState } from "react"

/**
 * Controlled three-way comparison: Human (blank page), ChatGPT (a
 * genuinely competent generic attempt — not a strawman), and
 * ForgeLetter. The difference on display is density of proof, not
 * volume: all three letters per role run 88–96 words, and each card
 * shows its exact count.
 *
 * Illustrative comparisons with fictional companies. Never attribute
 * invented letters or metrics to real employers.
 */

type AnnotationKind = "flaw" | "win"

interface Annotation {
  /** Must appear VERBATIM in the letter text — it gets highlighted. */
  phrase: string
  note: string
  kind: AnnotationKind
}

type SwapVerdict = "fails" | "borderline" | "passes"

interface ComparisonCard {
  source: "Human" | "ChatGPT" | "ForgeLetter AI"
  sub: string
  text: string
  annotations: Annotation[]
  metrics: {
    claims: string
    company: string
    swap: string
    swapVerdict: SwapVerdict
  }
}

interface RoleExample {
  role: string
  company: string
  jobSnippet: string
  cards: [ComparisonCard, ComparisonCard, ComparisonCard]
}

const examples: RoleExample[] = [
  {
    role: "Product Manager",
    company: "Music-streaming scale-up · Berlin",
    jobSnippet:
      "Senior Product Manager — Growth (Berlin, hybrid). Own free-to-paid conversion across web and mobile. Run experiments end-to-end with design and data, and present results to leadership monthly.",
    cards: [
      {
        source: "Human",
        sub: "Blank-page attempt",
        text: "Dear Hiring Manager, I am writing to apply for the Product Manager position at your company. I have always been passionate about music and technology, so this role feels like a perfect fit for me. I am hardworking, motivated, and a fast learner, and my colleagues would describe me as a real team player. In my current job I am responsible for many different projects and tasks. I believe my skills and enthusiasm would make me a valuable addition to your team. I would welcome the chance to discuss further.",
        annotations: [
          {
            phrase: "passionate about music and technology",
            note: "Passion is a feeling, not evidence — hundreds of applicants open with this exact sentence.",
            kind: "flaw",
          },
          {
            phrase: "hardworking, motivated, and a fast learner",
            note: "Self-ratings carry no weight; nothing here can be checked by the reader.",
            kind: "flaw",
          },
          {
            phrase: "responsible for many different projects and tasks",
            note: "Responsibility without outcomes tells the hiring manager nothing actually happened.",
            kind: "flaw",
          },
        ],
        metrics: {
          claims: "0",
          company: "None",
          swap: "Fails — fits any company",
          swapVerdict: "fails",
        },
      },
      {
        source: "ChatGPT",
        sub: "Generic prompt, redone twice",
        text: "Dear Hiring Manager, I'm excited to apply for the Senior Product Manager role. As a product manager with over six years of experience in consumer subscription apps, I've led cross-functional teams through discovery, experimentation, and launch. I admire how your platform has made streaming more personal, and I'd love to bring my growth mindset to your conversion challenges. In my current role I improved onboarding, strengthened retention, and partnered closely with design and engineering. I'm confident my analytical approach and collaborative style would make an immediate impact in Berlin.",
        annotations: [
          {
            phrase: "over six years of experience",
            note: "Fluent and well-structured — but the years are the only number, and they measure time served, not results.",
            kind: "flaw",
          },
          {
            phrase: "made streaming more personal",
            note: "Praise at category level: swap in any streaming brand and the sentence survives.",
            kind: "flaw",
          },
          {
            phrase: "improved onboarding, strengthened retention",
            note: "Three verbs, zero baselines — the reader can't tell a 2% lift from a 40% one.",
            kind: "flaw",
          },
        ],
        metrics: {
          claims: "1 — years only",
          company: "Category praise only",
          swap: "Fails — fits any streaming app",
          swapVerdict: "fails",
        },
      },
      {
        source: "ForgeLetter AI",
        sub: "Built from a real profile",
        text: "Dear Hiring Manager, Chorusline's move to bundle Daily Mix with the family plan is exactly the conversion problem I've spent two years on. At my current app, I owned free-to-paid activation: 11 experiments over two quarters lifted trial starts from 6.1% to 8.4%. The first three tests failed outright — the real win came from re-ordering the paywall, not redesigning it. I also cut time-to-first-playlist from 4 days to 90 minutes, which doubled week-two retention on that cohort. I'd bring that same evidence-first pace to your Berlin growth team.",
        annotations: [
          {
            phrase: "bundle Daily Mix with the family plan",
            note: "Opens with a named, current company decision — provably researched, impossible to swap.",
            kind: "win",
          },
          {
            phrase: "lifted trial starts from 6.1% to 8.4%",
            note: "Baseline and result, checkable in an interview — like the 11 experiments and 4 days → 90 minutes.",
            kind: "win",
          },
          {
            phrase: "The first three tests failed outright",
            note: "An admitted failure reads human and makes the wins credible.",
            kind: "win",
          },
        ],
        metrics: {
          claims: "4 — all checkable",
          company: "Named product decision",
          swap: "Passes — only works here",
          swapVerdict: "passes",
        },
      },
    ],
  },
  {
    role: "Marketing Manager",
    company: "Travel booking platform · Amsterdam",
    jobSnippet:
      "Marketing Manager — Lifecycle (Amsterdam). Own email and in-app campaigns across 14 markets. The brief: raise repeat bookings without raising discount spend. Reports to the Head of Growth.",
    cards: [
      {
        source: "Human",
        sub: "Blank-page attempt",
        text: "Dear Hiring Manager, I would like to apply for the Marketing Manager position. Travel has always been a big passion of mine, and I love creating campaigns that inspire people. I am a creative and organised person with strong communication skills, and I work very well in teams. In my current position I manage social media, newsletters, and many other marketing activities. I am sure that my energy and fresh ideas would be a great addition to your marketing department. Thank you for considering my application, and I hope to hear from you soon.",
        annotations: [
          {
            phrase: "Travel has always been a big passion of mine",
            note: "Loving travel doesn't sell trips — every applicant to this role says it.",
            kind: "flaw",
          },
          {
            phrase: "creative and organised person",
            note: "Adjectives about yourself, checkable by no one.",
            kind: "flaw",
          },
          {
            phrase: "many other marketing activities",
            note: "A list of duties with no outcome attached to any of them.",
            kind: "flaw",
          },
        ],
        metrics: {
          claims: "0",
          company: "None",
          swap: "Fails — fits any company",
          swapVerdict: "fails",
        },
      },
      {
        source: "ChatGPT",
        sub: "Generic prompt, redone twice",
        text: "Dear Hiring Manager, I'm writing to apply for the Marketing Manager role. With eight years in digital marketing, including five in lifecycle and CRM, I've built segmented campaigns across email, push, and in-app channels. Your platform's focus on effortless trip planning resonates with me, and I believe loyalty is won in the moments after the first booking. In my current role I redesigned our email program, grew engagement significantly, and launched win-back campaigns that outperformed benchmarks. I'd welcome the chance to bring this experience to Amsterdam and help deepen customer relationships.",
        annotations: [
          {
            phrase: "eight years in digital marketing",
            note: "Solid structure and a real point of view — but experience is measured in years, not outcomes.",
            kind: "flaw",
          },
          {
            phrase: "grew engagement significantly",
            note: "\"Significantly\" is doing all the work: no baseline, no number.",
            kind: "flaw",
          },
          {
            phrase: "outperformed benchmarks",
            note: "Which benchmarks? Unverifiable comparisons read as filler to hiring managers.",
            kind: "flaw",
          },
        ],
        metrics: {
          claims: "2 — years only",
          company: "Category praise only",
          swap: "Borderline — fits any travel brand",
          swapVerdict: "borderline",
        },
      },
      {
        source: "ForgeLetter AI",
        sub: "Built from a real profile",
        text: "Dear Hiring Manager, Fjordway's brief — raise repeat bookings without raising discount spend — is the exact problem I solved last year. I rebuilt our post-trip lifecycle across 9 markets: a three-email arc tied to the traveller's next school holiday, not our sales calendar. Repeat bookings rose 19% in six months while discount cost per booking fell 8%. My first attempt, a generic points push, flatlined for two months before I scrapped it. I also cut unsubscribe rates from 1.9% to 0.7% by capping frequency. I'd apply the same discipline to your 14 markets.",
        annotations: [
          {
            phrase: "raise repeat bookings without raising discount spend",
            note: "Mirrors the job posting's own words back — the reader knows this letter was written for them.",
            kind: "win",
          },
          {
            phrase: "rose 19% in six months while discount cost per booking fell 8%",
            note: "Two linked numbers that answer the brief directly — plus 1.9% → 0.7% on unsubscribes.",
            kind: "win",
          },
          {
            phrase: "flatlined for two months before I scrapped it",
            note: "An admitted dead end — proof the wins are measured, not decorated.",
            kind: "win",
          },
        ],
        metrics: {
          claims: "5 — all checkable",
          company: "Quotes the actual brief",
          swap: "Passes — only works here",
          swapVerdict: "passes",
        },
      },
    ],
  },
  {
    role: "Software Engineer",
    company: "Precision-engineering firm · Eindhoven",
    jobSnippet:
      "Software Engineer — Machine Control (Eindhoven). Maintain and extend the motion-control stack for optical measurement systems. C++ and Python; safety-critical mindset; on-site lab work with hardware engineers.",
    cards: [
      {
        source: "Human",
        sub: "Blank-page attempt",
        text: "Dear Hiring Manager, I am applying for the Software Engineer position at your company. I have always loved technology and solving difficult problems, which is why I studied computer science. I know several programming languages including Python, C++, and JavaScript, and I pick up new tools quickly. I am a hard worker, a good communicator, and I enjoy being part of a team. I am very interested in what your company does and would love the opportunity to grow as an engineer there. Please find my CV attached, and thank you for your time.",
        annotations: [
          {
            phrase: "always loved technology and solving difficult problems",
            note: "The opening line of thousands of engineering letters — it filters nothing.",
            kind: "flaw",
          },
          {
            phrase: "several programming languages",
            note: "Lists tools without a single thing built with them.",
            kind: "flaw",
          },
          {
            phrase: "very interested in what your company does",
            note: "Doesn't name what the company does — the sentence proves the opposite.",
            kind: "flaw",
          },
        ],
        metrics: {
          claims: "0",
          company: "None",
          swap: "Fails — fits any company",
          swapVerdict: "fails",
        },
      },
      {
        source: "ChatGPT",
        sub: "Generic prompt, redone twice",
        text: "Dear Hiring Manager, I'm applying for the Software Engineer position on your machine-control team. I have five years of experience writing C++ and Python for industrial applications, with a focus on reliability and clean architecture. Precision engineering demands software that behaves predictably under real-world conditions, and that standard has shaped how I test and document my work. In my current role I develop control software, collaborate with hardware teams, and contribute to code reviews. I would be glad to bring my rigour and curiosity to Eindhoven and to grow with your engineering organisation.",
        annotations: [
          {
            phrase: "five years of experience writing C++ and Python",
            note: "Reads well and names the right stack — but activity isn't achievement.",
            kind: "flaw",
          },
          {
            phrase: "behaves predictably under real-world conditions",
            note: "A sound principle any applicant can state; nothing anchors it to their own code.",
            kind: "flaw",
          },
          {
            phrase: "develop control software, collaborate with hardware teams",
            note: "Verbs in the present tense, outcomes absent.",
            kind: "flaw",
          },
        ],
        metrics: {
          claims: "1 — years only",
          company: "Sector-level only",
          swap: "Fails — fits any industrial firm",
          swapVerdict: "fails",
        },
      },
      {
        source: "ForgeLetter AI",
        sub: "Built from a real profile",
        text: "Dear Hiring Manager, Aldervelt's move to in-house motion control for its interferometer line is the kind of work I want to own. On my current team I maintain a C++ stack driving 12 measurement stations: I cut positioning jitter from 40 to 9 microns by rewriting the feedback loop, then spent six weeks chasing a thermal drift bug I had initially dismissed — the fix halved our calibration rejects. My Python tooling now flags faults before operators see them, trimming unplanned stops 23%. I'd bring that lab-floor patience to Eindhoven.",
        annotations: [
          {
            phrase: "in-house motion control for its interferometer line",
            note: "Names the company's actual engineering direction — researched, not templated.",
            kind: "win",
          },
          {
            phrase: "cut positioning jitter from 40 to 9 microns",
            note: "Concrete, domain-correct numbers an interviewer can probe — with 12 stations and 23% alongside.",
            kind: "win",
          },
          {
            phrase: "a thermal drift bug I had initially dismissed",
            note: "Six weeks on a mistake, admitted plainly — credibility no adjective can buy.",
            kind: "win",
          },
        ],
        metrics: {
          claims: "4 — all checkable",
          company: "Named product line",
          swap: "Passes — only works here",
          swapVerdict: "passes",
        },
      },
    ],
  },
]

const METRIC_LABELS = {
  claims: "Verifiable claims",
  company: "Company-specific details",
  swap: "Passes swap test",
} as const

function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => /[A-Za-z0-9]/.test(token)).length
}

/**
 * Renders letter text with each annotation phrase wrapped in a
 * highlighted <mark> carrying a numbered marker that matches its
 * callout.
 */
function highlightText(text: string, annotations: Annotation[]): ReactNode[] {
  const nodes: ReactNode[] = []
  let rest = text
  let key = 0
  let guard = 0
  while (rest.length > 0 && guard < 40) {
    guard += 1
    let best: { at: number; annotation: Annotation; index: number } | null = null
    annotations.forEach((annotation, index) => {
      const at = rest.indexOf(annotation.phrase)
      if (at !== -1 && (best === null || at < best.at)) {
        best = { at, annotation, index }
      }
    })
    if (!best) {
      nodes.push(rest)
      break
    }
    const { at, annotation, index } = best as {
      at: number
      annotation: Annotation
      index: number
    }
    if (at > 0) nodes.push(rest.slice(0, at))
    nodes.push(
      <mark
        className={`exv2-hl exv2-hl--${annotation.kind}`}
        key={`hl-${(key += 1)}`}
      >
        {annotation.phrase}
        <sup aria-hidden="true">{index + 1}</sup>
      </mark>
    )
    rest = rest.slice(at + annotation.phrase.length)
  }
  return nodes
}

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

function SwapDot({ verdict }: { verdict: SwapVerdict }) {
  return <span className={`exv2-swap-dot exv2-swap-dot--${verdict}`} aria-hidden="true" />
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

        {/* Read BEFORE the comparison, not after it. */}
        <p className="exv2-disclaimer">
          Illustrative comparisons with fictional companies — your letters are
          built from your own profile and the real job posting.
        </p>

        <div className="examples-coming">
          <span className="examples-coming-icon">
            <SparkIcon />
          </span>
          <div>
            <strong>ForgeLetter works across every industry and seniority level.</strong>
            <p>From first internship to C-suite.</p>
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
              {active.role} <span>· {active.company}</span>
            </h3>
            <p>Three letters, one brief, equal length — the difference is proof.</p>
          </div>
        </header>

        {/* Shared anchor: the brief all three letters answer. */}
        <div className="exv2-brief" aria-label="The job brief all three letters answer">
          <span className="exv2-brief__label">The brief</span>
          <p>{active.jobSnippet}</p>
        </div>

        <div className="exv2-stack">
          {active.cards.map((card) => (
            <article
              className={`exv2-card${card.source === "ForgeLetter AI" ? " exv2-card--forge" : ""}`}
              key={`${active.role}-${card.source}`}
            >
              <header className="exv2-card__head">
                <div>
                  <h4>{card.source}</h4>
                  <span className="exv2-card__sub">{card.sub}</span>
                </div>
                <span className="exv2-wordcount">{countWords(card.text)} words</span>
              </header>

              <div className="exv2-card__body">
                <div className="exv2-letter">
                  <p>{highlightText(card.text, card.annotations)}</p>
                </div>

                <aside className="exv2-callouts" aria-label={`${card.source} annotations`}>
                  {card.annotations.map((annotation, index) => (
                    <div
                      className={`exv2-callout exv2-callout--${annotation.kind}`}
                      key={annotation.phrase}
                    >
                      <span className="exv2-callout__num">{index + 1}</span>
                      <p>{annotation.note}</p>
                    </div>
                  ))}
                </aside>
              </div>

              <dl className="exv2-metrics">
                <div className="exv2-metric">
                  <dt>{METRIC_LABELS.claims}</dt>
                  <dd>{card.metrics.claims}</dd>
                </div>
                <div className="exv2-metric">
                  <dt>{METRIC_LABELS.company}</dt>
                  <dd>{card.metrics.company}</dd>
                </div>
                <div className="exv2-metric">
                  <dt>{METRIC_LABELS.swap}</dt>
                  <dd>
                    <SwapDot verdict={card.metrics.swapVerdict} />
                    {card.metrics.swap}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
