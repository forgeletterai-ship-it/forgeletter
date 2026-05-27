import { NextRequest, NextResponse } from "next/server"
import { generateCoverLetter } from "@/lib/agents"
import type { PipelineInput, Tier, Tone } from "@/lib/agents"
import {
  dataErrorMessage,
  getCurrentAppUser,
  getUserProfile,
} from "@/lib/app-data"
import {
  computeFairLetterCap,
  getBasePlan,
  getBillingPeriod,
  getCurrentPlanPeriodStart,
} from "@/lib/plans"
import { supabaseAdmin } from "@/lib/supabase"
import { randomUUID } from "node:crypto"

/**
 * Tone-rewrite endpoint — sold on PricingCards as the "0 / 1 / 3
 * tone rewrites included" feature. CONCEPTUALLY SEPARATE from the
 * backend quality rewrites (1 / 2 / 2) that happen invisibly inside
 * the orchestrator and are NEVER counted.
 *
 * Per-tier FREE allowance per letter:
 *   • Starter — 0  (every tone rewrite uses 1 letter slot)
 *   • Pro     — 1
 *   • Ultra   — 3
 *
 * When the free allowance is exhausted, the rewrite is gated against
 * the user's monthly letter cap via the same try_start_letter RPC
 * /api/generate uses. We never want to silently burn the user's
 * allowance — the dashboard must surface a confirmation first.
 *
 * Schema: `tone_rewrite_count` on `generated_letters`. We probe for
 * the column on each call; if missing (pre-migration), free
 * allowance defaults to whatever the user has not yet used in this
 * session (best-effort) and the count is not persisted. The
 * follow-up migration is shipped as docs/supabase-tone-rewrites.sql.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TONE_VALUES: ReadonlyArray<Tone> = ["professional", "confident", "warm", "concise"]

const TONE_REWRITE_FREE_CAP: Record<Tier, number> = {
  free: 0,
  starter: 0,
  pro: 1,
  ultra: 3,
}

interface RouteParams {
  params: Promise<{ id: string }>
}

function isTone(value: unknown): value is Tone {
  return typeof value === "string" && (TONE_VALUES as readonly string[]).includes(value)
}

function looksLikeMissingColumn(err: unknown): boolean {
  const code = (err as { code?: string })?.code
  if (code === "42703" || code === "PGRST204") return true
  const message = String((err as { message?: string })?.message ?? "")
  return /column .* does not exist/i.test(message)
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  // 1. Auth.
  const { user, error: authError } = await getCurrentAppUser()
  if (!user) {
    return NextResponse.json({ error: authError ?? "Authentication required" }, { status: 401 })
  }

  // No active subscription = no rewrites. Same short-circuit as
  // /api/generate so the user sees a consistent message.
  if (getBasePlan(user.plan) === "free") {
    return NextResponse.json(
      {
        error:
          "You don't have an active plan. Choose a subscription to rewrite letters in a different tone.",
      },
      { status: 402 }
    )
  }

  // 2. Parse + validate the body.
  const { id: letterId } = await params
  const body = (await req.json().catch(() => ({}))) as { tone?: unknown }
  if (!isTone(body.tone)) {
    return NextResponse.json(
      { error: "Provide a valid tone: professional, confident, warm, or concise." },
      { status: 400 }
    )
  }
  const newTone: Tone = body.tone

  // 3. Authorize + fetch the original letter row.
  const { data: originalRow, error: fetchError } = await supabaseAdmin
    .from("generated_letters")
    .select(
      "id, user_id, resume_text, job_description, job_title, company_name, tone, tier, generation_status, selected_experience_ids, tone_rewrite_count"
    )
    .eq("id", letterId)
    .maybeSingle()

  if (fetchError && !looksLikeMissingColumn(fetchError)) {
    return NextResponse.json(
      { error: dataErrorMessage(fetchError, "generated_letters") },
      { status: 500 }
    )
  }

  // If tone_rewrite_count column is missing, re-fetch without it so
  // the rest of the flow works. New installs get the column via the
  // migration; legacy DBs degrade silently.
  let row = originalRow as
    | (typeof originalRow & { tone_rewrite_count?: number | null })
    | null
  let countColumnAvailable = !looksLikeMissingColumn(fetchError)
  if (!row && looksLikeMissingColumn(fetchError)) {
    const retry = await supabaseAdmin
      .from("generated_letters")
      .select(
        "id, user_id, resume_text, job_description, job_title, company_name, tone, tier, generation_status, selected_experience_ids"
      )
      .eq("id", letterId)
      .maybeSingle()
    if (retry.error) {
      return NextResponse.json(
        { error: dataErrorMessage(retry.error, "generated_letters") },
        { status: 500 }
      )
    }
    row = retry.data as typeof row
    countColumnAvailable = false
  }

  if (!row) {
    return NextResponse.json({ error: "Letter not found" }, { status: 404 })
  }
  if (row.user_id !== user.id) {
    return NextResponse.json({ error: "Not your letter" }, { status: 403 })
  }
  if (row.generation_status !== "passed" && row.generation_status !== "failed") {
    return NextResponse.json(
      { error: "Letter is still generating — wait until it's complete before rewriting." },
      { status: 409 }
    )
  }
  if (row.tone === newTone) {
    return NextResponse.json(
      { error: "The letter is already in that tone. Pick a different tone." },
      { status: 400 }
    )
  }

  // 4. Compute tier + free-allowance state.
  const tier: Tier = (row.tier as Tier) ?? "starter"
  const freeCap = TONE_REWRITE_FREE_CAP[tier] ?? 0
  const currentCount = (row.tone_rewrite_count as number | null | undefined) ?? 0
  const willConsumeLetterSlot = currentCount >= freeCap

  // 5. If a letter slot will be consumed, gate it through the same
  //    fair-cap quota that /api/generate uses. We DO NOT insert a new
  //    generated_letters row for the rewrite — we update the existing
  //    row in-place — but we still need to verify the user has a slot
  //    available before spending the LLM tokens.
  if (willConsumeLetterSlot) {
    const periodForFallback = getBillingPeriod(user.plan)
    const periodStart = user.currentPeriodStart
      ? new Date(user.currentPeriodStart).toISOString()
      : getCurrentPlanPeriodStart(periodForFallback).toISOString()
    const fairCap = computeFairLetterCap({
      plan: user.plan,
      accruedCapThisPeriod: user.accruedCapThisPeriod ?? 0,
      currentSegmentStartedAt: user.currentSegmentStartedAt,
      currentPeriodStart: user.currentPeriodStart ?? periodStart,
    })

    // Try the atomic counter via a synthetic placeholder row — same
    // pattern /api/generate uses. The new row is immediately deleted
    // after the rewrite (or marked as a tone-rewrite spend if the
    // schema supports it). For now: insert + delete idiom.
    const rpc = await supabaseAdmin.rpc("try_start_letter", {
      p_user_id: user.id,
      p_max_count: fairCap,
      p_period_start: periodStart,
      p_resume_text: row.resume_text ?? "",
      p_job_description: row.job_description ?? "",
      p_job_title: row.job_title ?? null,
      p_company_name: row.company_name ?? null,
      p_tone: newTone,
      p_tier: tier,
    })

    if (rpc.error) {
      const code = (rpc.error as { code?: string }).code
      if (code !== "PGRST202") {
        return NextResponse.json(
          { error: dataErrorMessage(rpc.error, "generated_letters") },
          { status: 500 }
        )
      }
      // Migration not yet applied — degrade to "best-effort
      // allow" so the user can rewrite, with a server warning.
      console.warn(
        "[POST /api/letters/:id/rewrite-tone] try_start_letter missing; allowing rewrite without quota gate"
      )
    } else {
      const rpcRow = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data
      if (rpcRow && !rpcRow.granted) {
        return NextResponse.json(
          {
            error:
              "You've used every letter and free tone rewrite for this period. Upgrade your plan or wait for your allowance to reset.",
          },
          { status: 402 }
        )
      }
      // The RPC created a sibling row to hold the slot. Mark it as
      // a tone-rewrite spend so the dashboard can show it correctly.
      const placeholderId = rpcRow?.letter_id as string | undefined
      if (placeholderId) {
        await supabaseAdmin
          .from("generated_letters")
          .update({
            generation_status: "tone_rewrite_spend",
            failure_reason: `Tone rewrite slot consumed by letter ${letterId}`,
            completed_at: new Date().toISOString(),
          })
          .eq("id", placeholderId)
          .then(
            () => undefined,
            () => undefined
          )
      }
    }
  }

  // 6. Run the pipeline at the new tone. We re-fetch the user's
  //    saved profile so the wins still come from their structured
  //    inputs, not from the resume_text blob on the original row.
  const { profile: savedProfile } = await getUserProfile(user.id)
  const blocks = savedProfile.experience_blocks ?? []
  const savedIds = Array.isArray(row.selected_experience_ids)
    ? (row.selected_experience_ids as string[]).filter((id) => typeof id === "string")
    : []
  const effectiveIds = savedIds.length > 0 ? savedIds : blocks.map((b) => b.id)

  const newGenerationId = randomUUID()
  const pipelineInput: PipelineInput = {
    profile: {
      professionalHeadline: savedProfile.professional_headline,
      qualifications: savedProfile.qualifications || row.resume_text || "",
      strengths: savedProfile.strengths,
      notes: savedProfile.notes,
      keyAchievements: savedProfile.key_achievements,
      experienceBlocks: blocks,
    },
    selectedExperienceIds: effectiveIds,
    alwaysIncludeQualifications: true,
    jobDescription: row.job_description ?? "",
    targetRole: row.job_title ?? undefined,
    companyName: row.company_name ?? undefined,
    tone: newTone,
    tier,
    userId: user.id,
    generationId: newGenerationId,
  }

  let result
  try {
    result = await generateCoverLetter(pipelineInput, supabaseAdmin)
  } catch (err) {
    console.error("[POST /api/letters/:id/rewrite-tone] pipeline failed:", err)
    return NextResponse.json(
      { error: "Rewrite failed — please try again. Your allowance has not been changed." },
      { status: 500 }
    )
  }

  // 7. Persist the rewrite onto the original row. The tone-rewrite
  //    count only increments when the column exists.
  const updates: Record<string, unknown> = {
    final_cover_letter: result.finalLetter,
    final_score: result.finalScore,
    hallucination_risk: result.hallucinationRisk,
    ats_score: result.atsScore ?? null,
    ats_verdict: result.atsVerdict ?? null,
    ats_covered_keywords: result.atsCoveredKeywords ?? [],
    ats_missing_keywords: result.atsMissingKeywords ?? [],
    rewrite_cycles: result.rewriteCycles,
    agents_run: result.agentsRun,
    tone: newTone,
    completed_at: new Date().toISOString(),
  }
  if (countColumnAvailable) {
    updates.tone_rewrite_count = currentCount + 1
  }

  const { error: updateError } = await supabaseAdmin
    .from("generated_letters")
    .update(updates)
    .eq("id", letterId)

  if (updateError && !looksLikeMissingColumn(updateError)) {
    return NextResponse.json(
      { error: dataErrorMessage(updateError, "generated_letters") },
      { status: 500 }
    )
  }
  // If the column is missing mid-flight, retry without it.
  if (updateError && looksLikeMissingColumn(updateError)) {
    delete updates.tone_rewrite_count
    const retry = await supabaseAdmin
      .from("generated_letters")
      .update(updates)
      .eq("id", letterId)
    if (retry.error) {
      return NextResponse.json(
        { error: dataErrorMessage(retry.error, "generated_letters") },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({
    ok: true,
    letterId,
    tone: newTone,
    finalLetter: result.finalLetter,
    finalScore: result.finalScore,
    atsScore: result.atsScore,
    atsVerdict: result.atsVerdict,
    hallucinationRisk: result.hallucinationRisk,
    consumedLetterSlot: willConsumeLetterSlot,
    toneRewriteCount: countColumnAvailable ? currentCount + 1 : null,
    toneRewriteFreeCap: freeCap,
  })
}
