const drafts = [
  {
    role: "Product Manager",
    company: "Spotify Berlin",
    status: "Brief ready",
    updated: "Today",
  },
  {
    role: "Marketing Manager",
    company: "Booking.com",
    status: "Needs background",
    updated: "Yesterday",
  },
  {
    role: "Software Engineer",
    company: "ASML",
    status: "Archived sample",
    updated: "Last week",
  },
]

export default function HistoryPage() {
  return (
    <>
      <div className="dashboard-topbar">
        <div className="dashboard-title">
          <span className="section-kicker">History</span>
          <h1>Saved letters and briefs.</h1>
          <p>Track drafts by role, company, status, and last update.</p>
        </div>
      </div>

      <section className="dashboard-card">
        <div className="table-list">
          {drafts.map((draft) => (
            <div className="table-row" key={`${draft.role}-${draft.company}`}>
              <div>
                <strong>{draft.role}</strong>
                <span>{draft.company}</span>
              </div>
              <span className="status-pill">{draft.status}</span>
              <span>{draft.updated}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
