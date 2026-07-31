/**
 * Segment-level pending UI for the dashboard. Every navigation
 * previously blocked with zero feedback while the target server
 * component ran its queries (the letters page alone does 8 before
 * painting) — this renders instantly while the RSC payload streams.
 */
export default function DashboardLoading() {
  return (
    <div className="dashboard-loading" role="status" aria-label="Loading">
      <div className="dashboard-loading__bar" />
      <div className="dashboard-loading__grid">
        <div className="dashboard-loading__block" />
        <div className="dashboard-loading__block dashboard-loading__block--tall" />
        <div className="dashboard-loading__block" />
      </div>
    </div>
  )
}
