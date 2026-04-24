import { getApplicationBriefs, getCurrentAppUser } from "@/lib/app-data"
import { HistoryClient } from "./HistoryClient"

export default async function HistoryPage() {
  const { user } = await getCurrentAppUser()
  const { briefs, setupError } = user
    ? await getApplicationBriefs(user.id)
    : { briefs: [], setupError: "Authentication required" }

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
