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
import { computeFairLetterCap } from "@/lib/plans"
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ duplicateFrom?: string }>
}) {
  const { user } = await getCurrentAppUser()
  const userId = user?.id || ""
  const plan = user?.plan || "free"
  const sp = (await searchParams) || {}
  const duplicateFromId = sp.duplicateFrom?.trim() || ""
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

  // Dashboard meter uses fair-cap math: mid-cycle upgraders see
  // their actual prorated allowance, plus a "Prorated" indicator
  // in the meter when fairCap < planLimit. Clean-cycle users see
  // the nominal plan cap (35 / 240 / 20 / etc.) because the
  // fast-path inside computeFairLetterCap returns planLimit when
  // accrued === 0 and segment_start aligns with period_start.
  const fairCap = user
    ? computeFairLetterCap({
        plan: user.plan,
        accruedCapThisPeriod: user.accruedCapThisPeriod ?? 0,
        currentSegmentStartedAt: user.currentSegmentStartedAt,
        currentPeriodStart: user.currentPeriodStart,
      })
    : undefined

  // If we arrived via /dashboard?duplicateFrom=LETTER_ID, fetch the
  // role/company/tone from that letter so the workspace can pre-fill.
  // We deliberately do NOT carry over the job_description — the whole
  // point of duplicating is to write to a different job posting.
  // Outcome reminder count: letters marked 'submitted' >7 days ago
  // that still have no outcome. Surface on the dashboard so users
  // are prompted to feed the example-retrieval base.
  let staleSubmittedCount = 0
  if (userId) {
    try {
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString()
      const { count } = await supabaseAdmin
        .from("generated_letters")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("application_status", "submitted")
        .lt("submitted_at", sevenDaysAgo)
      staleSubmittedCount = count ?? 0
    } catch {
      // ignore; banner just won't appear
    }
  }

  let duplicateSource: {
    role?: string
    company?: string
    tone?: string
  } | null = null
  if (duplicateFromId && userId) {
    try {
      const { data: dup } = await supabaseAdmin
        .from("generated_letters")
        .select("job_title, company_name, tone")
        .eq("id", duplicateFromId)
        .eq("user_id", userId)
        .maybeSingle()
      if (dup) {
        duplicateSource = {
          role: (dup.job_title as string | null) ?? "",
          company: (dup.company_name as string | null) ?? "",
          tone: (dup.tone as string | null) ?? "",
        }
      }
    } catch {
      // ignore; falls back to empty workspace
    }
  }

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
      pastDueSince={user?.pastDueSince ?? null}
      disputedAt={user?.disputedAt ?? null}
      fairCap={fairCap}
      scheduledPlanChange={user?.scheduledPlanChange ?? null}
      duplicateSource={duplicateSource}
      staleSubmittedCount={staleSubmittedCount}
    />
  )
}
