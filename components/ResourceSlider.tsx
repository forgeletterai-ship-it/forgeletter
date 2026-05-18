"use client"

import { useState } from "react"

const resources = [
  {
    title: "Cover letter hooks",
    meta: "3 min read",
    readTime: "3 min read",
    teaser: "Start strong with openers that land.",
    icon: "pen",
    details: [
      "Open with the role, company, and the specific reason the opportunity makes sense.",
      "Avoid generic enthusiasm and use one sharp sentence that signals relevance.",
      "Use the first paragraph to make the hiring manager want to keep reading.",
    ],
  },
  {
    title: "Evidence examples",
    meta: "Quick read",
    readTime: "Quick read",
    teaser: "Prove impact with real, relevant wins.",
    icon: "document",
    details: [
      "Turn responsibilities into measurable outcomes where possible.",
      "Use numbers, scope, tools, and business context to make achievements credible.",
      "Match evidence to the job description instead of listing everything you have done.",
    ],
  },
  {
    title: "Complete cover letter framework",
    meta: "Featured",
    readTime: "8 min read",
    teaser: "A step-by-step system to write sharper, more specific applications.",
    icon: "spark",
    details: [
      "Start with the job brief, then add candidate proof before writing the letter.",
      "Structure each draft around hook, evidence, fit, and confident close.",
      "Review the final version for truth, specificity, tone, and readability.",
    ],
  },
  {
    title: "Tone guide",
    meta: "Quick read",
    readTime: "Quick read",
    teaser: "Write with confidence across any audience.",
    icon: "megaphone",
    details: [
      "Use professional tone for most roles, warm tone for relationship-led teams.",
      "Use direct tone when the application needs brevity and sharper outcomes.",
      "Keep every draft consistent, specific, and easy to refine before sending.",
    ],
  },
  {
    title: "Profile checklist",
    meta: "4 min read",
    readTime: "4 min read",
    teaser: "Make your profile opportunity-ready.",
    icon: "clipboard",
    details: [
      "Save target roles, industries, strengths, and preferred tone.",
      "Add three to five achievements with measurable context.",
      "Keep tools, leadership examples, and motivation ready for reuse.",
    ],
  },
  {
    title: "Interview follow-up",
    meta: "3 min read",
    readTime: "3 min read",
    teaser: "Thoughtful follow-ups that keep you top of mind.",
    icon: "chat",
    details: [
      "Follow up with one short note that adds context instead of pressure.",
      "Reference the role and one specific reason you remain interested.",
      "Keep the message warm, brief, and easy to reply to.",
    ],
  },
  {
    title: "Proposal templates",
    meta: "Quick read",
    readTime: "Quick read",
    teaser: "Reusable templates for focused applications.",
    icon: "download",
    details: [
      "Keep templates flexible so every application still feels specific.",
      "Use placeholders for company context, evidence, and role motivation.",
      "Review each template before sending so it never reads like a mass email.",
    ],
  },
] as const

type Resource = (typeof resources)[number]

function getOffset(index: number, activeIndex: number) {
  const total = resources.length
  const half = Math.floor(total / 2)
  return ((index - activeIndex + total + half) % total) - half
}

function ResourceIcon({ type }: { type: Resource["icon"] }) {
  if (type === "pen") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 24.5 10.5 17 21.7 5.8a3.2 3.2 0 0 1 4.5 4.5L15 21.5 8 24.5Z" />
        <path d="m19.4 8.2 4.4 4.4M10.5 17l4.5 4.5" />
      </svg>
    )
  }

  if (type === "document") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M9 5.5h10l4 4v17H9z" />
        <path d="M19 5.5v4h4M13 15h7M13 19h7M13 23h4" />
      </svg>
    )
  }

  if (type === "megaphone") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M7 18h4l11 5V9L11 14H7z" />
        <path d="m11 18 2 7h4l-2.5-6" />
      </svg>
    )
  }

  if (type === "clipboard") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M11 7h10M12 5.5h8v4h-8z" />
        <path d="M9 8h-2v19h18V8h-2M12 15h8M12 19h8M12 23h5" />
      </svg>
    )
  }

  if (type === "chat") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M7 9.5h18v11H13l-6 5z" />
        <path d="M12 15h.1M16 15h.1M20 15h.1" />
      </svg>
    )
  }

  if (type === "download") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 5v13" />
        <path d="m11 13 5 5 5-5" />
        <path d="M8 24h16" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 5.5 18.3 13l7.7 3-7.7 3L16 26.5 13.7 19 6 16l7.7-3z" />
    </svg>
  )
}

export function ResourceSlider() {
  const [activeIndex, setActiveIndex] = useState(2)
  const [openResource, setOpenResource] = useState<Resource | null>(null)

  const previous = () => {
    setActiveIndex((current) => (current - 1 + resources.length) % resources.length)
  }

  const next = () => {
    setActiveIndex((current) => (current + 1) % resources.length)
  }

  return (
    <div className="resource-slider tips-slider" aria-label="Tips and tricks carousel">
      <div className="tips-stage">
        {resources.map((resource, index) => {
          const offset = getOffset(index, activeIndex)
          const isActive = offset === 0

          return (
            <button
              aria-current={isActive ? "true" : undefined}
              aria-disabled={!isActive}
              className={`tips-card${isActive ? " is-active" : ""}`}
              data-offset={offset}
              disabled={!isActive}
              key={resource.title}
              type="button"
              onClick={() => setOpenResource(resource)}
            >
              <span className="tips-card__icon">
                <ResourceIcon type={resource.icon} />
              </span>
              {isActive ? <span className="tips-card__meta">Click to open</span> : null}
              <strong>{resource.title}</strong>
              <span className="tips-card__rule" aria-hidden="true" />
              <span className="tips-card__teaser">{resource.teaser}</span>
            </button>
          )
        })}
      </div>

      <div className="tips-controls" aria-label="Tips slider controls">
        <button className="tips-control" type="button" onClick={previous} aria-label="Previous tip">
          ←
        </button>
        <span>Explore</span>
        <button className="tips-control" type="button" onClick={next} aria-label="Next tip">
          →
        </button>
      </div>

      {openResource ? (
        <div className="modal-backdrop tips-modal" role="dialog" aria-modal="true">
          <div className="modal-card tips-modal-card">
            <h3>{openResource.title}</h3>
            <p>{openResource.teaser}</p>
            <ul>
              {openResource.details.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="modal-actions">
              <button className="button-secondary" type="button" onClick={() => setOpenResource(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
