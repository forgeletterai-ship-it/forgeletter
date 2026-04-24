"use client"

import { useState } from "react"

const tones = [
  {
    name: "Professional",
    hint: "Balanced, clear, and business-ready.",
  },
  {
    name: "Warm",
    hint: "Human, approachable, and sincere.",
  },
  {
    name: "Direct",
    hint: "Concise, confident, and low-fluff.",
  },
  {
    name: "Executive",
    hint: "Strategic, senior, and polished.",
  },
]

export function LandingWorkspace() {
  const [tone, setTone] = useState(tones[0].name)
  const [job, setJob] = useState("")
  const [experience, setExperience] = useState("")

  return (
    <div className="workspace-preview">
      <div className="workspace-panel">
        <div className="workspace-toolbar">
          <strong>Draft brief</strong>
          <span className="status-pill active">{tone}</span>
        </div>
        <div className="workspace-body">
          <div className="field-caption">
            <span>Choose tone</span>
            <span>{tone}</span>
          </div>
          <div className="tone-list" role="list" aria-label="Cover letter tone">
            {tones.map((item) => (
              <button
                className={`tone-chip${tone === item.name ? " active" : ""}`}
                key={item.name}
                type="button"
                onClick={() => setTone(item.name)}
                title={item.hint}
              >
                {item.name}
              </button>
            ))}
          </div>

          <div className="landing-workspace">
            <div>
              <div className="field-caption">
                <span>Job posting requirements</span>
                <span>{job.length} chars</span>
              </div>
              <textarea
                value={job}
                onChange={(event) => setJob(event.target.value)}
                placeholder="Paste the responsibilities, requirements, company context, and anything important from the job post."
              />
            </div>
            <div>
              <div className="field-caption">
                <span>Your current experience</span>
                <span>{experience.length} chars</span>
              </div>
              <textarea
                value={experience}
                onChange={(event) => setExperience(event.target.value)}
                placeholder="Add your current role, measurable wins, tools, skills, and why this role fits your next move."
              />
            </div>
          </div>
        </div>
      </div>
      <div className="letter-paper">
        <h3>Premium output area</h3>
        <p>
          The selected tone, job requirements, and experience will feed the
          generator later. For now, this preview keeps the product honest while
          still giving customers a complete, premium setup flow.
        </p>
        <p>
          Selected tone: <strong>{tone}</strong>
        </p>
      </div>
    </div>
  )
}
