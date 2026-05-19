import { NextRequest, NextResponse } from "next/server"
import { generateCoverLetter } from "@/lib/agents"
import type { Tier, Tone } from "@/lib/agents"
import { dataErrorMessage, getCurrentAppUser } from "@/lib/app-data"
import {
  getBasePlan,
  getBillingPeriod,
  getCurrentPlanPeriodStart,
  getPlanUsageDetails,
} from "@/lib/plans"
import { supabaseAdmin } from "@/lib/supabase"

// The 12-agent pipeline can take 30-120 seconds. Inline v1 sets the
// route's max duration to the Vercel ceiling. When we add the queue,
// this route just enqueues and returns immediately.
export const maxDuration = 300
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MIN_RESUME_CHARS = 200
const MIN_JD_CHARS = 200
const ALLOWED_TONES: Tone[] = ["professional", "confident", "warm", "concise"]

function normalizeTone(input: unknown): Tone {
  const lower = String(input || "").trim().toLowerCase()
  if (lower === "direct") return "confident" // map legacy app value
  return (ALLOWED_TONES as readonly string[]).includes(lower)
    ? (lower as Tone)
    : "professional"
}

function planToTier(plan: string): Tier {
  const base = getBasePlan(plan)
  if (base === "free" || base === "starter" || base === "pro" || base === "ultra") {
    return base
  }
  return "starter"
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const { user, error } = await getCurrentAppUser()
  if (!user) {
    return NextResponse.json({ error: error ?? "Authentication required" }, { status: 401 })
  }

  // 2. Parse + validate body
  const body = (await req.json().catch(() => ({}))) as {
    resumeText?: unknown
    jobDescription?: unknown
    jobTitle?: unknown
    companyName?: unknown
    tone?: unknown
  }

  const resumeText = String(body.resumeText || "").trim()
  const jobDescription = String(body.jobDescription || "").trim()
  const jobTitle = body.jobTitle ? String(body.jobTitle).trim() : undefined
  const companyName = body.companyName ? String(body.companyName).trim() : undefined
  const tone = normalizeTone(body.tone)

  if (resumeText.length < MIN_RESUME_CHARS) {
    return NextResponse.json(
      { error: `Resume must be at least ${MIN_RESUME_CHARS} characters.` },
      { status: 400 }
    )
  }
  if (jobDescription.length < MIN_JD_CHARS) {
    return NextResponse.json(
      { error: `Job description must be at least ${MIN_JD_CHARS} characters.` },
      { status: 400 }
    )
  }

  // 3. Quota check — count generations in the current billing period.
  // We count from the new generated_letters table; the legacy
  // application_briefs table is workspace-only and does not consume quota.
  try {
    const period = getBillingPeriod(user.plan)
    const periodStart = getCurrentPlanPeriodStart(period).toISOString()
    const { count, error: countError } = await supabaseAdmin
      .from("generated_letters")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", periodStart)
      .in("generation_status", ["queued", "running", "passed"])

    if (countError) {
      return NextResponse.json(
        { error: dataErrorMessage(countError, "generated_letters") },
        { status: 500 }
      )
    }

    const usage = getPlanUsageDetails(user.plan, count || 0)
    if ((count || 0) >= usage.limit) {
      return NextResponse.json(
        {
          error: `You have used all ${usage.limit} letters for this ${usage.periodNoun}. Upgrade your plan or wait until your allowance resets.`,
          usage,
          upgrade: true,
        },
        { status: 402 }
      )
    }
  } catch (err) {
    return NextResponse.json(
      { error: dataErrorMessage(err, "generated_letters") },
      { status: 500 }
    )
  }

  // 4. Create the generation row up front so it's tracked even if the
  // pipeline crashes mid-flight.
  const tier = planToTier(user.plan)
  const insertResult = await supabaseAdmin
    .from("generated_letters")
    .insert({
      user_id: user.id,
      resume_text: resumeText,
      job_description: jobDescription,
      job_title: jobTitle ?? null,
      company_name: companyName ?? null,
      tone,
      tier,
      generation_status: "running",
    })
    .select("id")
    .single()

  if (insertResult.error || !insertResult.data) {
    return NextResponse.json(
      { error: dataErrorMessage(insertResult.error, "generated_letters") },
      { status: 500 }
    )
  }

  const generationId = insertResult.data.id as string

  // 5. Run the pipeline inline. With the queue (Phase 2) this becomes
  // `enqueue(...)` and we return generationId immediately.
  try {
    const result = await generateCoverLetter(
      {
        resumeText,
        jobDescription,
        jobTitle,
        companyName,
        tone,
        tier,
        userId: user.id,
        generationId,
      },
      supabaseAdmin,
      undefined // no progress callback in inline v1; SSE wires this later
    )

    // 6. Persist result on the generation row.
    const { error: updateError } = await supabaseAdmin
      .from("generated_letters")
      .update({
        final_cover_letter: result.finalLetter,
        final_score: result.finalScore,
        hallucination_risk: result.hallucinationRisk,
        ats_score: result.atsScore ?? null,
        ats_verdict: result.atsVerdict ?? null,
        ats_covered_keywords: result.atsCoveredKeywords ?? [],
        ats_missing_keywords: result.atsMissingKeywords ?? [],
        rewrite_cycles: result.rewriteCycles,
        agents_run: result.agentsRun,
        generation_status: result.status,
        failure_reason: result.failureReason ?? null,
        total_duration_ms: result.totalDurationMs,
        completed_at: new Date().toISOString(),
      })
      .eq("id", generationId)

    if (updateError) {
      console.warn("[/api/generate] failed to persist result row:", updateError)
    }

    return NextResponse.json({
      generationId,
      status: result.status,
      finalLetter: result.finalLetter,
      finalScore: result.finalScore,
      atsScore: result.atsScore,
      atsVerdict: result.atsVerdict,
      atsCoveredKeywords: result.atsCoveredKeywords,
      atsMissingKeywords: result.atsMissingKeywords,
      hallucinationRisk: result.hallucinationRisk,
      rewriteCycles: result.rewriteCycles,
      agentsRun: result.agentsRun,
      durationMs: result.totalDurationMs,
      failureReason: result.failureReason,
    })
  } catch (err) {
    // Best-effort: mark as failed before surfacing the error
    await supabaseAdmin
      .from("generated_letters")
      .update({
        generation_status: "failed",
        failure_reason: err instanceof Error ? err.message : "Pipeline crashed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", generationId)
      .then(() => undefined, () => undefined)

    const message =
      err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")
        ? "AI engine is not configured. Please contact support."
        : "Your letter could not be completed. Please try again — your quota has not been used."
    return NextResponse.json({ error: message, generationId }, { status: 500 })
  }
}
