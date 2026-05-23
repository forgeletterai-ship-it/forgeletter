import {
  defaultProfile,
  getCurrentAppUser,
  getSupabaseSchemaCapabilities,
  getUserProfile,
} from "@/lib/app-data"
import { ProfileClient } from "./ProfileClient"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const { user } = await getCurrentAppUser()

  const [{ profile, setupError }, capabilities] = user
    ? await Promise.all([
        getUserProfile(user.id),
        getSupabaseSchemaCapabilities(),
      ])
    : [
        { profile: defaultProfile, setupError: "Authentication required" },
        {
          userProfileExperienceBlocks: true,
          applicationBriefsSelectedExperienceIds: true,
          generatedLettersSelectedExperienceIds: true,
        },
      ]

  return (
    <ProfileClient
      initialProfile={profile}
      setupError={setupError}
      experiencePersistenceAvailable={capabilities.userProfileExperienceBlocks}
    />
  )
}
