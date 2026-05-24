import { NextRequest, NextResponse } from "next/server"
import {
  dataErrorMessage,
  getApplicationBriefs,
  getCurrentAppUser,
  getSupabaseSchemaCapabilities,
  resetSchemaCapabilitiesCache,
} from "@/lib/app-data"
import {
  getBillingPeriod,
  getCurrentPlanPeriodStart,
  getPlanUsageDetails,
} from "@/lib/plans"
import { supabaseAdmin } from "@/lib/supabase"

const allowedTones = new Set(["Professional", "Warm", "Direct"])

function statusForBrief(role: string, jobDescription: string, experience: string) {
  return role && jobDescription && experience ? "brief_ready" : "draft"
}

export async function GET() {
  const { user, error } = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const { briefs, setupError } = await getApplicationBriefs(user.id)
  return NextResponse.json({ briefs, setupError })
}

export async function POST(req: NextRequest) {
  const { user, error } = await getCurrentAppUser()

  if (!user) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    role?: string
    company?: string
    tone?: string
    job_description?: string
    candidate_experience?: string
    selected_experience_ids?: unknown
  }

  const role = String(body.role || "").trim()
  const company = String(body.company || "").trim()
  const tone = allowedTones.has(String(body.tone)) ? String(body.tone) : "Professional"
  const job_description = String(body.job_description || "").trim()
  const candidate_experience = String(body.candidate_experience || "").trim()
  const selected_experience_ids = Array.isArray(body.selected_experience_ids)
    ? body.selected_experience_ids
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .slice(0, 40)
    : []

  if (!role && !company && !job_description && !candidate_experience) {
    return NextResponse.json(
      { error: "Add at least one detail before saving a brief." },
      { status: 400 }
    )
  }

  try {
    // Briefs are record-keeping; they do not consume the user's
    // letter allowance. The bottleneck is /api/generate, which gates
    // on generated_letters (passed + running). Here we just count
    // real letters so the response can report accurate usage.
    const billingPeriod = getBillingPeriod(user.plan)
    const periodStart = getCurrentPlanPeriodStart(billingPeriod).toISOString()
    const { count, error: countError } = await supabaseAdmin
      .from("generated_letters")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", periodStart)
      .in("generation_status", ["passed", "running"])

    if (countError) {
      return NextResponse.json(
        { error: dataErrorMessage(countError, "generated_letters") },
        { status: 500 }
      )
    }

    const usedThisPeriod = count || 0

    const capabilities = await getSupabaseSchemaCapabilities()
    const basePayload: Record<string, unknown> = {
      user_id: user.id,
      role,
      company,
      tone,
      job_description,
      candidate_experience,
      status: statusForBrief(role, job_description, candidate_experience),
    }
    if (capabilities.applicationBriefsSelectedExperienceIds) {
      basePayload.selected_experience_ids = selected_experience_ids
    }

    let { data, error: saveError } = await supabaseAdmin
      .from("application_briefs")
      .insert(basePayload)
      .select("*")
      .single()

    // Race recovery: cache said the column exists but the insert disagreed.
    if (
      saveError &&
      (saveError.code === "42703" ||
        saveError.code === "PGRST204" ||
        /column .* does not exist/i.test(saveError.message || ""))
    ) {
      console.warn(
        "[POST /api/briefs] selected_experience_ids missing at write; retrying without it:",
        saveError
      )
      resetSchemaCapabilitiesCache()
      delete basePayload.selected_experience_ids
      const retry = await supabaseAdmin
        .from("application_briefs")
        .insert(basePayload)
        .select("*")
        .single()
      data = retry.data
      saveError = retry.error
    }

    if (saveError) {
      return NextResponse.json(
        { error: dataErrorMessage(saveError, "application_briefs") },
        { status: 500 }
      )
    }

    // Saving a brief alone does not consume a letter; report current
    // letter consumption unchanged. /api/generate will refresh this
    // when the generation actually completes.
    return NextResponse.json({
      brief: data,
      usage: getPlanUsageDetails(user.plan, usedThisPeriod),
    })
  } catch (error) {
    return NextResponse.json(
      { error: dataErrorMessage(error, "application_briefs") },
      { status: 500 }
    )
  }
}
