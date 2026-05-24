import {
  defaultProfile,
  defaultSettings,
  getApplicationBriefs,
  getCurrentPeriodLetterCount,
  getCurrentAppUser,
  getSupabaseSchemaCapabilities,
  getUserProfile,
  getUserSettings,
} from "@/lib/app-data"
import { supabaseAdmin } from "@/lib/supabase"
import { DashboardClient, type LatestLetter } from "./DashboardClient"

export const dynamic = "force-dynamic"

async function getLatestLetter(userId: string): Promise<LatestLetter | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("generated_letters")
      .select(
        "id,final_cover_letter,final_score,ats_score,ats_verdict,ats_covered_keywords,ats_missing_keywords,hallucination_risk,rewrite_cycles,agents_run,job_title,company_name,tone,tier,generation_status,failure_reason,created_at"
      )
      .eq("user_id", userId)
      .in("generation_status", ["passed", "failed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data || !data.final_cover_letter) {
      return null
    }

    return {
      id: data.id,
      finalCoverLetter: data.final_cover_letter,
      finalScore: data.final_score ?? 0,
      atsScore: data.ats_score,
      atsVerdict: data.ats_verdict,
      atsCoveredKeywords: data.ats_covered_keywords ?? [],
      atsMissingKeywords: data.ats_missing_keywords ?? [],
      hallucinationRisk: data.hallucination_risk,
      rewriteCycles: data.rewrite_cycles ?? 0,
      agentsRun: data.agents_run ?? [],
      jobTitle: data.job_title,
      companyName: data.company_name,
      tone: data.tone,
      tier: data.tier,
      generationStatus: data.generation_status,
      failureReason: data.failure_reason,
      createdAt: data.created_at,
    }
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const { user } = await getCurrentAppUser()
  const userId = user?.id || ""
  const plan = user?.plan || "free"
  const [
    { briefs, setupError: briefsError },
    { profile, setupError: profileError },
    { settings },
    { count: periodBriefCount, setupError: usageError },
    latestLetter,
    capabilities,
  ] = userId
    ? await Promise.all([
        getApplicationBriefs(userId),
        getUserProfile(userId),
        getUserSettings(userId),
        getCurrentPeriodLetterCount(userId, plan, user?.currentPeriodStart),
        getLatestLetter(userId),
        getSupabaseSchemaCapabilities(),
      ])
    : [
        { briefs: [], setupError: "Authentication required" },
        { profile: defaultProfile, setupError: "Authentication required" },
        { settings: defaultSettings },
        { count: 0, setupError: "Authentication required" },
        null,
        {
          userProfileExperienceBlocks: true,
          applicationBriefsSelectedExperienceIds: true,
          generatedLettersSelectedExperienceIds: true,
        },
      ]

  return (
    <DashboardClient
      initialBriefs={briefs}
      initialPeriodBriefCount={periodBriefCount}
      plan={plan}
      profile={profile}
      settings={settings}
      setupError={briefsError || profileError || usageError}
      initialLatestLetter={latestLetter}
      experiencePersistenceAvailable={capabilities.userProfileExperienceBlocks}
    />
  )
}
