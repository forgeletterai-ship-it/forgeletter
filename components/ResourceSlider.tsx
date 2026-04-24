"use client"

import { useState } from "react"

const resources = [
  {
    title: "Cover letter structure",
    teaser: "A premium letter needs a strong hook, proof, fit, and close.",
    details: [
      "Open with the specific role and the business reason you care about it.",
      "Use one achievement with a measurable result instead of broad claims.",
      "Connect your experience to the role requirements in plain language.",
      "Close with confidence and a clear reason to continue the conversation.",
    ],
  },
  {
    title: "Career agency workflow",
    teaser: "How partners can use LetterForge with many candidates.",
    details: [
      "Create a profile for each candidate with repeatable strengths and proof.",
      "Use the dashboard to manage briefs, status, and draft versions.",
      "Keep agency review before any candidate sends a final application.",
      "Add team roles and shared templates later when partnerships mature.",
    ],
  },
  {
    title: "What to save in profile",
    teaser: "The better the profile, the stronger every future draft becomes.",
    details: [
      "Current title, target roles, industries, and seniority level.",
      "Three to five measurable achievements with business outcomes.",
      "Tools, methods, leadership examples, and working style.",
      "Personal motivation that sounds human but remains professional.",
    ],
  },
  {
    title: "Launch checklist",
    teaser: "Before AI, payments, and partnerships go live.",
    details: [
      "Confirm Supabase RLS on all user-owned tables.",
      "Keep service role keys and AI keys server-side only.",
      "Wire Stripe checkout and webhooks before taking payments.",
      "Add rate limits, export controls, and clear data deletion rules.",
    ],
  },
]

export function ResourceSlider() {
  const [active, setActive] = useState<(typeof resources)[number] | null>(null)

  return (
    <div className="resource-slider">
      <div className="resource-track">
        {resources.map((resource) => (
          <button
            className="resource-card resource-slide"
            key={resource.title}
            type="button"
            onClick={() => setActive(resource)}
          >
            <span className="section-kicker">Resource</span>
            <h3>{resource.title}</h3>
            <p>{resource.teaser}</p>
          </button>
        ))}
      </div>

      {active ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <span className="section-kicker">Resource brief</span>
            <h3>{active.title}</h3>
            <p>{active.teaser}</p>
            <ul>
              {active.details.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="modal-actions">
              <button className="button-secondary" type="button" onClick={() => setActive(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
