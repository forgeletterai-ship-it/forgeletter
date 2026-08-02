/**
 * Landing-page product roadmap board — replaces the old Tips & tricks
 * carousel. Three columns (Now / Next / Later), each with four cards:
 * icon, title, one-line description, status chip. A footer bar carries
 * the "living document" disclaimer and a real feature-request CTA
 * (mailto — no dead controls).
 *
 * Content rule: every item must describe the actual service (grounded
 * letters, profiles, PDF templates, job-ad analysis) — no invented
 * enterprise claims, no dates promised.
 */

type IconName =
  | "layers"
  | "globe"
  | "upload"
  | "scan"
  | "chat"
  | "puzzle"
  | "users"

interface RoadmapItem {
  icon: IconName
  title: string
  body: string
}

interface RoadmapColumn {
  key: "now" | "next" | "later"
  title: string
  sub: string
  chip: string
  items: RoadmapItem[]
}

const COLUMNS: RoadmapColumn[] = [
  {
    key: "now",
    title: "Now",
    sub: "In progress",
    chip: "In progress",
    items: [],
  },
  {
    key: "next",
    title: "Next",
    sub: "In the coming months",
    chip: "Planned",
    items: [
      {
        icon: "layers",
        title: "More premium templates",
        body: "New PDF designs to choose from, every one rendered with the same exact preview.",
      },
      {
        icon: "upload",
        title: "CV import",
        body: "Build your profile in one step by importing your CV — you review, we structure.",
      },
      {
        icon: "scan",
        title: "Smarter job-ad analysis",
        body: "Deeper extraction of requirements, keywords, and hiring signals from every job description.",
      },
    ],
  },
  {
    key: "later",
    title: "Later",
    sub: "Future planning",
    chip: "Future",
    items: [
      {
        icon: "globe",
        title: "Multi-language letters",
        body: "Generate your letter in the language of the job ad, with the same grounding rules.",
      },
      {
        icon: "chat",
        title: "Interview preparation",
        body: "Turn each letter and job ad into the questions you are most likely to be asked.",
      },
      {
        icon: "puzzle",
        title: "Browser extension",
        body: "Generate straight from the job posting page — no copy-paste.",
      },
      {
        icon: "users",
        title: "Coach workspaces",
        body: "Shared spaces for career coaches and universities supporting many candidates.",
      },
    ],
  },
]

function RoadmapIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    layers: (
      <>
        <path d="M12 3l9 4.8-9 4.8-9-4.8z" />
        <path d="M3.6 12.4L12 16.9l8.4-4.5" />
        <path d="M3.6 16.6L12 21.1l8.4-4.5" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9.2" />
        <path d="M2.8 12h18.4" />
        <path d="M12 2.8c2.6 2.6 3.9 5.7 3.9 9.2s-1.3 6.6-3.9 9.2c-2.6-2.6-3.9-5.7-3.9-9.2s1.3-6.6 3.9-9.2z" />
      </>
    ),
    upload: (
      <>
        <path d="M4 16.5v2a2.5 2.5 0 0 0 2.5 2.5h11a2.5 2.5 0 0 0 2.5-2.5v-2" />
        <path d="M12 15.5V4" />
        <path d="M7.5 8.2L12 3.6l4.5 4.6" />
      </>
    ),
    scan: (
      <>
        <path d="M3.5 8V5.5a2 2 0 0 1 2-2H8" />
        <path d="M16 3.5h2.5a2 2 0 0 1 2 2V8" />
        <path d="M20.5 16v2.5a2 2 0 0 1-2 2H16" />
        <path d="M8 20.5H5.5a2 2 0 0 1-2-2V16" />
        <circle cx="11.4" cy="11.4" r="3.4" />
        <path d="M13.9 13.9l2.6 2.6" />
      </>
    ),
    chat: (
      <>
        <path d="M20.5 12a8.5 8.5 0 0 1-12.4 7.5L3.5 21l1.6-4.4A8.5 8.5 0 1 1 20.5 12z" />
        <path d="M9.8 9.7a2.3 2.3 0 0 1 4.5.7c0 1.5-2.2 1.8-2.2 3" />
        <path d="M12.1 16.3h.01" />
      </>
    ),
    puzzle: (
      <>
        <path d="M9.5 4.5a2 2 0 1 1 4 0H17a1.5 1.5 0 0 1 1.5 1.5v3.5a2 2 0 1 0 0 4V17a1.5 1.5 0 0 1-1.5 1.5h-3.5a2 2 0 1 1-4 0H6A1.5 1.5 0 0 1 4.5 17v-3.5a2 2 0 1 1 0-4V6A1.5 1.5 0 0 1 6 4.5z" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8.2" r="3.4" />
        <path d="M2.8 20.2c.7-3.2 3.2-5 6.2-5s5.5 1.8 6.2 5" />
        <circle cx="17" cy="9.4" r="2.6" />
        <path d="M16.2 15.3c2.6.2 4.4 1.8 5 4.3" />
      </>
    ),
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function ColumnHeadIcon({ column }: { column: RoadmapColumn["key"] }) {
  if (column === "now") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9.2" />
        <path d="M8.6 12.2l2.3 2.3 4.5-5" />
      </svg>
    )
  }
  if (column === "next") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path d="M3.5 9.5h17" />
        <path d="M8.2 2.8V6M15.8 2.8V6" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" />
      <path d="M12 6.8V12l3.4 2" />
    </svg>
  )
}

export function ProductRoadmap() {
  return (
    <div className="roadmap-board">
      <div className="roadmap-grid">
        {COLUMNS.map((col) => (
          <div className={`roadmap-col roadmap-col--${col.key}`} key={col.key}>
            <div className="roadmap-col__head">
              <span className="roadmap-col__icon">
                <ColumnHeadIcon column={col.key} />
              </span>
              <span>
                <span className="roadmap-col__title">{col.title}</span>
                <span className="roadmap-col__sub">{col.sub}</span>
              </span>
            </div>
            <div className="roadmap-cards">
              {col.items.length === 0 ? (
                <div className="roadmap-empty">
                  <span className="roadmap-empty__mark" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9.2" />
                      <path d="M8.6 12.2l2.3 2.3 4.5-5" />
                    </svg>
                  </span>
                  <p>
                    Nothing in flight right now — the next builds move in from
                    the <b>Next</b> column.
                  </p>
                </div>
              ) : (
                col.items.map((item) => (
                  <article className="roadmap-card" key={item.title}>
                    <span className="roadmap-card__icon">
                      <RoadmapIcon name={item.icon} />
                    </span>
                    <div className="roadmap-card__body">
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                      <span className="roadmap-chip">{col.chip}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="roadmap-foot">
        <div className="roadmap-foot__item">
          <span className="roadmap-foot__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 21V4.5" />
              <path d="M5 4.5c4.8-2.6 9.2 2.6 14 0v9.5c-4.8 2.6-9.2-2.6-14 0" />
            </svg>
          </span>
          <p>
            <b>This roadmap is a living document.</b> Priorities evolve with
            customer feedback and what makes your letters measurably better.
          </p>
        </div>
        <div className="roadmap-foot__item">
          <span className="roadmap-foot__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14.5" rx="2" />
              <path d="M3.5 6.5L12 13l8.5-6.5" />
            </svg>
          </span>
          <p>
            <b>Missing something you need?</b> Tell us what would help your
            search most.
          </p>
        </div>
        <a
          className="roadmap-cta"
          href="mailto:forgeletterai@gmail.com?subject=Feature%20request"
        >
          Request a feature
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h13" />
            <path d="M13 7l5 5-5 5" />
          </svg>
        </a>
      </div>
    </div>
  )
}
