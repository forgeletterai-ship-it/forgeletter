import { DashboardWorkspace } from "@/components/DashboardWorkspace"

export default function DashboardPage() {
  return (
    <>
      <div className="dashboard-topbar">
        <div className="dashboard-title">
          <span className="section-kicker">Workspace</span>
          <h1>Prepare a premium cover letter brief.</h1>
          <p>
            A smoother, more professional workspace for individuals now and
            career-agency partnerships later. AI generation remains paused.
          </p>
        </div>
        <span className="status-pill active">Generator paused</span>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Free plan</h3>
          <p>3 draft slots ready for testing.</p>
          <div className="usage-meter">
            <span />
          </div>
        </div>
        <div className="dashboard-card">
          <h3>Saved drafts</h3>
          <p>2 examples are staged in history.</p>
        </div>
        <div className="dashboard-card">
          <h3>Partnership-ready</h3>
          <p>Profile, history, billing, and advisor-style workflow pages are in place.</p>
        </div>
      </div>

      <DashboardWorkspace />
    </>
  )
}
