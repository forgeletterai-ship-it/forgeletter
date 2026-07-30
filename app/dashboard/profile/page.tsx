import {
  getSupabaseSchemaCapabilities,
  getUserProfile,
  requireAppUser,
} from "@/lib/app-data"
import { ProfileClient } from "./ProfileClient"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const user = await requireAppUser()

  const [{ profile, setupError }, capabilities] = await Promise.all([
    getUserProfile(user.id),
    getSupabaseSchemaCapabilities(),
  ])

  return (
    <ProfileClient
      initialProfile={profile}
      setupError={setupError}
      experiencePersistenceAvailable={capabilities.userProfileExperienceBlocks}
    />
  )
}
