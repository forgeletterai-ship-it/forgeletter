import { defaultProfile, getCurrentAppUser, getUserProfile } from "@/lib/app-data"
import { ProfileClient } from "./ProfileClient"

export default async function ProfilePage() {
  const { user } = await getCurrentAppUser()
  const { profile, setupError } = user
    ? await getUserProfile(user.id)
    : { profile: defaultProfile, setupError: "Authentication required" }

  return (
    <>
      <div className="dashboard-topbar">
        <div className="dashboard-title">
          <span className="section-kicker">Profile</span>
          <h1>Your reusable application context.</h1>
          <p>
            Store the experience details that every future generator call should
            understand.
          </p>
        </div>
      </div>

      <ProfileClient initialProfile={profile} setupError={setupError} />
    </>
  )
}
