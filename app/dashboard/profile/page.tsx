import { defaultProfile, getCurrentAppUser, getUserProfile } from "@/lib/app-data"
import { ProfileClient } from "./ProfileClient"

export default async function ProfilePage() {
  const { user } = await getCurrentAppUser()
  const { profile, setupError } = user
    ? await getUserProfile(user.id)
    : { profile: defaultProfile, setupError: "Authentication required" }

  return <ProfileClient initialProfile={profile} setupError={setupError} />
}
