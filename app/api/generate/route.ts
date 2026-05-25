import { NextRequest } from "next/server"
import { generateCoverLetter } from "@/lib/agents"
import type { Tier, Tone } from "@/lib/agents"
import {
  dataErrorMessage,
  getCurrentAppUser,
  getCurrentPeriodLetterCount,
  getSupabaseSchemaCapabilities,
  resetSchemaCapabilitiesCache,
} from "@/lib/app-data"
import {
  computeFairLetterCap,
  getBasePlan,
  getBillingPeriod,
  getCurrentPlanPeriodStart,
  getPlanUsageDetails,
} from "@/lib/plans"
import { supabaseAdmin } from "@/lib/supabase"

// Inline pipeline streams its progress as SSE. Function runs until the
// stream is closed (i.e. until the pipeline finishes), so we ask Vercel
// for the maximum allowed duration on our plan.
export const maxDuration = 300
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MIN_RESUME_CHARS = 200
const MIN_JD_CHARS = 200
const ALLOWED_TONES: Tone[] = ["professional", "confident", "warm", "concise"]

function normalizeTone(input: unknown): Tone {
  const lower = String(input || "").trim().toLowerCase()
  if (lower === "direct") return "confident"
  if (lower === "professional" || lower === "confident" || lower === "warm" || lower === "concise") {
    return lower
  }
  return "professional"
}

function planToTier(plan: string): Tier {
  const base = getBasePlan(plan)
  if (base === "free" || base === "starter" || base === "pro" || base === "ultra") {
    return base
  }
  return "starter"
}

function sseError(message: string, status: number): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "error", message, status })}\n\n`)
      )
      controller.close()
    },
  })
  return new Response(stream, {
    status,
    headers: sseHeaders(),
  })
}

function sseHeaders(): Record<string, string> {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  }
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const { user, error } = await getCurrentAppUser()
  if (!user) {
    return sseError(error ?? "Authentication required", 401)
  }

  // 2. Parse + validate body
  const body = (await req.json().catch(() => ({}))) as {
    resumeText?: unknown
    jobDescription?: unknown
    jobTitle?: unknown
    companyName?: unknown
    tone?: unknown
    selectedExperienceIds?: unknown
  }

  const resumeText = String(body.resumeText || "").trim()
  const jobDescription = String(body.jobDescription || "").trim()
  const jobTitle = body.jobTitle ? String(body.jobTitle).trim() : undefined
  const companyName = body.companyName ? String(body.companyName).trim() : undefined
  const tone = normalizeTone(body.tone)
  const selectedExperienceIds: string[] = Array.isArray(body.selectedExperienceIds)
    ? (body.selectedExperienceIds as unknown[])
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .slice(0, 40)
    : []

  if (resumeText.length < MIN_RESUME_CHARS) {
    return sseError(`Resume must be at least ${MIN_RESUME_CHARS} characters.`, 400)
  }
  if (jobDescription.length < MIN_JD_CHARS) {
    return sseError(`Job description must be at least ${MIN_JD_CHARS} characters.`, 400)
  }

  // 3 + 4. Atomic quota gate + row insert.
  //
  // The Postgres function try_start_letter does the count check and
  // the row insert in a single transaction, serialised per-user via
  // a Postgres advisory lock. Two concurrent requests from the same
  // user can no longer both pass the gate.
  //
  // Period boundary: prefers the user's Stripe subscription
  // current_period_start when available, falls back to the calendar
  // boundary otherwise. Running rows older than 7 minutes are
  // treated as orphaned inside the function and do not count.
  // No active subscription = no generation. Explicit short-circuit so
  // the customer sees a clear "subscribe to continue" message instead
  // of a confusing "0 of 0 letters" quota error from try_start_letter.
  if (getBasePlan(user.plan) === "free") {
    return sseError(
      "You don't have an active plan. Choose a subscription to start generating letters.",
      402
    )
  }

  const tier = planToTier(user.plan)
  const periodForFallback = getBillingPeriod(user.plan)
  const periodStart = user.currentPeriodStart
    ? new Date(user.currentPeriodStart).toISOString()
    : getCurrentPlanPeriodStart(periodForFallback).toISOString()
  // Fair cap: letters earned at past plans + letters earned so far
  // on the current plan. Replaces the static plan limit so a mid-cycle
  // upgrade gets the prorated cap they paid for and a mid-cycle
  // downgrade keeps the cap they already earned.
  const fairCap = computeFairLetterCap({
    plan: user.plan,
    accruedCapThisPeriod: user.accruedCapThisPeriod ?? 0,
    currentSegmentStartedAt: user.currentSegmentStartedAt,
    currentPeriodStart: user.currentPeriodStart ?? periodStart,
  })
  const planLimit = fairCap

  let generationId: string | null = null
  let postCount: number | null = null
  let triedRpc = false

  try {
    triedRpc = true
    const rpc = await supabaseAdmin.rpc("try_start_letter", {
      p_user_id: user.id,
      p_max_count: planLimit,
      p_period_start: periodStart,
      p_resume_text: resumeText,
      p_job_description: jobDescription,
      p_job_title: jobTitle ?? null,
      p_company_name: companyName ?? null,
      p_tone: tone,
      p_tier: tier,
    })

    if (rpc.error) {
      const code = (rpc.error as { code?: string }).code
      // PGRST202 = function not found (migration not yet applied).
      // Fall through to the legacy two-step path so the route keeps
      // working until the migration runs.
      if (code !== "PGRST202") {
        return sseError(
          dataErrorMessage(rpc.error, "generated_letters"),
          500
        )
      }
      triedRpc = false
    } else {
      const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data
      if (!row) {
        return sseError(
          "Quota gate returned no data",
          500
        )
      }
      if (!row.granted) {
        const usage = getPlanUsageDetails(user.plan, row.used_count ?? planLimit)
        return sseError(
          `You have used all ${usage.limit} letters for this ${usage.periodNoun}. Upgrade your plan or wait until your allowance resets.`,
          402
        )
      }
      generationId = row.letter_id as string
      postCount = row.used_count as number
    }
  } catch (err) {
    return sseError(dataErrorMessage(err, "generated_letters"), 500)
  }

  // Legacy fallback path: only used when the SQL migration that adds
  // try_start_letter has not been applied yet. Uses the same
  // consumption rule as the helper (completed letters + in-flight
  // running rows newer than 7 minutes) for consistency.
  if (!triedRpc || !generationId) {
    const { count, setupError: countError } = await getCurrentPeriodLetterCount(
      user.id,
      user.plan,
      user.currentPeriodStart
    )

    if (countError) {
      return sseError(dataErrorMessage(countError, "generated_letters"), 500)
    }
    if (count >= planLimit) {
      const usage = getPlanUsageDetails(user.plan, count)
      return sseError(
        `You have used all ${usage.limit} letters for this ${usage.periodNoun}. Upgrade your plan or wait until your allowance resets.`,
        402
      )
    }

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
      return sseError(
        dataErrorMessage(insertResult.error, "generated_letters"),
        500
      )
    }
    generationId = insertResult.data.id as string
    postCount = count + 1
  }

  // Optional: persist selected_experience_ids on the row we just
  // created, if the schema supports that column. Done as a separate
  // UPDATE so the atomic gate stays schema-independent.
  const capabilities = await getSupabaseSchemaCapabilities()
  if (capabilities.generatedLettersSelectedExperienceIds) {
    const updateResult = await supabaseAdmin
      .from("generated_letters")
      .update({ selected_experience_ids: selectedExperienceIds })
      .eq("id", generationId)
    if (updateResult.error) {
      const code = (updateResult.error as { code?: string }).code
      if (
        code === "42703" ||
        code === "PGRST204" ||
        /column .* does not exist/i.test(updateResult.error.message || "")
      ) {
        console.warn(
          "[POST /api/generate] selected_experience_ids column missing at write; resetting capability cache.",
          updateResult.error
        )
        resetSchemaCapabilitiesCache()
      }
    }
  }

  // 5. Stream the pipeline progress as SSE.
  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        if (closed) return
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          )
        } catch {
          // controller closed mid-write — pipeline keeps running and persists results
        }
      }

      send({ type: "init", generationId, tier, tone })

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
          async (event) => {
            send({ type: "progress", ...event })
          }
        )

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
          console.warn("[/api/generate] persist failed:", updateError)
        }

        // Recount after the row's status is finalised so the client
        // sees the real post-generation usage (failed generations
        // refund the slot. Pure pipeline crashes leave the row with
        // no final_cover_letter, so they are excluded automatically.
        let usagePayload: ReturnType<typeof getPlanUsageDetails> | null = null
        try {
          const { count: postCount } = await getCurrentPeriodLetterCount(
            user.id,
            user.plan,
            user.currentPeriodStart
          )
          usagePayload = getPlanUsageDetails(user.plan, postCount)
        } catch {
          // non-fatal: client can fall back to /api/account/usage
        }

        send({
          type: "complete",
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
          usage: usagePayload,
        })
      } catch (err) {
        await supabaseAdmin
          .from("generated_letters")
          .update({
            generation_status: "failed",
            failure_reason: err instanceof Error ? err.message : "Pipeline crashed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", generationId)
          .then(
            () => undefined,
            () => undefined
          )

        const message =
          err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")
            ? "AI engine is not configured. Please contact support."
            : "Your letter could not be completed. Please try again — your quota has not been used."

        send({ type: "error", message, generationId })
      } finally {
        if (!closed) {
          closed = true
          try {
            controller.close()
          } catch {
            // already closed
          }
        }
      }
    },

    cancel() {
      // Client disconnected. Mark closed so we stop writing; the pipeline
      // continues until the orchestrator finishes, and the row is updated
      // when it does — the user can still find the result on their dashboard.
      closed = true
    },
  })

  return new Response(stream, { headers: sseHeaders() })
}
