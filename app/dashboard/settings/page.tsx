export default function SettingsPage() {
  return (
    <>
      <div className="dashboard-topbar">
        <div className="dashboard-title">
          <span className="section-kicker">Settings</span>
          <h1>Account preferences.</h1>
          <p>Keep product settings simple until the database schema is final.</p>
        </div>
      </div>

      <div className="grid-3">
        <section className="dashboard-card">
          <h3>Default tone</h3>
          <p>Choose which tone appears first in the draft workspace.</p>
          <div className="tone-list">
            <span className="tone-chip active">Professional</span>
            <span className="tone-chip">Warm</span>
            <span className="tone-chip">Direct</span>
          </div>
        </section>
        <section className="dashboard-card">
          <h3>Email updates</h3>
          <p>Product updates and account notifications can be toggled here.</p>
          <span className="status-pill">Not connected</span>
        </section>
        <section className="dashboard-card">
          <h3>Data controls</h3>
          <p>Export and deletion actions should be connected after RLS review.</p>
          <span className="status-pill">Safety first</span>
        </section>
      </div>
    </>
  )
}
