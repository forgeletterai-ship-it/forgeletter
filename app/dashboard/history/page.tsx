import { getApplicationBriefs, requireAppUser } from "@/lib/app-data"
import { HistoryClient } from "./HistoryClient"

export default async function HistoryPage() {
  const user = await requireAppUser()
  const { briefs, setupError } = await getApplicationBriefs(user.id)

  return (
    <>
      <div className="dashboard-topbar">
        <div className="dashboard-title">
          <span className="section-kicker">History</span>
          <h1>Saved letters and briefs.</h1>
          <p>Track drafts by role, company, status, and last update.</p>
        </div>
      </div>

      <HistoryClient initialBriefs={briefs} setupError={setupError} />
    </>
  )
}
