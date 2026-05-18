"use client"

import { useState } from "react"

const tones = [
  {
    name: "Professional",
    detail: "Clear, polished, and suitable for most roles.",
  },
  {
    name: "Warm",
    detail: "More human and relational for culture-led companies.",
  },
  {
    name: "Direct",
    detail: "Short, confident, and outcome-focused.",
  },
]

export function DashboardWorkspace() {
  const [tone, setTone] = useState(tones[0].name)

  return (
    <div className="dashboard-workspace">
      <section className="dashboard-card">
        <h3>Draft inputs</h3>
        <p>
          Designed for focused applications, reusable evidence, and a smoother
          workflow from role brief to final letter.
        </p>

        <div className="form-stack" style={{ marginTop: 18 }}>
          <div>
            <div className="field-caption">
              <span>Tone preset</span>
              <span>{tone}</span>
            </div>
            <div className="tone-card-grid">
              {tones.map((item) => (
                <button
                  className={`tone-card${tone === item.name ? " active" : ""}`}
                  key={item.name}
                  type="button"
                  onClick={() => setTone(item.name)}
                >
                  <strong>{item.name}</strong>
                  <span>{item.detail}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="role">Target role</label>
            <input id="role" placeholder="Senior Marketing Manager at Spotify" />
          </div>
          <div className="field">
            <label htmlFor="job">Job description and requirements</label>
            <textarea
              id="job"
              placeholder="Paste responsibilities, requirements, company details, and keywords from the posting."
            />
          </div>
          <div className="field">
            <label htmlFor="background">Candidate experience</label>
            <textarea
              id="background"
              placeholder="Add current role, measurable wins, strengths, tools, and motivation for this job."
            />
          </div>

          <button className="button-soft" type="button">
            Save polished brief
          </button>
        </div>
      </section>

      <aside className="dashboard-card">
        <h3>Output preview</h3>
        <p>
          Your generated letter appears here with the actions you need to move
          from draft to application-ready.
        </p>
        <ul className="check-list">
          <li>Copy polished text</li>
          <li>Save version to history</li>
          <li>Export as PDF</li>
          <li>Mark application status</li>
        </ul>
        <div className="partnership-note">
          <h3>Agency-ready direction</h3>
          <p>
            The next professional layer should add candidate profiles, advisor
            review, shared templates, and workspace permissions.
          </p>
        </div>
      </aside>
    </div>
  )
}
